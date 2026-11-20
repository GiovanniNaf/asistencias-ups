-- Copia cifrada del PIN (AES-256-GCM con PIN_SECRET, que solo conoce el servidor)
-- para que el administrador pueda consultarlo. La validación sigue usando pin_hash.
-- Solo modifica la tabla empleados.

alter table public.empleados
  add column if not exists pin_cifrado text;
