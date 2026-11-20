import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  COOKIE_DISPOSITIVO,
  HORA_CORTE_TURNO_NOCTURNO,
  MAX_INTENTOS_PIN,
  MINUTOS_BLOQUEO,
  PIN_VALIDO,
  PRECISION_MAXIMA_M,
  configRestaurante,
  distanciaMetros,
  fechaAyer,
  fechaHoraMexico,
  ipDe,
  tokenQrValido,
  verificarPin,
} from '@/lib/seguridad';

type Cuerpo = {
  k?: unknown;
  empleadoId?: unknown;
  pin?: unknown;
  lat?: unknown;
  lng?: unknown;
  precision?: unknown;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export async function POST(req: NextRequest) {
  let dispositivo = req.cookies.get(COOKIE_DISPOSITIVO)?.value;
  const dispositivoNuevo = !dispositivo || !/^[0-9a-f]{64}$/.test(dispositivo);
  if (dispositivoNuevo) dispositivo = randomBytes(32).toString('hex');

  // Todas las respuestas llevan la cookie del dispositivo
  const responder = (cuerpo: object, status = 200) => {
    const res = NextResponse.json(cuerpo, { status });
    if (dispositivoNuevo) {
      res.cookies.set(COOKIE_DISPOSITIVO, dispositivo!, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 400,
      });
    }
    return res;
  };
  const error = (mensaje: string, status: number) => responder({ error: mensaje }, status);

  let cuerpo: Cuerpo;
  try {
    cuerpo = await req.json();
  } catch {
    return error('Solicitud inválida.', 400);
  }
  const { k, empleadoId, pin, lat, lng, precision } = cuerpo;

  // 1. Token del QR
  if (!tokenQrValido(k)) {
    return error('Escanea el QR del restaurante para registrar tu asistencia.', 403);
  }

  // 2. Datos completos
  if (typeof empleadoId !== 'string' || !UUID.test(empleadoId)) return error('Selecciona tu nombre.', 400);
  if (typeof pin !== 'string' || !PIN_VALIDO.test(pin)) return error('El PIN debe tener de 4 a 6 dígitos.', 400);
  if (!esNumero(lat) || !esNumero(lng) || !esNumero(precision)) {
    return error('Activa la ubicación de tu teléfono para registrar tu asistencia.', 400);
  }

  // 3. Ubicación (antes del PIN, para que nadie pueda probar PINs desde fuera)
  const restaurante = configRestaurante();
  if (precision > PRECISION_MAXIMA_M) {
    return error(`La señal de ubicación es muy imprecisa (±${Math.round(precision)} m). Sal a un lugar abierto o activa la ubicación precisa e intenta de nuevo.`, 422);
  }
  const distancia = Math.round(distanciaMetros(lat, lng, restaurante.lat, restaurante.lng));
  if (distancia > restaurante.radio) {
    return error(`Estás a ${distancia} m del restaurante. Debes estar en Tempenchile para registrar tu asistencia.`, 403);
  }

  // 4. Empleado y PIN
  const { data: empleado, error: errEmpleado } = await supabaseAdmin()
    .from('empleados')
    .select('id, nombre, pin_hash, activo, device_token, intentos_fallidos, bloqueado_hasta')
    .eq('id', empleadoId)
    .maybeSingle();

  if (errEmpleado) {
    console.error(errEmpleado);
    return error('No se pudo registrar. Intenta de nuevo.', 500);
  }
  if (!empleado || !empleado.activo) return error('Empleado no encontrado.', 404);

  if (empleado.bloqueado_hasta && new Date(empleado.bloqueado_hasta) > new Date()) {
    const minutos = Math.ceil((new Date(empleado.bloqueado_hasta).getTime() - Date.now()) / 60000);
    return error(`Demasiados intentos con PIN incorrecto. Intenta de nuevo en ${minutos} min.`, 429);
  }

  if (!(await verificarPin(pin, empleado.pin_hash))) {
    const intentos = empleado.intentos_fallidos + 1;
    const bloquear = intentos >= MAX_INTENTOS_PIN;
    await supabaseAdmin()
      .from('empleados')
      .update(
        bloquear
          ? { intentos_fallidos: 0, bloqueado_hasta: new Date(Date.now() + MINUTOS_BLOQUEO * 60000).toISOString() }
          : { intentos_fallidos: intentos },
      )
      .eq('id', empleado.id);
    return bloquear
      ? error(`PIN incorrecto. Tu acceso quedó bloqueado ${MINUTOS_BLOQUEO} minutos.`, 429)
      : error(`PIN incorrecto. Te quedan ${MAX_INTENTOS_PIN - intentos} intentos.`, 401);
  }

  // 5. Dispositivo vinculado
  if (empleado.device_token && empleado.device_token !== dispositivo) {
    return error('Tu cuenta está vinculada a otro teléfono. Pide al administrador que libere tu dispositivo.', 403);
  }
  const cambios: Record<string, unknown> = {};
  if (empleado.intentos_fallidos > 0 || empleado.bloqueado_hasta) {
    cambios.intentos_fallidos = 0;
    cambios.bloqueado_hasta = null;
  }
  if (!empleado.device_token) cambios.device_token = dispositivo;
  if (Object.keys(cambios).length > 0) {
    const { error: errVincular } = await supabaseAdmin().from('empleados').update(cambios).eq('id', empleado.id);
    if (errVincular) {
      if (errVincular.code === '23505') {
        return error('Este teléfono ya está vinculado a otro empleado. Cada persona debe registrarse desde su propio teléfono.', 403);
      }
      console.error(errVincular);
      return error('No se pudo registrar. Intenta de nuevo.', 500);
    }
  }

  // 6. Entrada o salida, con fecha y hora del servidor
  const { fecha, hora, horaNumero } = fechaHoraMexico();
  const bitacora = { ip: ipDe(req), user_agent: req.headers.get('user-agent')?.slice(0, 300) ?? null };

  const fechasABuscar = horaNumero < HORA_CORTE_TURNO_NOCTURNO ? [fecha, fechaAyer(fecha)] : [fecha];
  const { data: registros, error: errBuscar } = await supabaseAdmin()
    .from('asistencia')
    .select('id, fecha, hora_entrada, hora_salida')
    .eq('empleado_id', empleado.id)
    .in('fecha', fechasABuscar);

  if (errBuscar) {
    console.error(errBuscar);
    return error('No se pudo registrar. Intenta de nuevo.', 500);
  }

  const deHoy = registros?.find((r) => r.fecha === fecha);
  const abiertoDeAyer = registros?.find((r) => r.fecha !== fecha && !r.hora_salida);
  const abierto = deHoy && !deHoy.hora_salida ? deHoy : !deHoy ? abiertoDeAyer : undefined;

  if (abierto) {
    const { error: errSalida } = await supabaseAdmin()
      .from('asistencia')
      .update({ hora_salida: hora, lat_salida: lat, lng_salida: lng, distancia_salida_m: distancia })
      .eq('id', abierto.id)
      .is('hora_salida', null);
    if (errSalida) {
      console.error(errSalida);
      return error('No se pudo registrar la salida. Intenta de nuevo.', 500);
    }
    return responder({ tipo: 'salida', nombre: empleado.nombre, hora, horaEntrada: abierto.hora_entrada });
  }

  if (deHoy) {
    return error(`Ya registraste tu entrada (${deHoy.hora_entrada}) y tu salida (${deHoy.hora_salida}) de hoy.`, 409);
  }

  const { error: errEntrada } = await supabaseAdmin().from('asistencia').insert({
    empleado_id: empleado.id,
    nombre: empleado.nombre,
    fecha,
    hora_entrada: hora,
    hora_salida: null,
    device_id: dispositivo!.slice(0, 12),
    lat,
    lng,
    distancia_m: distancia,
    ...bitacora,
  });
  if (errEntrada) {
    if (errEntrada.code === '23505') return error('Tu entrada de hoy ya estaba registrada.', 409);
    console.error(errEntrada);
    return error('No se pudo registrar la entrada. Intenta de nuevo.', 500);
  }
  return responder({ tipo: 'entrada', nombre: empleado.nombre, hora });
}
