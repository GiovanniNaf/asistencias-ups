'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Logo, Separador, Tarjeta } from '@/components/Marca';

type Empleado = { id: string; nombre: string };
type Ubicacion =
  | { estado: 'buscando' }
  | { estado: 'lista'; lat: number; lng: number; precision: number }
  | { estado: 'denegada' | 'error' | 'no-soportada' };
type Resultado = { tipo: 'entrada' | 'salida'; nombre: string; hora: string; horaEntrada?: string };

const ZONA = 'America/Mexico_City';
const CLAVE_EMPLEADO = 'tp_empleado';

export default function PaginaRegistro() {
  return (
    <main className="fondo-bordado min-h-dvh px-4 py-6 sm:py-10">
      <Suspense fallback={null}>
        <Registro />
      </Suspense>
    </main>
  );
}

function Registro() {
  const k = useSearchParams().get('k') ?? '';
  const [ahora, setAhora] = useState<Date | null>(null);
  const [empleados, setEmpleados] = useState<Empleado[] | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [ubicacion, setUbicacion] = useState<Ubicacion>({ estado: 'buscando' });
  const [busqueda, setBusqueda] = useState('');
  const [empleado, setEmpleado] = useState<Empleado | null>(null);
  const [pin, setPin] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState<Resultado | null>(null);

  // Reloj en vivo
  useEffect(() => {
    setAhora(new Date());
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Lista de empleados (si QR_TOKEN está configurado, el servidor exige el token del QR)
  useEffect(() => {
    fetch(`/api/empleados?k=${encodeURIComponent(k)}`)
      .then(async (r) => {
        const datos = await r.json();
        if (!r.ok) throw new Error(datos.error);
        setEmpleados(datos.empleados);
        const guardado = localStorage.getItem(CLAVE_EMPLEADO);
        const previo = datos.empleados.find((e: Empleado) => e.id === guardado);
        if (previo) setEmpleado(previo);
      })
      .catch((e) => setErrorCarga(e.message || 'No se pudo cargar la lista de empleados.'));
  }, [k]);

  // Ubicación GPS
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setUbicacion({ estado: 'no-soportada' });
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) =>
        setUbicacion({
          estado: 'lista',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precision: pos.coords.accuracy,
        }),
      (err) => setUbicacion({ estado: err.code === err.PERMISSION_DENIED ? 'denegada' : 'error' }),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  const filtrados = useMemo(() => {
    const q = normalizar(busqueda);
    return (empleados ?? []).filter((e) => normalizar(e.nombre).includes(q));
  }, [empleados, busqueda]);

  const registrar = async () => {
    if (!empleado || ubicacion.estado !== 'lista') return;
    setEnviando(true);
    setError('');
    try {
      const r = await fetch('/api/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          k,
          empleadoId: empleado.id,
          pin,
          lat: ubicacion.lat,
          lng: ubicacion.lng,
          precision: ubicacion.precision,
        }),
      });
      const datos = await r.json();
      if (!r.ok) throw new Error(datos.error);
      localStorage.setItem(CLAVE_EMPLEADO, empleado.id);
      setResultado(datos);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudo registrar. Intenta de nuevo.');
      setPin('');
    } finally {
      setEnviando(false);
    }
  };

  if (errorCarga) return <Aviso titulo="No se puede registrar">{errorCarga}</Aviso>;
  if (resultado) return <Confirmacion resultado={resultado} />;

  const listo = !!empleado && pin.length >= 4 && ubicacion.estado === 'lista' && !enviando;

  return (
    <Tarjeta className="mx-auto w-full max-w-md overflow-hidden">
      {/* Encabezado */}
      <div className="flex flex-col items-center gap-3 bg-mostaza px-6 pb-5 pt-6 text-verde">
        <Logo tamano={96} />
        <h1 className="font-display text-xl uppercase tracking-wider">Registro de asistencia</h1>
        <div className="text-center" aria-live="off">
          <p className="font-display text-4xl tabular-nums">
            {ahora ? ahora.toLocaleTimeString('es-MX', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
          </p>
          <p className="font-manuscrita text-xl capitalize">
            {ahora ? ahora.toLocaleDateString('es-MX', { timeZone: ZONA, weekday: 'long', day: 'numeric', month: 'long' }) : ' '}
          </p>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <EstadoUbicacion ubicacion={ubicacion} />

        {/* Paso 1: nombre */}
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-verde/70">1 · ¿Quién eres?</h2>
          {empleado ? (
            <div className="flex items-center justify-between rounded-2xl border-2 border-hoja bg-white px-4 py-3">
              <span className="text-lg font-bold">{empleado.nombre}</span>
              <button
                type="button"
                onClick={() => {
                  setEmpleado(null);
                  setPin('');
                  setError('');
                }}
                className="text-sm font-semibold text-chile underline underline-offset-2"
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-crema-oscuro bg-white">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Busca tu nombre…"
                className="w-full rounded-t-2xl border-b-2 border-crema-oscuro bg-transparent px-4 py-3 text-lg outline-none focus:border-mostaza"
                aria-label="Buscar nombre"
              />
              <ul className="max-h-56 overflow-y-auto">
                {empleados === null && <li className="px-4 py-3 text-verde/60">Cargando…</li>}
                {empleados !== null && filtrados.length === 0 && (
                  <li className="px-4 py-3 text-verde/60">Sin resultados. Pide al administrador que te dé de alta.</li>
                )}
                {filtrados.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmpleado(e);
                        setError('');
                      }}
                      className="w-full px-4 py-3 text-left text-lg hover:bg-crema active:bg-crema-oscuro"
                    >
                      {e.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Paso 2: PIN */}
        {empleado && (
          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-verde/70">2 · Tu PIN</h2>
            <Teclado pin={pin} setPin={setPin} deshabilitado={enviando} />
          </section>
        )}

        {error && (
          <p role="alert" className="rounded-2xl border-2 border-chile/40 bg-chile/10 px-4 py-3 font-semibold text-chile">
            {error}
          </p>
        )}

        {empleado && (
          <button
            type="button"
            onClick={registrar}
            disabled={!listo}
            className="w-full rounded-2xl bg-verde py-4 font-display text-lg uppercase tracking-wider text-mostaza shadow-lg transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {enviando ? 'Registrando…' : 'Registrar asistencia'}
          </button>
        )}

        <Separador />
        <p className="text-center text-sm text-verde/70">
          Tu ubicación solo se usa para confirmar que estás en el restaurante al registrarte.
        </p>
      </div>
    </Tarjeta>
  );
}

function EstadoUbicacion({ ubicacion }: { ubicacion: Ubicacion }) {
  const estilos = {
    buscando: ['bg-mostaza/20 text-verde', '📡', 'Obteniendo tu ubicación…'],
    lista: ['bg-hoja/15 text-hoja', '📍', 'Ubicación lista'],
    denegada: ['bg-chile/10 text-chile', '⚠️', 'Permite el acceso a tu ubicación en el navegador para poder registrarte.'],
    error: ['bg-chile/10 text-chile', '⚠️', 'No pudimos obtener tu ubicación. Activa el GPS y recarga la página.'],
    'no-soportada': ['bg-chile/10 text-chile', '⚠️', 'Tu navegador no permite obtener la ubicación.'],
  } as const;
  const [clase, icono, texto] = estilos[ubicacion.estado];
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold ${clase}`} aria-live="polite">
      <span aria-hidden className="text-xl">{icono}</span>
      <span>
        {texto}
        {ubicacion.estado === 'lista' && (
          <span className="font-normal opacity-75"> (precisión ±{Math.round(ubicacion.precision)} m)</span>
        )}
      </span>
    </div>
  );
}

function Teclado({ pin, setPin, deshabilitado }: { pin: string; setPin: (p: string) => void; deshabilitado: boolean }) {
  const pulsar = (d: string) => pin.length < 6 && setPin(pin + d);
  const tecla =
    'h-14 rounded-2xl bg-white text-2xl font-bold shadow-sm ring-1 ring-crema-oscuro transition active:scale-95 active:bg-mostaza/30 disabled:opacity-40';
  return (
    <div>
      <div className="mb-3 flex justify-center gap-3" aria-label={`${pin.length} dígitos ingresados`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span
            key={i}
            className={`size-4 rounded-full border-2 ${
              i < pin.length ? 'border-verde bg-verde' : i < 4 ? 'border-verde/50' : 'border-dashed border-verde/30'
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className={tecla} onClick={() => pulsar(d)} disabled={deshabilitado}>
            {d}
          </button>
        ))}
        <button
          type="button"
          className={`${tecla} text-base`}
          onClick={() => setPin('')}
          disabled={deshabilitado || !pin}
        >
          Borrar
        </button>
        <button type="button" className={tecla} onClick={() => pulsar('0')} disabled={deshabilitado}>
          0
        </button>
        <button
          type="button"
          className={tecla}
          onClick={() => setPin(pin.slice(0, -1))}
          disabled={deshabilitado || !pin}
          aria-label="Borrar último dígito"
        >
          ⌫
        </button>
      </div>
    </div>
  );
}

function Confirmacion({ resultado }: { resultado: Resultado }) {
  const nombre = resultado.nombre.split(' ')[0];
  const esEntrada = resultado.tipo === 'entrada';
  return (
    <Tarjeta className="mx-auto w-full max-w-md p-8 text-center">
      <div className="flex justify-center">
        <Logo tamano={88} />
      </div>
      <div className="mx-auto mt-6 flex size-20 items-center justify-center rounded-full bg-hoja text-4xl text-white shadow-lg">
        ✓
      </div>
      <p className="mt-5 text-sm font-bold uppercase tracking-widest text-hoja">
        {esEntrada ? 'Entrada registrada' : 'Salida registrada'}
      </p>
      <h1 className="mt-1 font-display text-3xl">{esEntrada ? `¡Buen turno, ${nombre}!` : `¡Hasta pronto, ${nombre}!`}</h1>
      <p className="mt-4 font-display text-5xl tabular-nums text-mostaza-oscuro">{resultado.hora}</p>
      {!esEntrada && resultado.horaEntrada && (
        <p className="mt-2 text-verde/70">Entraste a las {resultado.horaEntrada}</p>
      )}
      <div className="my-6">
        <Separador />
      </div>
      <p className="font-manuscrita text-xl">
        {esEntrada ? 'No olvides registrar tu salida al terminar.' : 'Gracias por tu trabajo de hoy.'}
      </p>
      <p className="mt-2 text-sm text-verde/60">Ya puedes cerrar esta ventana.</p>
    </Tarjeta>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Tarjeta className="mx-auto w-full max-w-sm p-8 text-center">
      <div className="flex justify-center">
        <Logo tamano={120} />
      </div>
      <h1 className="mt-6 font-display text-2xl uppercase">{titulo}</h1>
      <div className="my-4">
        <Separador />
      </div>
      <p className="text-lg">{children}</p>
    </Tarjeta>
  );
}

function normalizar(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
