-- ============================================================
-- Visit Potrero V2 — Esquema inicial de Supabase
-- Pegar en: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- 1) PERFILES ------------------------------------------------
-- Un perfil por usuario de auth.users. is_admin=true = vos (el aprobador).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada usuario ve y edita solo su propio perfil.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Crea el perfil automáticamente cuando alguien se registra.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2) CATEGORÍAS Y SUBCATEGORÍAS -------------------------------
-- Tablas en vez de constantes hardcodeadas, para no depender de un
-- redeploy si en el futuro agregás/renombrás una categoría.
create table public.categories (
  id text primary key,       -- ej: 'alojamiento'
  label text not null,       -- ej: 'Alojamiento'
  icon text,
  sort_order int default 0
);

create table public.subcategories (
  id text primary key,       -- ej: 'cabanas'
  category_id text not null references public.categories(id),
  label text not null,
  sort_order int default 0
);

alter table public.categories enable row level security;
alter table public.subcategories enable row level security;

create policy "categories_public_read" on public.categories for select using (true);
create policy "subcategories_public_read" on public.subcategories for select using (true);
-- (Sin políticas de insert/update: por ahora solo vos las cargás desde el
-- Table Editor de Supabase, igual que hoy hacés con las categorías del sitio.)


-- 3) FICHAS DE COMERCIOS ---------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,

  name text not null,
  category_id text not null references public.categories(id),
  subcategory_id text references public.subcategories(id),
  description text,
  address text,
  lat double precision,
  lng double precision,
  phone text,
  whatsapp text,
  instagram text,
  website text,
  hours jsonb,              -- ej: {"lun_vie": "9-18", "sab": "9-13"}
  images jsonb default '[]', -- array de URLs (Supabase Storage)

  status text not null default 'pending'
    check (status in ('pending', 'published', 'rejected')),
  rejection_note text,       -- por si querés avisarle al comercio qué corregir

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

-- Público: solo ve fichas publicadas.
create policy "businesses_public_read_published"
  on public.businesses for select
  using (status = 'published');

-- Dueño: ve TODAS sus propias fichas (incluso pending/rejected).
create policy "businesses_owner_read_own"
  on public.businesses for select
  using (auth.uid() = owner_id);

-- Dueño: puede crear fichas propias (siempre arrancan en 'pending').
create policy "businesses_owner_insert"
  on public.businesses for insert
  with check (auth.uid() = owner_id);

-- Dueño: puede editar SOLO sus propias fichas.
create policy "businesses_owner_update_own"
  on public.businesses for update
  using (auth.uid() = owner_id);

-- Admin (vos): acceso total.
create policy "businesses_admin_all"
  on public.businesses for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- Trigger: un dueño NO puede autopublicarse ni autoaprobarse.
-- Si el que edita no es admin, el status se ignora y queda como estaba
-- (o vuelve a 'pending' si tocó el contenido, para que lo revises de nuevo).
create function public.protect_business_status()
returns trigger as $$
declare
  requester_is_admin boolean;
begin
  select is_admin into requester_is_admin from public.profiles where id = auth.uid();

  if not coalesce(requester_is_admin, false) then
    if new.status is distinct from old.status then
      new.status := old.status; -- ignora intento de cambiar status
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

create trigger businesses_before_update
  before update on public.businesses
  for each row execute function public.protect_business_status();


-- 4) STORAGE PARA FOTOS ------------------------------------------
-- Ejecutar aparte, desde Storage > Create bucket (o vía SQL):
-- insert into storage.buckets (id, name, public) values ('business-images', 'business-images', true);
-- Políticas de bucket: público puede leer; solo dueño autenticado puede
-- subir/borrar en su propia carpeta (ej: business-images/{business_id}/...).
-- Te las armo cuando lleguemos a esa parte.
