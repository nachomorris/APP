-- ============================================================
-- Update 24: renombra la categoría "Turismo" a "Experiencias" y
-- agrega/reordena "Comercios" y "Servicios" justo al lado, para que
-- en la grilla de íconos del home queden en este orden:
-- ... Experiencias, Comercios, Servicios ...
--
-- Los sort_order de "Comercios" y "Servicios" se calculan a partir
-- del de "Experiencias" (ex Turismo), así que este script funciona
-- sin importar los valores actuales de la tabla.
--
-- Correr en el SQL Editor después de schema.sql + updates 01-23.
-- ============================================================

-- 1) Renombra "Turismo" -> "Experiencias" (mismo id 'turismo', no
-- rompe las fichas que ya tengan category_id = 'turismo').
update public.categories set label = 'Experiencias' where id = 'turismo';

-- 2) Crea "Comercios" si todavía no existe, justo después de
-- Experiencias en el orden.
insert into public.categories (id, label, icon, color, sort_order)
values (
  'comercios',
  'Comercios',
  '🛍️',
  '#111111',
  (select sort_order from public.categories where id = 'turismo') + 1
)
on conflict (id) do update set
  label = excluded.label,
  sort_order = excluded.sort_order;

-- 3) "Servicios" pasa a ubicarse justo después de "Comercios".
update public.categories
set sort_order = (select sort_order from public.categories where id = 'comercios') + 1
where id = 'servicios';
