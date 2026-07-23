-- ============================================================
-- Update 34: el presidente de cámara también puede mandarles el
-- link de ingreso a sus socios (comercios de su propia cámara),
-- tanto si ya tienen cuenta propia como si todavía figuran a
-- nombre del admin (los que se cargaron sin dueño real todavía).
--
-- Correr en el SQL Editor después de schema.sql + updates 01-33.
-- ============================================================

-- 1) Reemplaza admin_create_invite_link: ahora también autoriza a un
-- presidente, pero SOLO para un usuario que sea dueño de al menos un
-- comercio de su propia cámara. Se renombra a create_invite_link para
-- reflejar que ya no es exclusivo del admin (si algo en el frontend
-- todavía llama a admin_create_invite_link, hay que actualizarlo).
drop function if exists public.admin_create_invite_link(uuid);

create or replace function public.create_invite_link(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_token text;
  v_caller_chamber text;
begin
  if not public.is_admin() then
    select chamber into v_caller_chamber
    from public.profiles
    where id = auth.uid() and role = 'presidente';

    if v_caller_chamber is null then
      raise exception 'No autorizado.';
    end if;

    if not exists (
      select 1
      from public.businesses b
      join public.business_chambers bc on bc.business_id = b.id
      where b.owner_id = target_user_id and bc.chamber = v_caller_chamber
    ) then
      raise exception 'Ese usuario no es socio de tu cámara.';
    end if;
  end if;

  if not exists (select 1 from auth.users where id = target_user_id) then
    raise exception 'Usuario no encontrado.';
  end if;

  v_token := encode(gen_random_bytes(24), 'hex');

  insert into public.invite_tokens (token, user_id)
  values (v_token, target_user_id);

  return v_token;
end;
$$;

grant execute on function public.create_invite_link(uuid) to authenticated;

-- 2) Nueva función: el presidente crea la cuenta de un socio que
-- todavía no tiene una propia, y de paso la deja asignada como dueña
-- del comercio y devuelve directo el token de ingreso.
create or replace function public.presidente_create_socio_account(
  p_business_id uuid,
  new_email text,
  new_full_name text default null,
  new_phone text default null
)
returns text
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_caller_chamber text;
  v_user_id uuid;
  v_token text;
  v_random_password text;
begin
  select chamber into v_caller_chamber
  from public.profiles
  where id = auth.uid() and role = 'presidente';

  if v_caller_chamber is null then
    raise exception 'No autorizado.';
  end if;

  if not exists (
    select 1 from public.business_chambers bc
    where bc.business_id = p_business_id and bc.chamber = v_caller_chamber
  ) then
    raise exception 'Ese comercio no es socio de tu cámara.';
  end if;

  if new_email is null or new_email = '' then
    raise exception 'El email es obligatorio.';
  end if;
  if exists (select 1 from auth.users where email = new_email) then
    raise exception 'Ya existe un usuario registrado con ese email.';
  end if;

  v_random_password := encode(gen_random_bytes(18), 'hex');
  v_user_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    new_email, crypt(v_random_password, gen_salt('bf')),
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

  -- el trigger on_auth_user_created ya creó la fila en profiles; el
  -- rol por default (comercio) queda bien para un socio.
  update public.businesses set owner_id = v_user_id where id = p_business_id;

  v_token := encode(gen_random_bytes(24), 'hex');
  insert into public.invite_tokens (token, user_id) values (v_token, v_user_id);

  return v_token;
end;
$$;

grant execute on function public.presidente_create_socio_account(uuid, text, text, text) to authenticated;

-- 3) El presidente necesita saber si cada socio ya tiene cuenta propia
-- o todavía figura a nombre del admin (para saber si mostrarle "crear
-- cuenta" o "generar link"). La tabla profiles no le deja leer perfiles
-- ajenos por RLS (a propósito), así que en vez de abrir una política
-- nueva ahí, esta función le devuelve solo lo necesario ya calculado.
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
  category_label text,
  subcategory_label text
)
language sql
security definer
stable
set search_path = public, extensions, auth
as $$
  select
    b.id, b.name, b.address, b.phone, b.whatsapp, b.status,
    b.owner_id, p.role as owner_role, p.email as owner_email,
    c.label as category_label, sc.label as subcategory_label
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
