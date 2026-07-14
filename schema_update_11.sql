-- ============================================================
-- Update 11: roles de usuario (comercio / comercio_pro / eventos /
-- admin). Correr en el SQL Editor después de schema.sql + updates 01-10.
--
-- - comercio: solo administra su(s) propia(s) ficha(s) de comercio.
-- - comercio_pro: lo mismo que comercio, y además puede cargar eventos.
-- - eventos: NO puede tener fichas de comercio, solo gestiona eventos
--   (pensado para instituciones/organizadores sin comercio propio).
-- - admin: acceso total (equivale al is_admin de siempre).
--
-- Se mantiene la columna "is_admin" (la usan políticas viejas) pero
-- ahora se sincroniza sola con role='admin' vía trigger, para no
-- tener que tocar todas las policies existentes que la leen directo.
-- ============================================================

alter table public.profiles
  add column if not exists role text not null default 'comercio'
  check (role in ('comercio', 'comercio_pro', 'eventos', 'admin'));

-- Los que ya eran is_admin=true pasan a role='admin'.
update public.profiles set role = 'admin' where is_admin = true and role <> 'admin';

-- Trigger: protege is_admin/is_blocked/email/role (un usuario común
-- no se puede autopromover), y además mantiene is_admin siempre
-- sincronizado con role = 'admin'.
create or replace function public.protect_profile_fields()
returns trigger as $$
declare
  requester_is_admin boolean;
begin
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
    into requester_is_admin;

  if not requester_is_admin then
    if new.is_admin is distinct from old.is_admin then
      new.is_admin := old.is_admin;
    end if;
    if new.is_blocked is distinct from old.is_blocked then
      new.is_blocked := old.is_blocked;
    end if;
    if new.email is distinct from old.email then
      new.email := old.email;
    end if;
    if new.role is distinct from old.role then
      new.role := old.role;
    end if;
  end if;

  -- is_admin siempre refleja el role final (ya protegido arriba).
  new.is_admin := (new.role = 'admin');

  return new;
end;
$$ language plpgsql security definer;

-- 1) Un usuario con role='eventos' no puede tener fichas de comercio.
drop policy if exists "businesses_owner_insert" on public.businesses;
create policy "businesses_owner_insert"
  on public.businesses for insert
  with check (
    auth.uid() = owner_id
    and not coalesce((select is_blocked from public.profiles where id = auth.uid()), false)
    and coalesce((select role from public.profiles where id = auth.uid()), 'comercio')
        in ('comercio', 'comercio_pro', 'admin')
  );

-- (update/delete de fichas propias no cambian: si ya sos dueño de
-- una ficha, la seguís pudiendo editar/borrar aunque después te
-- cambien el rol; solo se restringe la creación de fichas nuevas.)

-- 2) Solo comercio_pro / eventos / admin pueden crear eventos nuevos
-- (un "comercio" simple no puede sumar eventos).
drop policy if exists "events_owner_insert" on public.events;
create policy "events_owner_insert"
  on public.events for insert
  with check (
    auth.uid() = owner_id
    and not coalesce((select is_blocked from public.profiles where id = auth.uid()), false)
    and coalesce((select role from public.profiles where id = auth.uid()), 'comercio')
        in ('comercio_pro', 'eventos', 'admin')
    and (public.is_admin() or status in ('draft','pending'))
    and (public.is_admin() or is_official = false)
    and (public.is_admin() or is_featured = false)
    and (
      business_id is null
      or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = auth.uid())
    )
  );
