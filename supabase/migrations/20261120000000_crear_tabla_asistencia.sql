-- Tabla de registros de asistencia (entrada y salida por día)
-- Usada por: src/app/page.tsx (entrada), src/app/salida/page.tsx (salida), src/app/reporte/page.tsx (reporte)

create table if not exists public.asistencia (
  id            uuid        primary key default gen_random_uuid(),
  nombre        text        not null check (length(trim(nombre)) > 0),
  fecha         date        not null,
  -- Las horas se guardan como texto 'HH:MM' porque la app las muestra tal cual;
  -- con el tipo time, Postgres las devolvería como 'HH:MM:SS'.
  hora_entrada  text        not null check (hora_entrada ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  hora_salida   text                 check (hora_salida  ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  device_id     text,
  created_at    timestamptz not null default now()
);

-- Índices para las consultas de la app
create index if not exists asistencia_fecha_device_idx
  on public.asistencia (fecha, device_id);

create index if not exists asistencia_fecha_hora_entrada_idx
  on public.asistencia (fecha, hora_entrada);

-- Permisos: la app usa la anon key de Supabase sin inicio de sesión
grant select, insert, update on public.asistencia to anon, authenticated;

alter table public.asistencia enable row level security;

create policy "asistencia_select_publico"
  on public.asistencia for select
  to anon, authenticated
  using (true);

create policy "asistencia_insert_publico"
  on public.asistencia for insert
  to anon, authenticated
  with check (true);

create policy "asistencia_update_publico"
  on public.asistencia for update
  to anon, authenticated
  using (true)
  with check (true);
