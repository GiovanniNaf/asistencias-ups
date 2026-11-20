import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PIN_VALIDO, esAdmin, hashPin } from '@/lib/seguridad';

// Cambiar PIN, activar/desactivar o liberar el teléfono vinculado
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await esAdmin(req))) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  const { id } = await params;
  const { pin, activo, liberarDispositivo } = await req.json().catch(() => ({}));
  const cambios: Record<string, unknown> = {};

  if (pin !== undefined) {
    if (typeof pin !== 'string' || !PIN_VALIDO.test(pin)) {
      return NextResponse.json({ error: 'El PIN debe tener de 4 a 6 dígitos.' }, { status: 400 });
    }
    cambios.pin_hash = await hashPin(pin);
    cambios.intentos_fallidos = 0;
    cambios.bloqueado_hasta = null;
  }
  if (typeof activo === 'boolean') cambios.activo = activo;
  if (liberarDispositivo === true) cambios.device_token = null;

  if (Object.keys(cambios).length === 0) {
    return NextResponse.json({ error: 'Nada que cambiar.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin().from('empleados').update(cambios).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
