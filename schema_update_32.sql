-- ============================================================
-- Update 32: eliminar usuarios desde el panel de admin.
--
-- Hasta ahora solo se podía bloquear una cuenta, no borrarla del
-- todo. Esta función la elimina de auth.users (lo que borra en
-- cascada su fila en profiles, por el "on delete cascade" del
-- esquema original).
--
-- OJO con la cascada: businesses.owner_id, events.owner_id y
-- activities.owner_id también son "on delete cascade" contra
-- profiles — si el usuario todavía tiene fichas/eventos/actividades
-- a su nombre, borrarlo se llevaría eso puesto. Por eso la función
-- se niega a borrar si el usuario todavía tiene algo asociado: hay
-- que reasignarlo primero (con "Asignar ficha existente" en el
-- panel de usuarios) o borrar esas fichas a mano si corresponde.
--
-- Correr en el SQL Editor después de schema.sql + updates 01-31.
-- ============================================================

create or replace function public.admin_delete_user(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  biz_count int;
  event_count int;
  activity_count int;
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'No podés eliminar tu propia cuenta.';
  end if;

  select count(*) into biz_count from public.businesses where owner_id = target_user_id;
  select count(*) into event_count from public.events where owner_id = target_user_id;
  select count(*) into activity_count from public.activities where owner_id = target_user_id;

  if biz_count > 0 or event_count > 0 or activity_count > 0 then
    raise exception 'Este usuario todavía tiene % ficha(s), % evento(s) y % actividad(es) asociadas. Reasignalas o eliminalas antes de borrar la cuenta.',
      biz_count, event_count, activity_count;
  end if;

  delete from auth.users where id = target_user_id;
end;
$$;

grant execute on function public.admin_delete_user(uuid) to authenticated;
