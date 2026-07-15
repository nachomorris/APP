-- ============================================================
-- Update 16: sección "Destacado" (antes "Descuentos imperdibles")
-- totalmente administrable desde el panel de admin: título,
-- subtítulo, foto propia, orden, activo/inactivo, y un vínculo
-- opcional a una ficha de comercio o a una URL externa.
--
-- Antes estas tarjetas se armaban solas a partir de
-- businesses.featured/top; ahora son contenido propio, editable
-- en su totalidad, independiente de esa bandera.
--
-- Correr en el SQL Editor después de schema.sql + updates 01-15.
-- ============================================================

create table if not exists public.featured_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  business_id uuid references public.businesses(id) on delete set null,
  external_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.featured_cards enable row level security;

-- Lectura pública: solo las tarjetas activas (lo que se muestra
-- en la home, sección "Destacado").
create policy "featured_cards_public_read"
  on public.featured_cards for select
  using (is_active = true);

-- El admin tiene control total (crear, editar, eliminar, ver
-- inactivas también).
create policy "featured_cards_admin_all"
  on public.featured_cards for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.touch_featured_card_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists featured_cards_touch_updated_at on public.featured_cards;
create trigger featured_cards_touch_updated_at
  before update on public.featured_cards
  for each row execute function public.touch_featured_card_updated_at();

-- ---------- Storage: bucket para las fotos de estas tarjetas ----------
-- Estructura de archivos: featured-images/{card_id}/cover-{timestamp}.jpg
-- Solo el admin sube/edita/borra; la lectura es pública (se
-- muestra en la home de cualquier visitante).

insert into storage.buckets (id, name, public)
values ('featured-images', 'featured-images', true)
on conflict (id) do nothing;

create policy "featured_images_public_read"
  on storage.objects for select
  using (bucket_id = 'featured-images');

create policy "featured_images_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'featured-images' and public.is_admin());

create policy "featured_images_admin_update"
  on storage.objects for update
  using (bucket_id = 'featured-images' and public.is_admin());

create policy "featured_images_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'featured-images' and public.is_admin());
