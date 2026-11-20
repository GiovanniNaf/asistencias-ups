import { NextRequest, NextResponse } from 'next/server';
import { esAdmin } from '@/lib/seguridad';

// Devuelve el token del QR (o null si no se usa) para que el admin imprima el póster
export async function GET(req: NextRequest) {
  if (!(await esAdmin(req))) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  return NextResponse.json({ token: process.env.QR_TOKEN || null });
}
