import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { tokenQrValido } from '@/lib/seguridad';

// Lista de nombres para el selector de /registro. Solo con el token del QR.
export async function GET(req: NextRequest) {
  if (!tokenQrValido(req.nextUrl.searchParams.get('k'))) {
    return NextResponse.json({ error: 'Escanea el QR del restaurante para registrar tu asistencia.' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin()
    .from('empleados')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');

  if (error) {
    console.error(error);
    return NextResponse.json({ error: 'No se pudo cargar la lista de empleados.' }, { status: 500 });
  }
  return NextResponse.json({ empleados: data });
}
