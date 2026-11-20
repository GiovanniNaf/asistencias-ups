-- Empleados con PIN, dispositivo vinculado y bitácora de ubicación.
-- A partir de aquí todas las lecturas/escrituras pasan por las API routes de Next.js
-- con la service role key; el navegador (anon) ya no tiene acceso directo.

create table if not exists public.empleados (
  id                 uuid        primary key default gen_random_uuid(),
  nombre             text        not null check (length(trim(nombre)) > 0),
  pin_hash           text        not null,
  activo             boolean     not null default true,
  device_token       text,
  intentos_fallidos  int         not null default 0,
  bloqueado_hasta    timestamptz,
  created_at         timestamptz not null default now()
);

create unique index if not exists empleados_nombre_unico
  on public.empleados (lower(trim(nombre)));

-- Un teléfono solo puede estar vinculado a un empleado
create unique index if not exists empleados_device_token_unico
  on public.empleados (device_token)
  where device_token is not null;

-- Bitácora: ubicación, IP y navegador de la entrada y de la salida
alter table public.asistencia
  add column if not exists empleado_id         uuid references public.empleados (id) on delete restrict,
  add column if not exists lat                 double precision,
  add column if not exists lng                 double precision,
  add column if not exists distancia_m         integer,
  add column if not exists lat_salida          double precision,
  add column if not exists lng_salida          double precision,
  add column if not exists distancia_salida_m  integer,
  add column if not exists ip                  text,
  add column if not exists user_agent          text;

-- Un registro por empleado por día (los registros viejos sin empleado_id no cuentan)
create unique index if not exists asistencia_empleado_fecha_unico
  on public.asistencia (empleado_id, fecha)
  where empleado_id is not null;

-- Quitar el acceso público que tenía la app anterior
drop policy if exists "asistencia_select_publico" on public.asistencia;
drop policy if exists "asistencia_insert_publico" on public.asistencia;
drop policy if exists "asistencia_update_publico" on public.asistencia;
revoke all on public.asistencia from anon, authenticated;
revoke all on public.empleados  from anon, authenticated;

-- RLS activo y sin políticas: solo la service role (servidor) puede leer y escribir
alter table public.asistencia enable row level security;
alter table public.empleados  enable row level security;
