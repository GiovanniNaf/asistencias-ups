import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PIN_VALIDO, esAdmin, hashPin } from '@/lib/seguridad';

const noAutorizado = () => NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

export async function GET(req: NextRequest) {
  if (!(await esAdmin(req))) return noAutorizado();

  const { data, error } = await supabaseAdmin()
    .from('empleados')
    .select('id, nombre, activo, device_token, bloqueado_hasta, created_at')
    .order('nombre');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // No se envía el token del dispositivo al navegador, solo si existe
  const empleados = data.map(({ device_token, ...resto }) => ({ ...resto, tieneDispositivo: !!device_token }));
  return NextResponse.json({ empleados });
}

export async function POST(req: NextRequest) {
  if (!(await esAdmin(req))) return noAutorizado();

  const { nombre, pin } = await req.json().catch(() => ({}));
  if (typeof nombre !== 'string' || !nombre.trim()) {
    return NextResponse.json({ error: 'Escribe el nombre del empleado.' }, { status: 400 });
  }
  if (typeof pin !== 'string' || !PIN_VALIDO.test(pin)) {
    return NextResponse.json({ error: 'El PIN debe tener de 4 a 6 dígitos.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin()
    .from('empleados')
    .insert({ nombre: nombre.trim().replace(/\s+/g, ' '), pin_hash: await hashPin(pin) });

  if (error) {
    const mensaje = error.code === '23505' ? 'Ya existe un empleado con ese nombre.' : error.message;
    return NextResponse.json({ error: mensaje }, { status: 400 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
