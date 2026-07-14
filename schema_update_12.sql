-- ============================================================
-- Update 12: rol "presidente" de cámara (UDAER / CCTA / AEHGA).
-- Puede ver (solo lectura) los comercios adheridos a SU cámara,
-- no puede editarlos. Correr después de schema.sql + updates 01-11.
-- ============================================================

-- 1) Agrega 'presidente' a los roles permitidos.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('comercio', 'comercio_pro', 'eventos', 'presidente', 'admin'));

-- 2) Cámara que preside (solo aplica si role = 'presidente').
alter table public.profiles add column if not exists chamber text;
alter table public.profiles drop constraint if exists profiles_chamber_check;
alter table public.profiles add constraint profiles_chamber_check
  check (chamber is null or chamber in ('UDAER', 'CCTA', 'AEHGA'));

-- 3) "chamber" también es un campo protegido: solo el admin lo asigna.
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
    if new.chamber is distinct from old.chamber then
      new.chamber := old.chamber;
    end if;
  end if;

  new.is_admin := (new.role = 'admin');

  return new;
end;
$$ language plpgsql security definer;

-- 4) El presidente puede leer (no editar) las filas de business_chambers
-- de su propia cámara. Hace falta esto además de la policy de
-- businesses de abajo, porque el join necesita ver ambas tablas.
create policy "business_chambers_presidente_read_own"
  on public.business_chambers for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'presidente'
        and p.chamber = business_chambers.chamber
    )
  );

-- 5) El presidente puede leer (no editar) los comercios adheridos
-- a su cámara, en cualquier estado (para que vea también los que
-- están en revisión).
create policy "businesses_presidente_read_chamber"
  on public.businesses for select
  using (
    exists (
      select 1
      from public.business_chambers bc
      join public.profiles p on p.chamber = bc.chamber
      where bc.business_id = businesses.id
        and p.id = auth.uid()
        and p.role = 'presidente'
    )
  );
