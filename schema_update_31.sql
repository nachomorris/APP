-- ============================================================
-- Update 31: mostrar "último inicio de sesión" y "cuenta creada el"
-- en la ficha de cada usuario, dentro de admin > Usuarios.
--
-- auth.users guarda last_sign_in_at automáticamente en cada login,
-- pero ese esquema no es accesible directo desde el cliente (anon/
-- authenticated no tienen permiso sobre auth.*). Esta función
-- security definer expone solo esos dos campos, solo para admin.
--
-- Correr en el SQL Editor después de schema.sql + updates 01-30.
-- ============================================================

create or replace function public.admin_list_user_logins()
returns table (id uuid, last_sign_in_at timestamptz, auth_created_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede ver esta información.';
  end if;

  return query
    select u.id, u.last_sign_in_at, u.created_at
    from auth.users u;
end;
$$;

grant execute on function public.admin_list_user_logins() to authenticated;
