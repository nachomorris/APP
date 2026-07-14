-- ============================================================
-- Update 07: servicios/amenities de alojamiento (wifi, piscina, etc)
-- Correr en el SQL Editor después de schema.sql + updates 01-06.
--
-- Se guarda como un array de texto en la propia ficha (no hace
-- falta una tabla aparte: son 9 opciones fijas y una ficha puede
-- tener varias). Sirve para cualquier categoría, pero por ahora
-- solo se usa/edita en alojamiento.
-- ============================================================

alter table public.businesses
  add column if not exists amenities text[] not null default '{}';

-- Índice GIN para que filtrar "¿tiene wifi Y piscina?" sea rápido
-- (operadores && / @> sobre arrays).
create index if not exists businesses_amenities_idx
  on public.businesses using gin (amenities);
