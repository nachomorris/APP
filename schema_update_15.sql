-- ============================================================
-- Update 15: rol "master_eventos" — administra la Agenda de
-- Eventos con los mismos permisos que un admin (crear, editar,
-- aprobar, rechazar, destacar, eliminar), pero NO tiene acceso a
-- Comercios, Novedades ni Usuarios.
--
-- Correr después de schema.sql + updates 01-14 (necesita que
-- schema_update_04.sql -eventos- ya esté corrido).
-- ============================================================

-- 1) Nuevo rol permitido.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('comercio', 'comercio_pro', 'eventos', 'presidente', 'master_eventos', 'admin'));

-- 2) Helper igual que is_admin(), para no repetir el subselect en
-- cada policy.
create or replace function public.is_master_eventos()
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select role = 'master_eventos' from public.profiles where id = auth.uid()), false);
$$;

-- 3) Acceso total a eventos (igual que events_admin_all, pero para
-- este rol en vez de is_admin()).
create policy "events_master_eventos_all"
  on public.events for all
  using (public.is_master_eventos())
  with check (public.is_master_eventos());

-- 4) El trigger que protege status/is_official/is_featured/etc.
-- ahora también deja pasar a master_eventos (antes solo a is_admin()).
create or replace function public.protect_event_status()
returns trigger as $$
declare
  requester_privileged boolean;
begin
  select (public.is_admin() or public.is_master_eventos()) into requester_privileged;

  if not coalesce(requester_privileged, false) then
    if new.is_official is distinct from old.is_official then
      new.is_official := old.is_official;
    end if;
    if new.is_featured is distinct from old.is_featured then
      new.is_featured := old.is_featured;
    end if;
    if new.featured_order is distinct from old.featured_order then
      new.featured_order := old.featured_order;
    end if;
    if new.review_note is distinct from old.review_note then
      new.review_note := old.review_note;
    end if;
    if new.status is distinct from old.status and new.status not in ('draft','pending') then
      new.status := old.status;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

-- 5) Cronograma interno de eventos (event_schedule_items): mismo
-- criterio, master_eventos puede editar el de cualquier evento.
drop policy if exists "event_schedule_public_read" on public.event_schedule_items;
create policy "event_schedule_public_read"
  on public.event_schedule_items for select
  using (
    exists (
      select 1 from public.events e
      where e.id = event_id
        and (e.status = 'published' or e.owner_id = auth.uid() or public.is_admin() or public.is_master_eventos())
    )
  );

drop policy if exists "event_schedule_owner_write" on public.event_schedule_items;
create policy "event_schedule_owner_write"
  on public.event_schedule_items for all
  using (
    exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
    or public.is_admin()
    or public.is_master_eventos()
  )
  with check (
    exists (select 1 from public.events e where e.id = event_id and e.owner_id = auth.uid())
    or public.is_admin()
    or public.is_master_eventos()
  );

-- 6) También puede administrar las categorías de eventos (crear,
-- editar, borrar), igual que un admin.
drop policy if exists "event_categories_admin_write" on public.event_categories;
create policy "event_categories_admin_write"
  on public.event_categories for all
  using (public.is_admin() or public.is_master_eventos())
  with check (public.is_admin() or public.is_master_eventos());

-- 7) admin_create_user / admin_update_user_credentials: el admin
-- (o quien tenga permiso de ejecutarlas, siempre chequeando
-- is_admin() adentro) tiene que poder asignar el rol master_eventos
-- a un usuario nuevo o existente.
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
  if new_role not in ('comercio', 'comercio_pro', 'eventos', 'presidente', 'master_eventos', 'admin') then
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
