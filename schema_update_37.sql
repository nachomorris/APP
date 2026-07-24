-- ============================================================
-- Update 37: los comerciantes (no solo admin/master_eventos) ya
-- pueden subir la foto de portada y la galería de SUS PROPIOS eventos
-- desde "Mis eventos" en panel.html. Antes el bucket "event-images"
-- solo dejaba subir a admin/master_eventos, así que el panel de
-- comercio solo tenía un campo de texto para pegar una URL a mano.
--
-- Mismo criterio ya usado para business-images (updates de fotos de
-- fichas): se permite subir si (a) sos admin/master_eventos, (b) el
-- evento todavía no existe en la base (evento nuevo, se sube la foto
-- antes de guardar usando un id temporal generado en el navegador), o
-- (c) el evento ya existe y sos vos el dueño (owner_id).
--
-- Correr en el SQL Editor después de schema.sql + updates 01-36.
-- ============================================================

drop policy if exists "event_images_admin_insert" on storage.objects;
create policy "event_images_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'event-images' and (
      public.is_admin() or public.is_master_eventos()
      or not exists (
        select 1 from public.events ev
        where ev.id::text = (storage.foldername(storage.objects.name))[1]
      )
      or exists (
        select 1 from public.events ev
        where ev.id::text = (storage.foldername(storage.objects.name))[1]
        and ev.owner_id = auth.uid()
      )
    )
  );

drop policy if exists "event_images_admin_update" on storage.objects;
create policy "event_images_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'event-images' and (
      public.is_admin() or public.is_master_eventos()
      or exists (
        select 1 from public.events ev
        where ev.id::text = (storage.foldername(storage.objects.name))[1]
        and ev.owner_id = auth.uid()
      )
    )
  );

drop policy if exists "event_images_admin_delete" on storage.objects;
create policy "event_images_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'event-images' and (
      public.is_admin() or public.is_master_eventos()
      or exists (
        select 1 from public.events ev
        where ev.id::text = (storage.foldername(storage.objects.name))[1]
        and ev.owner_id = auth.uid()
      )
    )
  );
