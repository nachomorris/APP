-- ============================================================
-- Update 21: link de Google Maps en las fichas de comercio, en
-- reemplazo de los campos latitud/longitud.
--
-- El dueño (o el municipio, o el presidente de cámara) busca el
-- comercio en Google Maps, toca "Compartir" y pega el link. El botón
-- "Cómo llegar" del sitio público usa ese link directo; si una ficha
-- vieja no tiene link cargado, se sigue usando lat/lng (si las tenía)
-- o se arma una búsqueda por dirección como último recurso — por eso
-- las columnas lat/lng NO se borran, solo dejan de mostrarse/editarse
-- en los formularios.
--
-- Correr en el SQL Editor después de schema.sql + updates 01-20.
-- ============================================================

alter table public.businesses
  add column if not exists maps_link text;
