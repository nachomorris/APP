-- ============================================================
-- Update 27: corrige el modelo de fecha de "Actividades" (update 26).
--
-- Las actividades se hacen todo el año, no en una fecha puntual:
-- en vez de start_date/end_date/recurrencia, ahora tienen
-- days_of_week (qué días de la semana se repiten) + un horario.
--
-- Corré esto SOLO SI ya ejecutaste schema_update_26.sql. Si todavía
-- no lo corriste, no hace falta este archivo: schema_update_26.sql
-- ya quedó actualizado con el modelo correcto directamente.
-- ============================================================

alter table public.activities drop constraint if exists activities_end_after_start;

alter table public.activities drop column if exists start_date;
alter table public.activities drop column if exists end_date;
alter table public.activities drop column if exists recurrence_type;
alter table public.activities drop column if exists recurrence_group_id;

alter table public.activities
  add column if not exists days_of_week text[] not null default '{}';

alter table public.activities
  add constraint activities_days_of_week_valid
  check (days_of_week <@ array['lunes','martes','miercoles','jueves','viernes','sabado','domingo']::text[]);

drop index if exists activities_status_start_idx;
drop index if exists activities_recurrence_group_idx;
create index if not exists activities_status_idx on public.activities (status);

-- Nota: las actividades que ya hayas cargado quedan con days_of_week
-- vacío (sin días asignados) hasta que las edites desde el admin y
-- marques los días correspondientes.
