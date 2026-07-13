-- ============================================================
-- Update 02: función is_admin() + acceso de lectura del admin
-- a los perfiles de los demás usuarios (para mostrar el dueño
-- de cada ficha en el panel de admin).
-- Correr en el SQL Editor.
-- ============================================================

-- Función auxiliar: evita el error de "recursión infinita" que da
-- Postgres cuando una policy de la tabla profiles consulta la
-- propia tabla profiles directamente.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- El admin puede leer todos los perfiles (nombre/teléfono de cada comercio).
create policy "profiles_admin_read_all"
  on public.profiles for select
  using (public.is_admin());
