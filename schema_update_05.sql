-- ============================================================
-- Update 05: Novedades administrables
-- Correr en el SQL Editor DESPUÉS de schema.sql + updates 01-04.
-- Antes "Novedades" era un array fijo dentro de index.html; ahora
-- es una tabla que solo el admin puede escribir (mismo patrón de
-- RLS que event_categories: lectura pública, escritura de admin).
-- ============================================================

create table public.novedades (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  published_at date not null default current_date,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index novedades_published_idx on public.novedades (is_published, published_at);

alter table public.novedades enable row level security;

-- Público: solo las novedades publicadas.
create policy "novedades_public_read_published"
  on public.novedades for select
  using (is_published = true);

-- Admin: acceso total (crear, editar, ocultar, eliminar).
create policy "novedades_admin_all"
  on public.novedades for all
  using (public.is_admin())
  with check (public.is_admin());

create function public.set_novedades_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

create trigger novedades_before_update
  before update on public.novedades
  for each row execute function public.set_novedades_updated_at();

-- Opcional: pasá acá las 3 novedades de ejemplo que estaban hardcodeadas
-- en index.html, para no arrancar con la sección vacía.
insert into public.novedades (title, description, published_at) values
  ('Nueva señalética en el Paseo del Lago', 'Se incorporaron carteles informativos y de accesibilidad en todo el recorrido peatonal.', '2026-07-05'),
  ('CCTA suma nuevos comercios adheridos', 'Se incorporaron 6 nuevos comercios a la guía oficial de Potrero de los Funes.', '2026-06-28'),
  ('Mejoras en la costanera', 'Trabajos de mantenimiento y nueva iluminación en el sector de la Salagria.', '2026-06-15');
