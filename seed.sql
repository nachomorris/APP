-- ============================================================
-- Categorías de EJEMPLO para poder probar el panel end-to-end.
-- Reemplazá esto por tus categorías reales (las de data.js) antes
-- de invitar a comercios de verdad — avisame y armamos el import.
-- ============================================================

insert into public.categories (id, label, sort_order) values
  ('alojamiento', 'Alojamiento', 1),
  ('gastronomia', 'Gastronomía', 2),
  ('turismo', 'Turismo y actividades', 3),
  ('servicios', 'Servicios', 4)
on conflict (id) do nothing;

insert into public.subcategories (id, category_id, label, sort_order) values
  ('cabanas', 'alojamiento', 'Cabañas', 1),
  ('hoteles', 'alojamiento', 'Hoteles', 2),
  ('camping', 'alojamiento', 'Camping', 3),
  ('restaurantes', 'gastronomia', 'Restaurantes', 1),
  ('bares', 'gastronomia', 'Bares y cafés', 2),
  ('excursiones', 'turismo', 'Excursiones', 1),
  ('deportes', 'turismo', 'Deportes acuáticos / aventura', 2)
on conflict (id) do nothing;
