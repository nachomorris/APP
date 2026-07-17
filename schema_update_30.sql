-- ============================================================
-- Update 30: tracking de visitas reales al sitio (potrerovisit.com).
--
-- Hasta ahora el dashboard de admin mostraba "Total vistas" sumando
-- el views_count de la tabla events, que en realidad son las vistas
-- de la ficha de cada evento, no las visitas al sitio. Esta tabla
-- registra una fila por cada carga de página (home, agenda, ficha de
-- comercio, etc.) para poder mostrar el total real de tráfico.
--
-- No reemplaza a events.views_count / activities.views_count /
-- businesses.views_count: esos siguen midiendo vistas de fichas
-- puntuales y se usan para "más visto".
--
-- Correr en el SQL Editor después de schema.sql + updates 01-29.
-- ============================================================

create table public.site_visits (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  created_at timestamptz not null default now()
);

create index site_visits_created_at_idx on public.site_visits (created_at);

alter table public.site_visits enable row level security;

-- Cualquier visitante puede registrar su propia visita (solo se guarda
-- la ruta y la fecha/hora, sin datos personales ni de sesión).
create policy "site_visits_public_insert"
  on public.site_visits for insert
  with check (true);

-- Solo admin / master_eventos pueden leer el detalle (lo necesita el
-- dashboard para contar el total).
create policy "site_visits_admin_read"
  on public.site_visits for select
  using (public.is_admin() or public.is_master_eventos());

grant select, insert on public.site_visits to anon, authenticated;
