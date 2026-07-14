-- ============================================================
-- Update 10: sección "Usuarios" en el admin (ver todos los
-- usuarios registrados + bloquear/desbloquear su acceso).
-- Correr en el SQL Editor después de schema.sql + updates 01-09.
-- ============================================================

-- 1) Nuevas columnas en profiles ---------------------------------
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists is_blocked boolean not null default false;

-- Completa el email de las cuentas que ya existían (las nuevas lo
-- van a traer solas gracias al trigger actualizado más abajo).
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- El trigger de alta ahora también guarda el email.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- 2) Protege is_admin / is_blocked / email: un usuario común solo
-- puede tocar su nombre/teléfono desde "Mi cuenta". Si alguien
-- intenta cambiarse a sí mismo is_admin o is_blocked "a mano"
-- (por ejemplo llamando la API directo, no desde la pantalla),
-- el trigger lo revierte silenciosamente. Solo el admin puede
-- tocar esos 3 campos.
create or replace function public.protect_profile_fields()
returns trigger as $$
begin
  if not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    if new.is_admin is distinct from old.is_admin then
      new.is_admin := old.is_admin;
    end if;
    if new.is_blocked is distinct from old.is_blocked then
      new.is_blocked := old.is_blocked;
    end if;
    if new.email is distinct from old.email then
      new.email := old.email;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_before_update on public.profiles;
create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- 3) El admin puede ver y editar cualquier perfil (antes solo
-- podía leerlos; hacía falta esto para poder bloquear/desbloquear
-- la cuenta de otro usuario).
drop policy if exists "profiles_admin_read_all" on public.profiles;
create policy "profiles_admin_all"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- 4) Un usuario bloqueado no puede crear/editar/borrar sus fichas
-- ni sus eventos (aunque conserve la sesión iniciada).
drop policy if exists "businesses_owner_insert" on public.businesses;
create policy "businesses_owner_insert"
  on public.businesses for insert
  with check (
    auth.uid() = owner_id
    and not coalesce((select is_blocked from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "businesses_owner_update_own" on public.businesses;
create policy "businesses_owner_update_own"
  on public.businesses for update
  using (
    auth.uid() = owner_id
    and not coalesce((select is_blocked from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "businesses_owner_delete_own" on public.businesses;
create policy "businesses_owner_delete_own"
  on public.businesses for delete
  using (
    auth.uid() = owner_id
    and not coalesce((select is_blocked from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "events_owner_insert" on public.events;
create policy "events_owner_insert"
  on public.events for insert
  with check (
    auth.uid() = owner_id
    and not coalesce((select is_blocked from public.profiles where id = auth.uid()), false)
    and (public.is_admin() or status in ('draft','pending'))
    and (public.is_admin() or is_official = false)
    and (public.is_admin() or is_featured = false)
    and (
      business_id is null
      or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
    )
  );

drop policy if exists "events_owner_update_own" on public.events;
create policy "events_owner_update_own"
  on public.events for update
  using (
    auth.uid() = owner_id
    and not coalesce((select is_blocked from public.profiles where id = auth.uid()), false)
  );

drop policy if exists "events_owner_delete_own" on public.events;
create policy "events_owner_delete_own"
  on public.events for delete
  using (
    auth.uid() = owner_id
    and not coalesce((select is_blocked from public.profiles where id = auth.uid()), false)
  );
