-- ============================================================
-- Update 13: permite al admin cambiar el email y/o la contraseña
-- de cualquier usuario desde el panel de admin, sin necesitar la
-- service_role key (el frontend solo usa la clave anon/pública).
--
-- Es una función "security definer": corre con permisos elevados
-- (puede tocar auth.users/auth.identities), pero adentro chequea
-- que quien la llama sea admin, así que un usuario común no puede
-- usarla para nada aunque la tenga "grant execute".
--
-- Correr después de schema.sql + updates 01-12.
-- ============================================================

create or replace function public.admin_update_user_credentials(
  target_user_id uuid,
  new_email text default null,
  new_password text default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar el email o la contraseña de otro usuario.';
  end if;

  if new_email is not null and new_email <> '' then
    update auth.users
      set email = new_email, updated_at = now()
      where id = target_user_id;

    update auth.identities
      set identity_data = jsonb_set(coalesce(identity_data, '{}'::jsonb), '{email}', to_jsonb(new_email)),
          updated_at = now()
      where user_id = target_user_id and provider = 'email';

    update public.profiles
      set email = new_email
      where id = target_user_id;
  end if;

  if new_password is not null and new_password <> '' then
    update auth.users
      set encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = now()
      where id = target_user_id;
  end if;
end;
$$;

grant execute on function public.admin_update_user_credentials(uuid, text, text) to authenticated;
