import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { descifrarPin, esAdmin } from '@/lib/seguridad';

const SIN_CACHE = { 'Cache-Control': 'no-store' };

// Devuelve el PIN de un empleado al administrador
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await esAdmin(req))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401, headers: SIN_CACHE });
  }

  const { id } = await params;
  const { data, error } = await supabaseAdmin().from('empleados').select('pin_cifrado').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: SIN_CACHE });
  if (!data) return NextResponse.json({ error: 'Empleado no encontrado.' }, { status: 404, headers: SIN_CACHE });

  if (!process.env.PIN_SECRET) {
    return NextResponse.json(
      { error: 'Falta configurar PIN_SECRET en las variables de entorno.' },
      { status: 500, headers: SIN_CACHE },
    );
  }

  const pin = data.pin_cifrado ? descifrarPin(data.pin_cifrado) : null;
  if (!pin) {
    return NextResponse.json(
      { error: 'Este PIN no se puede mostrar porque se creó antes de esta función. Usa "Cambiar PIN" para asignar uno nuevo.' },
      { status: 404, headers: SIN_CACHE },
    );
  }
  return NextResponse.json({ pin }, { headers: SIN_CACHE });
}
