-- ============================================================
-- Update 25: mueve la categoría "Salud" al final del orden de
-- íconos (el que tenga el sort_order más alto queda último).
--
-- Calculado a partir de los valores actuales, no importa qué
-- sort_order tenga hoy cada categoría.
--
-- Correr en el SQL Editor después de schema.sql + updates 01-24.
-- ============================================================

update public.categories
set sort_order = (select max(sort_order) from public.categories) + 1
where id = 'salud';
