-- ============================================================
-- Update 26: sección "Actividades" (deportivas / culturales).
--
-- Calcada de "events" (misma estructura: portada con foco, galería,
-- precio/inscripción, destacados, estados) pero con dos diferencias
-- clave:
--   1) Acá NO hay flujo de comercios cargando sus propias actividades.
--      Solo el municipio (admin) las carga, así que no hace falta
--      ningún esquema de ownership/revisión — el admin tiene acceso
--      total y el público solo lee las publicadas.
--   2) Las actividades se hacen todo el año (no tienen una fecha
--      puntual como un evento): en vez de start_date/end_date tienen
--      days_of_week (qué días de la semana se repiten) + un horario.
--
-- En vez de una tabla de categorías (como event_categories), las
-- actividades usan una sola etiqueta fija: 'deportiva' o 'cultural'.
--
-- Correr en el SQL Editor después de schema.sql + updates 01-25.
-- ============================================================

-- 1) ACTIVIDADES ------------------------------------------------
create table public.activities (
  id uuid primary key default gen_random_uuid(),

  -- Quién la cargó (siempre un admin) y, opcionalmente, con qué ficha
  -- comercial se asocia (ej: un gimnasio organiza una actividad
  -- deportiva). business_id null = la organiza directamente el
  -- municipio.
  owner_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,

  title text not null,
  short_description text,
  description text,
  cover_image text,
  cover_focal_x numeric not null default 50,
  cover_focal_y numeric not null default 50,
  gallery jsonb default '[]',

  tag text not null check (tag in ('deportiva', 'cultural')),

  -- Las actividades se hacen todo el año, no tienen fecha puntual:
  -- se repiten semanalmente en estos días (lunes..domingo) dentro
  -- de un mismo horario.
  days_of_week text[] not null default '{}'
    check (days_of_week <@ array['lunes','martes','miercoles','jueves','viernes','sabado','domingo']::text[]),
  start_time time,
  end_time time,

  address text,
  lat double precision,
  lng double precision,

  contact_name text,
  phone text,
  whatsapp text,
  instagram text,
  website text,

  price numeric,
  is_free boolean not null default false,
  requires_registration boolean not null default false,
  registration_url text,
  capacity int,

  -- 'finished' acá es manual (lo pone el admin cuando el programa/
  -- temporada termina), no se calcula por fecha porque no hay fecha.
  status text not null default 'draft'
    check (status in ('draft','pending','approved','published','needs_changes','rejected','finished','hidden')),
  review_note text,

  is_featured boolean not null default false,
  featured_order int not null default 0,

  views_count int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activities_status_idx on public.activities (status);
create index activities_business_idx on public.activities (business_id);
create index activities_tag_idx on public.activities (tag);

alter table public.activities enable row level security;

-- Público: solo actividades publicadas.
create policy "activities_public_read_published"
  on public.activities for select
  using (status = 'published');

-- Admin: acceso total (crear, aprobar, destacar, editar, borrar...).
create policy "activities_admin_all"
  on public.activities for all
  using (public.is_admin())
  with check (public.is_admin());

create function public.protect_activity_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

create trigger activities_before_update
  before update on public.activities
  for each row execute function public.protect_activity_updated_at();


-- 2) CRONOGRAMA INTERNO (actividades de varios días) ----------------
create table public.activity_schedule_items (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  item_date date not null,
  start_time time,
  end_time time,
  description text not null,
  sort_order int default 0
);

create index activity_schedule_items_activity_idx on public.activity_schedule_items (activity_id);

alter table public.activity_schedule_items enable row level security;

create policy "activity_schedule_public_read"
  on public.activity_schedule_items for select
  using (
    exists (
      select 1 from public.activities a
      where a.id = activity_id and (a.status = 'published' or public.is_admin())
    )
  );

create policy "activity_schedule_admin_write"
  on public.activity_schedule_items for all
  using (public.is_admin())
  with check (public.is_admin());


-- 3) CONTADOR DE VISITAS ---------------------------------------------
create function public.increment_activity_views(p_activity_id uuid)
returns void as $$
  update public.activities
  set views_count = views_count + 1
  where id = p_activity_id and status = 'published';
$$ language sql security definer;

grant execute on function public.increment_activity_views(uuid) to anon, authenticated;


-- 4) STORAGE PARA IMÁGENES DE ACTIVIDADES ----------------------------
-- Mismo criterio que "event-images" (update 18): estructura de
-- archivos activity-images/{activity_id}/cover-{timestamp}.jpg.
insert into storage.buckets (id, name, public)
values ('activity-images', 'activity-images', true)
on conflict (id) do nothing;

create policy "activity_images_public_read"
  on storage.objects for select
  using (bucket_id = 'activity-images');

create policy "activity_images_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'activity-images' and public.is_admin());

create policy "activity_images_admin_update"
  on storage.objects for update
  using (bucket_id = 'activity-images' and public.is_admin());

create policy "activity_images_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'activity-images' and public.is_admin());
