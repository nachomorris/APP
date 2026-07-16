-- ============================================================
-- Update 29: tabla genérica de configuración ("app_settings") +
-- flag para poder habilitar/deshabilitar el panel de Novedades
-- desde el admin, sin tocar código. Pensada para reutilizarse con
-- futuros interruptores similares (clave/valor).
--
-- Correr en el SQL Editor después de schema.sql + updates 01-28.
-- ============================================================

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Lectura pública (el sitio necesita leerlo sin estar logueado para
-- decidir si muestra o no la sección).
create policy "app_settings_public_read"
  on public.app_settings for select
  using (true);

-- Solo el admin (o master_eventos, por si mañana hay un flag suyo)
-- puede cambiar valores.
create policy "app_settings_admin_write"
  on public.app_settings for all
  using (public.is_admin() or public.is_master_eventos())
  with check (public.is_admin() or public.is_master_eventos());

create or replace function public.protect_app_settings_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

create trigger app_settings_before_update
  before update on public.app_settings
  for each row execute function public.protect_app_settings_updated_at();

-- Valor inicial: panel de Novedades habilitado (comportamiento actual).
insert into public.app_settings (key, value)
values ('novedades_enabled', 'true'::jsonb)
on conflict (key) do nothing;
