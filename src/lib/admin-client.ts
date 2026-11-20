'use client';
import { supabase } from './supabase';

/** fetch a las API de admin con el token de la sesión de Supabase. Lanza Error con el mensaje del servidor. */
export async function adminFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const r = await fetch(url, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  const datos = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      r.status === 401
        ? 'Tu cuenta no tiene permiso de administrador. Pide que agreguen tu correo a ADMIN_EMAILS.'
        : datos.error || 'Ocurrió un error.',
    );
  }
  return datos as T;
}
