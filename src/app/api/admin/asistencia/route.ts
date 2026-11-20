import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { esAdmin } from '@/lib/seguridad';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  if (!(await esAdmin(req))) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const desde = req.nextUrl.searchParams.get('desde') ?? '';
  const hasta = req.nextUrl.searchParams.get('hasta') ?? '';
  if (!FECHA.test(desde) || !FECHA.test(hasta)) {
    return NextResponse.json({ error: 'Fechas inválidas.' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from('asistencia')
    .select('id, nombre, fecha, hora_entrada, hora_salida, distancia_m, distancia_salida_m')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: true })
    .order('hora_entrada', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ asistencias: data });
}
