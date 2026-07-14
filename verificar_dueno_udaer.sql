-- ============================================================
-- Verificación: ¿el dueño quedó bien puesto en la base, o es
-- que el panel de admin está mostrando datos viejos (sin refrescar)?
-- ============================================================

select
  b.legacy_id,
  b.name,
  b.owner_id,
  p.full_name  as perfil_nombre,
  p.phone      as perfil_telefono,
  u.email      as usuario_email
from public.businesses b
left join public.profiles p on p.id = b.owner_id
left join auth.users u on u.id = b.owner_id
where b.legacy_id in (
  'la-quebrada-apart-hotel',
  'los-naranjos',
  'la-norma-casa-en-alquiler',
  'eureka',
  'vistas-de-victoria'
)
order by b.name;
