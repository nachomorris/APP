-- Mirá quién es exactamente el usuario nuevo: email, cuándo se
-- registró, si confirmó el email, y si tiene alguna ficha asociada.
select
  p.id,
  p.email,
  p.full_name,
  p.phone,
  p.role,
  p.is_admin,
  p.is_blocked,
  p.created_at as perfil_creado,
  u.email_confirmed_at,
  u.last_sign_in_at,
  (select count(*) from public.businesses b where b.owner_id = p.id) as fichas_propias
from public.profiles p
join auth.users u on u.id = p.id
order by p.created_at desc
limit 10;
