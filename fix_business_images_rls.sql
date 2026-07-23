-- ============================================================
-- Fix: "No se pudo subir la foto: new row violates row-level
-- security policy" al cambiar la foto de un comercio desde el
-- admin.
--
-- Corre dos arreglos independientes (los dos son seguros de
-- correr aunque ya esté todo bien, no rompen nada):
--
-- 1) Asegura que el bucket "business-images" y sus 4 políticas
--    (lectura pública, insert/update/delete del dueño o admin)
--    existan tal cual las definió schema_update_09.sql. Si por
--    algún motivo esa migración nunca se corrió del todo (o se
--    corrió antes de que existiera la tabla businesses, etc.),
--    esto las vuelve a crear.
--
-- 2) Recalcula profiles.is_admin a partir de profiles.role para
--    TODOS los usuarios. Normalmente estas dos columnas se
--    mantienen sincronizadas solas vía trigger (ver
--    schema_update_11.sql), pero ese trigger solo se dispara en
--    UPDATE. Si alguna cuenta de admin se creó o se promovió con
--    un INSERT/UPDATE directo por SQL (fuera de la pantalla de
--    Usuarios), pudo quedar con role='admin' pero is_admin=false,
--    y ahí es donde fallan las políticas que chequean is_admin()
--    (como la de subir fotos).
-- ============================================================

-- 1) Bucket + políticas de business-images ----------------------
insert into storage.buckets (id, name, public)
values ('business-images', 'business-images', true)
on conflict (id) do nothing;

drop policy if exists "business_images_public_read" on storage.objects;
create policy "business_images_public_read"
  on storage.objects for select
  using (bucket_id = 'business-images');

drop policy if exists "business_images_owner_insert" on storage.objects;
create policy "business_images_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'business-images'
    and exists (
      select 1 from public.businesses b
      where b.id::text = (storage.foldername(name))[1]
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
      where b.id::text = (storage.foldername(name))[1]
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
      where b.id::text = (storage.foldername(name))[1]
        and (b.owner_id = auth.uid() or public.is_admin())
    )
  );

-- 2) Resincroniza is_admin con role para todos los perfiles -----
update public.profiles
set is_admin = (role = 'admin')
where is_admin is distinct from (role = 'admin');

-- 3) Diagnóstico: mostrá esto para confirmar que tu usuario
--    admin ahora tiene is_admin = true. Reemplazá el email si
--    hace falta.
select id, email, full_name, role, is_admin, is_blocked
from public.profiles
order by role, email;
