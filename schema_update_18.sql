-- ============================================================
-- Update 18: bucket de Storage para la foto de portada de los
-- eventos, cargada desde admin.html con recorte en el navegador
-- (antes había que pegar una URL a mano). Solo admin/master_eventos
-- suben, igual criterio que el resto de la agenda.
--
-- Estructura de archivos: event-images/{event_id}/cover-{timestamp}.jpg
-- (en eventos nuevos, {event_id} es un id temporal generado en el
-- navegador antes de guardar, así se puede subir la foto sin
-- depender de que la fila ya exista en la base).
--
-- Correr en el SQL Editor después de schema.sql + updates 01-17.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

create policy "event_images_public_read"
  on storage.objects for select
  using (bucket_id = 'event-images');

create policy "event_images_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'event-images' and (public.is_admin() or public.is_master_eventos()));

create policy "event_images_admin_update"
  on storage.objects for update
  using (bucket_id = 'event-images' and (public.is_admin() or public.is_master_eventos()));

create policy "event_images_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'event-images' and (public.is_admin() or public.is_master_eventos()));
