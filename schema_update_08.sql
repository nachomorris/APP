-- ============================================================
-- Update 08: "Menu Serrano" y "BNA" dejan de ser subcategorías
-- de gastronomía y pasan a ser etiquetas (como los servicios de
-- alojamiento): una ficha puede ser "Resto" Y tener el tag
-- "Menu Serrano" y/o "BNA" al mismo tiempo, cosa que no se podía
-- con subcategory_id (una sola por ficha).
--
-- Reutiliza la misma columna "amenities" text[] de schema_update_07
-- (correr ESE antes que este). Requiere correrlo después de
-- schema.sql + updates 01-07.
-- ============================================================

-- Por las dudas alguna ficha ya tenga "menu-serrano" o "bna" como
-- subcategoría (no pasaba en el catálogo original, pero puede haber
-- pasado si algún dueño la eligió después): migra ese dato al tag
-- y libera la subcategoría antes de borrarla.
update public.businesses
set amenities = array_append(amenities, 'menu_serrano'), subcategory_id = null
where subcategory_id = 'menu-serrano'
  and not ('menu_serrano' = any(amenities));

update public.businesses
set amenities = array_append(amenities, 'bna'), subcategory_id = null
where subcategory_id = 'bna'
  and not ('bna' = any(amenities));

delete from public.subcategories where id in ('menu-serrano', 'bna');
