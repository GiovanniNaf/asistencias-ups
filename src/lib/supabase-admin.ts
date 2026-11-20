import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cliente: SupabaseClient | null = null;

/** Cliente con permisos totales: solo se usa en API routes, nunca en el navegador. */
export function supabaseAdmin(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  }
  cliente = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return cliente;
}
