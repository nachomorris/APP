-- ============================================================
-- Update 28: el rol "master_eventos" también administra
-- "Actividades" (deportivas/culturales), con los mismos permisos
-- que ya tiene sobre Eventos (crear, editar, aprobar, destacar,
-- eliminar). Hasta ahora la tabla "activities" (schema_update_26.sql)
-- solo le daba ese permiso a is_admin(), por eso un usuario
-- master_eventos podía entrar a editar una actividad y el guardado
-- fallaba en silencio (RLS bloqueaba el update sin tirar error).
--
-- Correr después de schema_update_26.sql (y 15, que crea
-- is_master_eventos()).
-- ============================================================

drop policy if exists "activities_admin_all" on public.activities;
create policy "activities_admin_all"
  on public.activities for all
  using (public.is_admin() or public.is_master_eventos())
  with check (public.is_admin() or public.is_master_eventos());

drop policy if exists "activity_schedule_public_read" on public.activity_schedule_items;
create policy "activity_schedule_public_read"
  on public.activity_schedule_items for select
  using (
    exists (
      select 1 from public.activities a
      where a.id = activity_id
        and (a.status = 'published' or public.is_admin() or public.is_master_eventos())
    )
  );

drop policy if exists "activity_schedule_admin_write" on public.activity_schedule_items;
create policy "activity_schedule_admin_write"
  on public.activity_schedule_items for all
  using (public.is_admin() or public.is_master_eventos())
  with check (public.is_admin() or public.is_master_eventos());

-- Storage: bucket "activity-images" (subir/cambiar/borrar fotos de portada).
drop policy if exists "activity_images_admin_insert" on storage.objects;
create policy "activity_images_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'activity-images' and (public.is_admin() or public.is_master_eventos()));

drop policy if exists "activity_images_admin_update" on storage.objects;
create policy "activity_images_admin_update"
  on storage.objects for update
  using (bucket_id = 'activity-images' and (public.is_admin() or public.is_master_eventos()));

drop policy if exists "activity_images_admin_delete" on storage.objects;
create policy "activity_images_admin_delete"
  on storage.objects for delete
  using (bucket_id = 'activity-images' and (public.is_admin() or public.is_master_eventos()));
