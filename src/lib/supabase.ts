import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cliente: SupabaseClient | null = null;

/**
 * Cliente de Supabase del navegador (solo para el login del admin).
 * Se crea al usarse, no al importarse, para que `next build` no falle al prerenderizar.
 */
export function getSupabase(): SupabaseClient {
  if (cliente) return cliente;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  cliente = createClient(url, anonKey);
  return cliente;
}
