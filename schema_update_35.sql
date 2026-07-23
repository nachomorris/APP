-- ============================================================
-- Update 35: en "Mis socios" (panel del presidente de cámara), mostrar
-- la foto de portada de cada ficha y el nombre del dueño, en modo
-- solo lectura (no se puede editar desde ahí).
--
-- Correr en el SQL Editor después de schema.sql + updates 01-34.
-- ============================================================

create or replace function public.presidente_get_socios()
returns table (
  id uuid,
  name text,
  address text,
  phone text,
  whatsapp text,
  status text,
  owner_id uuid,
  owner_role text,
  owner_email text,
  owner_full_name text,
  category_label text,
  subcategory_label text,
  images jsonb
)
language sql
security definer
stable
set search_path = public, extensions, auth
as $$
  select
    b.id, b.name, b.address, b.phone, b.whatsapp, b.status,
    b.owner_id, p.role as owner_role, p.email as owner_email,
    p.full_name as owner_full_name,
    c.label as category_label, sc.label as subcategory_label,
    b.images
  from public.businesses b
  join public.business_chambers bc on bc.business_id = b.id
  join public.profiles caller on caller.id = auth.uid() and caller.role = 'presidente'
  left join public.profiles p on p.id = b.owner_id
  left join public.categories c on c.id = b.category_id
  left join public.subcategories sc on sc.id = b.subcategory_id
  where bc.chamber = caller.chamber
  order by b.name;
$$;

grant execute on function public.presidente_get_socios() to authenticated;
