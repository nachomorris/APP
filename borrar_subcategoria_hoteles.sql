-- ============================================================
-- Borrar la subcategoría "hoteles" (duplicada de "hotel") en
-- alojamiento. Corré primero el Paso 1 para confirmar que está
-- vacía antes de borrar.
-- ============================================================

-- Paso 1: ver todas las subcategorías de alojamiento y cuántas
-- fichas tiene cada una. Confirmá que "hoteles" da 0.
select
  sc.id,
  sc.label,
  count(b.id) as fichas_con_esta_subcategoria
from public.subcategories sc
left join public.businesses b on b.subcategory_id = sc.id
where sc.category_id = 'alojamiento'
group by sc.id, sc.label
order by sc.label;

-- Paso 2: borrarla (correr solo si en el Paso 1 dio 0 fichas)
delete from public.subcategories
where category_id = 'alojamiento'
  and lower(label) = 'hoteles';
