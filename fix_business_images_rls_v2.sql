-- ============================================================
-- Fix real: el bug estaba en storage.foldername(name) — dentro
-- del EXISTS, "name" quedaba resuelto contra businesses.name (el
-- nombre del comercio) en vez de contra storage.objects.name (el
-- archivo que se sube), porque las dos tablas tienen una columna
-- "name" y la del subquery le ganaba por cercanía. Nunca iba a
-- coincidir con ningún business_id, para ninguna ficha.
--
-- Este script reemplaza las 3 políticas afectadas (insert/update/
-- delete) calificando explícitamente storage.objects.name.
-- Es seguro correrlo aunque ya hayas corrido el fix anterior.
-- ============================================================

drop policy if exists "business_images_owner_insert" on storage.objects;
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

drop policy if exists "business_images_owner_update" on storage.objects;
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

drop policy if exists "business_images_owner_delete" on storage.objects;
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

-- Verificación: confirmá que ahora dice storage.objects.name (no
-- b.name) en la columna with_check/qual.
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'business_images%';
