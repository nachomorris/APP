-- ============================================================
-- Update 09: bucket de Storage para las fotos de portada de
-- cada ficha (business-images), con recorte 4:3 hecho en el
-- navegador antes de subir.
--
-- Estructura de archivos: business-images/{business_id}/cover.jpg
-- (una sola foto de portada por ficha, se pisa cada vez que se
-- cambia). Correr en el SQL Editor después de schema.sql.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('business-images', 'business-images', true)
on conflict (id) do nothing;

-- Lectura pública (cualquiera puede ver las fotos, es lo que
-- se muestra en el catálogo).
create policy "business_images_public_read"
  on storage.objects for select
  using (bucket_id = 'business-images');

-- Solo el dueño de la ficha (o un admin) puede subir dentro de
-- la carpeta {business_id}/... de su propia ficha.
-- OJO: storage.objects.name va calificado explícitamente. Adentro
-- del EXISTS, businesses también tiene una columna "name" (el
-- nombre del comercio); un "name" sin calificar ahí adentro se
-- resuelve contra esa, no contra el archivo que se sube, y la
-- política nunca matchea con ningún business_id (bug real, ver
-- fix_business_images_rls_v2.sql).
create policy "business_images_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'business-images'
    and exists (
      select 1 from public.businesses b
      where b.id::text = (storage.foldername(storage.objects.name))[1]
        and (b.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "business_images_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'business-images'
    and exists (
      select 1 from public.businesses b
      where b.id::text = (storage.foldername(storage.objects.name))[1]
        and (b.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "business_images_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'business-images'
    and exists (
      select 1 from public.businesses b
      where b.id::text = (storage.foldername(storage.objects.name))[1]
        and (b.owner_id = auth.uid() or public.is_admin())
    )
  );
