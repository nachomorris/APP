-- ============================================================
-- Update 17: sección "Lugares para visitar" administrable desde
-- el panel de admin (antes era un array fijo dentro de index.html,
-- solo editable tocando código). Misma mecánica que featured_cards
-- (update 16): tabla propia + bucket de Storage para la foto.
--
-- Este script MIGRA los 5 lugares que ya estaban cargados a mano
-- en index.html, para no perder esa información.
--
-- Correr en el SQL Editor después de schema.sql + updates 01-16.
-- ============================================================

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  type text,
  emoji text default '📍',
  description text,
  image_url text,
  lat double precision,
  lng double precision,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.places enable row level security;

create policy "places_public_read"
  on public.places for select
  using (is_active = true);

create policy "places_admin_all"
  on public.places for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.touch_place_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists places_touch_updated_at on public.places;
create trigger places_touch_updated_at
  before update on public.places
  for each row execute function public.touch_place_updated_at();

-- ---------- Migración de los 5 lugares que ya estaban cargados ----------
insert into public.places (slug, name, type, emoji, description, lat, lng, sort_order)
values
  ('paseo-del-lago', 'Paseo del Lago', 'Peatonal', '🌉',
    'Recorrido peatonal con miradores y rampas para personas con discapacidad, y un puente flotante que comunica con el Parque Nativo.',
    -33.2293, -66.271, 0),
  ('paseo-artesanos', 'Paseo de Artesanos Laura Amaya', 'Paseo', '🎨',
    'Feria de artesanos con productos regionales, tejidos y artesanías locales, en pleno centro de Potrero.',
    -33.2353, -66.262, 1),
  ('parque-salagria', 'Parque Recreativo La Salagria', 'Parque recreativo', '🌳',
    'Propuestas pensadas para el descanso, la recreación y los encuentros en familia o con amigos, a orillas del dique.',
    -33.2243, -66.257, 2),
  ('quebrada-condores', 'Quebrada de los Cóndores', 'Fotográfico', '🦅',
    'Ingreso y bienvenida al valle, con un mirador ideal para fotografía y contacto con las sierras.',
    -33.2443, -66.269, 3),
  ('dique-potrero', 'Dique Potrero de los Funes', 'Naturaleza', '💧',
    'El embalse que da nombre a la localidad. Apto para deportes náuticos, pesca y paseos en la costanera.',
    -33.2323, -66.276, 4)
on conflict (slug) do nothing;

-- ---------- Storage: bucket para las fotos de los lugares ----------
-- Estructura de archivos: place-images/{place_id}/cover-{timestamp}.jpg
-- Solo el admin sube/edita/borra; la lectura es pública.

insert into storage.buckets (id, name, public)
values ('place-images', 'place-images', true)
on conflict (id) do nothing;

create policy "place_images_public_read"
  on storage.objects for select
  using (bucket_id = 'place-images');

create policy "place_images_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'place-images' and public.is_admin());

create policy "place_images_admin_update"
  on storage.objects for update
  using (bucket_id = 'place-images' and public.is_admin());

create policy "place_images_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'place-images' and public.is_admin());
