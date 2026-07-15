-- ============================================================
-- Update 19: punto de encuadre (foco) de la foto de portada de
-- los eventos. La foto se sube siempre completa y sin recortar
-- (ver update 18), pero en las tarjetas se muestra recortada con
-- object-fit:cover — este par de columnas guarda QUÉ parte de la
-- foto queda visible en ese recorte, elegida por el admin
-- tocando/arrastrando sobre la vista previa (en vez del recorte
-- destructivo anterior con Cropper).
--
-- Valores en porcentaje (0 a 100), 50/50 = centrado (default).
--
-- Correr en el SQL Editor después de schema.sql + updates 01-18.
-- ============================================================

alter table public.events
  add column if not exists cover_focal_x numeric not null default 50,
  add column if not exists cover_focal_y numeric not null default 50;

alter table public.events
  add constraint events_cover_focal_x_range check (cover_focal_x >= 0 and cover_focal_x <= 100),
  add constraint events_cover_focal_y_range check (cover_focal_y >= 0 and cover_focal_y <= 100);
