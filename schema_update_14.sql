-- ============================================================
-- Update 14: permite crear usuarios directo desde el admin (sin
-- necesitar la service_role key). Misma lógica de seguridad que
-- admin_update_user_credentials: la función corre con permisos
-- elevados, pero adentro chequea que quien la llama sea admin.
--
-- Correr después de schema.sql + updates 01-13.
-- ============================================================

create or replace function public.admin_create_user(
  new_email text,
  new_password text,
  new_full_name text default null,
  new_phone text default null,
  new_role text default 'comercio',
  new_chamber text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede crear usuarios.';
  end if;

  if new_email is null or new_email = '' then
    raise exception 'El email es obligatorio.';
  end if;
  if new_password is null or length(new_password) < 6 then
    raise exception 'La contraseña tiene que tener al menos 6 caracteres.';
  end if;
  if exists (select 1 from auth.users where email = new_email) then
    raise exception 'Ya existe un usuario registrado con ese email.';
  end if;
  if new_role not in ('comercio', 'comercio_pro', 'eventos', 'presidente', 'admin') then
    raise exception 'Rol inválido: %', new_role;
  end if;
  if new_role = 'presidente' and coalesce(new_chamber, '') = '' then
    raise exception 'Elegí qué cámara preside este usuario.';
  end if;

  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    new_email, crypt(new_password, gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', new_full_name, 'phone', new_phone),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', new_email),
    'email', now(), now(), now()
  );

  -- el trigger on_auth_user_created ya creó la fila en profiles
  -- (con full_name/phone/email); acá le seteamos el role/chamber.
  update public.profiles
    set role = new_role,
        chamber = case when new_role = 'presidente' then new_chamber else null end
    where id = v_user_id;

  return v_user_id;
end;
$$;

grant execute on function public.admin_create_user(text, text, text, text, text, text) to authenticated;
