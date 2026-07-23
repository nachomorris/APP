-- ============================================================
-- Permite que el admin suba la foto de portada ANTES de guardar
-- una ficha nueva (desde "Nueva ficha" en el panel de admin).
--
-- Hasta ahora, la política de insert exigía que ya existiera una
-- fila en "businesses" con ese id (para poder chequear el dueño).
-- Eso obligaba a guardar la ficha primero y recién después poder
-- subir la foto. Como el admin ya tiene autorización total via
-- public.is_admin(), no hace falta exigirle además que la fila ya
-- exista: para el admin alcanza con is_admin(). Para un dueño común
-- (no admin) se mantiene la exigencia de que la ficha ya sea suya.
--
-- Es seguro correr esto aunque ya hayas corrido los fixes anteriores.
-- ============================================================

drop policy if exists "business_images_owner_insert" on storage.objects;
create policy "business_images_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'business-images'
    and (
      public.is_admin()
      or exists (
        select 1 from public.businesses b
        where b.id::text = (storage.foldername(storage.objects.name))[1]
          and b.owner_id = auth.uid()
      )
    )
  );

-- Verificación.
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname = 'business_images_owner_insert';
