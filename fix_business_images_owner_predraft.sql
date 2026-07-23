-- ============================================================
-- Extiende el fix anterior (que solo permitía subir la foto antes
-- de guardar para el admin) a los comerciantes también: en el
-- panel (panel.html), "Nueva ficha" ahora también genera el id en
-- el navegador antes de guardar, así que necesita el mismo permiso.
--
-- Regla: se permite subir una foto bajo un business_id que TODAVÍA
-- NO existe como fila en "businesses" (es un id recién generado,
-- al azar, para una ficha en borrador) a cualquier usuario logueado
-- y no bloqueado. Si la fila YA existe, se sigue exigiendo que sea
-- el dueño (o admin). No hay riesgo real: el id es un UUID al azar
-- que nadie más puede adivinar, así que como mucho alguien podría
-- subir una foto "huérfana" bajo un id que nunca se llega a usar.
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
      or not exists (
        select 1 from public.businesses b
        where b.id::text = (storage.foldername(storage.objects.name))[1]
      )
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
