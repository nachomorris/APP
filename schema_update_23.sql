-- ============================================================
-- Update 23: arregla la recursión infinita que produjo el update 22.
--
-- Qué pasó: la policy de update 20 (businesses_presidente_update_chamber)
-- consulta business_chambers desde una policy de "businesses". La
-- policy nueva de update 22 (business_chambers_public_read_published)
-- consulta "businesses" desde una policy de business_chambers. Postgres
-- evalúa esas subconsultas respetando el RLS de la tabla consultada, así
-- que las dos policies se llaman una a la otra en bucle infinito
-- ("infinite recursion detected in policy for relation businesses").
--
-- Mismo problema (y misma solución) que ya se había resuelto en el
-- update 02 para "profiles": una función security definer que
-- consulta la tabla saltando el RLS, en vez de una subconsulta directa
-- que vuelve a disparar las policies de esa tabla.
--
-- Correr en el SQL Editor después de schema.sql + updates 01-22.
-- ============================================================

create or replace function public.is_business_published(bid uuid)
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select status = 'published' from public.businesses where id = bid), false);
$$;

drop policy if exists "business_chambers_public_read_published" on public.business_chambers;

create policy "business_chambers_public_read_published"
  on public.business_chambers for select
  using (public.is_business_published(business_id));
