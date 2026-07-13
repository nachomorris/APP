-- ============================================================
-- Update 03: campos y permisos necesarios para importar el
-- catálogo real desde el data.js del proyecto viejo.
-- Correr en el SQL Editor.
-- ============================================================

-- Nuevos campos en businesses
alter table public.businesses add column if not exists email text;
alter table public.businesses add column if not exists facebook text;
alter table public.businesses add column if not exists featured boolean not null default false;
alter table public.businesses add column if not exists legacy_id text unique;
alter table public.businesses add column if not exists open boolean not null default true;

-- Nuevo campo en categories (color de tema, como en el sitio viejo)
alter table public.categories add column if not exists color text;

-- El admin puede crear/editar categorías y subcategorías
-- (antes solo se cargaban a mano desde el Table Editor).
create policy "categories_admin_write"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "subcategories_admin_write"
  on public.subcategories for all
  using (public.is_admin())
  with check (public.is_admin());
