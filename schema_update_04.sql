-- ============================================================
-- Update 04: Agenda de Eventos
-- Correr en el SQL Editor DESPUÉS de schema.sql + updates 01-03.
-- Sigue exactamente el mismo patrón que "businesses": RLS por
-- owner_id, protección de status vía trigger, is_admin() ya
-- existente (update 02) para el panel de administración.
-- ============================================================

-- 1) CATEGORÍAS DE EVENTOS ------------------------------------
-- Tabla separada de "categories" (que es para comercios): un evento
-- se clasifica por tipo de actividad, no por rubro comercial.
create table public.event_categories (
  id text primary key,
  label text not null,
  icon text,
  color text,
  sort_order int default 0
);

alter table public.event_categories enable row level security;

create policy "event_categories_public_read"
  on public.event_categories for select using (true);

create policy "event_categories_admin_write"
  on public.event_categories for all
  using (public.is_admin())
  with check (public.is_admin());

insert into public.event_categories (id, label, icon, color, sort_order) values
  ('cultura',       'Cultura',                 '🎭', '#7c3aed', 1),
  ('gastronomia',   'Gastronomía',             '🍽️', '#f97316', 2),
  ('deportes',      'Deportes',                '⚽', '#ca8a04', 3),
  ('musica',        'Música y espectáculos',   '🎵', '#db2777', 4),
  ('turismo',       'Turismo y experiencias',  '🧭', '#16a34a', 5),
  ('infantil',      'Actividades infantiles',  '🧒', '#0ea5e9', 6),
  ('ferias',        'Ferias y mercados',       '🛍️', '#65A30D', 7)
on conflict (id) do nothing;


-- 2) EVENTOS ----------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),

  -- Quién lo cargó y con qué ficha comercial/institucional se asocia.
  -- business_id puede ser null solo para eventos oficiales del municipio
  -- (is_official = true), que no dependen de ningún comercio.
  owner_id uuid not null references public.profiles(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,

  title text not null,
  short_description text,
  description text,
  cover_image text,
  gallery jsonb default '[]',           -- array de URLs (igual que businesses.images)

  category_id text not null references public.event_categories(id),
  tags text[] default '{}',

  start_date date not null,
  end_date date not null,
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

  -- Recurrencia: al crear un evento recurrente se generan varias filas
  -- (una por fecha real), todas comparten recurrence_group_id para poder
  -- editarlas/identificarlas como parte de la misma serie. No hay cron:
  -- las fechas futuras se calculan y se insertan en el momento de crear
  -- el evento (horizonte configurable desde el formulario).
  recurrence_type text not null default 'none'
    check (recurrence_type in ('none','weekly_fri','weekly_sat','weekend','weekly','custom')),
  recurrence_group_id uuid,

  status text not null default 'draft'
    check (status in ('draft','pending','approved','published','needs_changes','rejected','finished','hidden')),
  review_note text,               -- observación del admin visible para el usuario

  is_official boolean not null default false,   -- cargado por admin, se publica sin revisión
  is_featured boolean not null default false,
  featured_order int not null default 0,

  views_count int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint events_end_after_start check (end_date >= start_date)
);

create index events_status_start_idx on public.events (status, start_date);
create index events_business_idx on public.events (business_id);
create index events_category_idx on public.events (category_id);
create index events_recurrence_group_idx on public.events (recurrence_group_id);

alter table public.events enable row level security;

-- Público: solo eventos publicados.
create policy "events_public_read_published"
  on public.events for select
  using (status = 'published');

-- Dueño: ve todos sus propios eventos (cualquier estado).
create policy "events_owner_read_own"
  on public.events for select
  using (auth.uid() = owner_id);

-- Dueño: crea eventos propios. Solo puede insertarlos en 'draft' o
-- 'pending' (nunca publicados directamente), sin marcarlos oficiales
-- ni destacados, y solo asociados a una ficha que le pertenezca a él.
create policy "events_owner_insert"
  on public.events for insert
  with check (
    auth.uid() = owner_id
    and (public.is_admin() or status in ('draft','pending'))
    and (public.is_admin() or is_official = false)
    and (public.is_admin() or is_featured = false)
    and (
      business_id is null
      or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
    )
  );

-- Dueño: edita solo sus propios eventos (el trigger de abajo protege
-- los campos que no puede tocar: status, is_official, is_featured...).
create policy "events_owner_update_own"
  on public.events for update
  using (auth.uid() = owner_id);

create policy "events_owner_delete_own"
  on public.events for delete
  using (auth.uid() = owner_id);

-- Admin: acceso total (aprobar, rechazar, destacar, crear oficiales, etc.)
create policy "events_admin_all"
  on public.events for all
  using (public.is_admin())
  with check (public.is_admin());

-- Trigger: un dueño no-admin no puede autopublicarse, autodestacarse
-- ni marcarse como oficial. Si intenta, se ignora ese cambio puntual
-- (igual que protect_business_status). También reordena a 'pending'
-- si edita un evento que estaba 'needs_changes'/'rejected'.
create function public.protect_event_status()
returns trigger as $$
declare
  requester_is_admin boolean;
begin
  select public.is_admin() into requester_is_admin;

  if not coalesce(requester_is_admin, false) then
    if new.is_official is distinct from old.is_official then
      new.is_official := old.is_official;
    end if;
    if new.is_featured is distinct from old.is_featured then
      new.is_featured := old.is_featured;
    end if;
    if new.featured_order is distinct from old.featured_order then
      new.featured_order := old.featured_order;
    end if;
    if new.review_note is distinct from old.review_note then
      new.review_note := old.review_note;
    end if;
    -- Un dueño solo puede dejar su evento en 'draft' o volver a mandarlo
    -- a 'pending' (por ej. tras corregir algo pedido por el admin).
    if new.status is distinct from old.status and new.status not in ('draft','pending') then
      new.status := old.status;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

create trigger events_before_update
  before update on public.events
  for each row execute function public.protect_event_status();


-- 3) CRONOGRAMA INTERNO (eventos de varios días con actividades) ----
create table public.event_schedule_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  item_date date not null,
  start_time time,
  end_time time,
  description text not null,
  sort_order int default 0
);

create index event_schedule_items_event_idx on public.event_schedule_items (event_id);

alter table public.event_schedule_items enable row level security;

create policy "event_schedule_public_read"
  on public.event_schedule_items for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (e.status = 'published' or e.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "event_schedule_owner_write"
  on public.event_schedule_items for all
  using (
    exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
    or public.is_admin()
  )
  with check (
    exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
    or public.is_admin()
  );


-- 4) CONTADOR DE VISITAS A LA FICHA DEL EVENTO ----------------------
-- Función pública (sin necesidad de estar logueado) que suma 1 al
-- contador. security definer para poder incrementar sin exponer una
-- policy de UPDATE abierta a cualquiera sobre toda la tabla.
create function public.increment_event_views(p_event_id uuid)
returns void as $$
  update public.events
  set views_count = views_count + 1
  where id = p_event_id and status = 'published';
$$ language sql security definer;

grant execute on function public.increment_event_views(uuid) to anon, authenticated;


-- 5) STORAGE PARA IMÁGENES DE EVENTOS -------------------------------
-- Igual que con businesses: por ahora las imágenes se cargan como URL
-- (cover_image / gallery), sin bucket de subida propio todavía porque
-- el panel de comercios tampoco lo tiene implementado aún. Cuando se
-- arme el uploader de fotos de comercios, se suma en el mismo paso:
-- insert into storage.buckets (id, name, public) values ('event-images', 'event-images', true);
