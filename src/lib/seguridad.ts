import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { NextRequest } from 'next/server';
import { supabaseAdmin } from './supabase-admin';

const scryptAsync = promisify(scrypt) as (pwd: string, salt: Buffer, keylen: number) => Promise<Buffer>;

export const ZONA_HORARIA = 'America/Mexico_City';
export const MAX_INTENTOS_PIN = 5;
export const MINUTOS_BLOQUEO = 15;
export const PRECISION_MAXIMA_M = 150;
// Antes de esta hora, un turno abierto de ayer se cierra como salida (turnos que pasan de medianoche)
export const HORA_CORTE_TURNO_NOCTURNO = 6;
export const COOKIE_DISPOSITIVO = 'tp_dispositivo';

export const PIN_VALIDO = /^\d{4,6}$/;

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(pin, salt, 32);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verificarPin(pin: string, guardado: string): Promise<boolean> {
  const [algoritmo, saltHex, hashHex] = guardado.split('$');
  if (algoritmo !== 'scrypt' || !saltHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, 'hex');
  const calculado = await scryptAsync(pin, Buffer.from(saltHex, 'hex'), esperado.length);
  return timingSafeEqual(esperado, calculado);
}

// --- Copia cifrada del PIN para que el admin pueda verlo (AES-256-GCM) ---

function llavePin(): Buffer | null {
  const secreto = process.env.PIN_SECRET;
  if (!secreto || secreto.length < 16) return null;
  return createHash('sha256').update(secreto).digest();
}

/** Devuelve el PIN cifrado, o null si PIN_SECRET no está configurado. */
export function cifrarPin(pin: string): string | null {
  const llave = llavePin();
  if (!llave) return null;
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', llave, iv);
  const datos = Buffer.concat([cifrador.update(pin, 'utf8'), cifrador.final()]);
  return `v1$${iv.toString('hex')}$${cifrador.getAuthTag().toString('hex')}$${datos.toString('hex')}`;
}

/** Descifra el PIN. Devuelve null si falta la llave o si se cifró con otra llave. */
export function descifrarPin(cifrado: string): string | null {
  const llave = llavePin();
  const [version, ivHex, tagHex, datosHex] = cifrado.split('$');
  if (!llave || version !== 'v1' || !ivHex || !tagHex || !datosHex) return null;
  try {
    const descifrador = createDecipheriv('aes-256-gcm', llave, Buffer.from(ivHex, 'hex'));
    descifrador.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([descifrador.update(Buffer.from(datosHex, 'hex')), descifrador.final()]).toString('utf8');
  } catch {
    return null;
  }
}

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
export function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Fecha (YYYY-MM-DD), hora (HH:MM) y hora numérica en la zona horaria del restaurante. */
export function fechaHoraMexico(base: Date = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(base);
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? '';
  return {
    fecha: `${p('year')}-${p('month')}-${p('day')}`,
    hora: `${p('hour')}:${p('minute')}`,
    horaNumero: Number(p('hour')),
  };
}

export function fechaAyer(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Si QR_TOKEN no está configurado, el link es simplemente /registro y no se pide token. */
export function tokenQrValido(k: unknown): boolean {
  const esperado = process.env.QR_TOKEN;
  if (!esperado) return true;
  if (typeof k !== 'string') return false;
  const a = Buffer.from(k);
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function configRestaurante() {
  const lat = Number(process.env.RESTAURANTE_LAT);
  const lng = Number(process.env.RESTAURANTE_LNG);
  const radio = Number(process.env.RADIO_METROS ?? 100);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(radio)) {
    throw new Error('Faltan RESTAURANTE_LAT, RESTAURANTE_LNG o RADIO_METROS');
  }
  return { lat, lng, radio };
}

export function ipDe(req: NextRequest): string | null {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip');
}

/** Verifica que la petición venga de un administrador (sesión de Supabase + correo en ADMIN_EMAILS). */
export async function esAdmin(req: NextRequest): Promise<boolean> {
  const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!jwt) return false;
  const { data, error } = await supabaseAdmin().auth.getUser(jwt);
  const email = data.user?.email?.toLowerCase();
  if (error || !email) return false;
  const permitidos = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return permitidos.includes(email);
}
