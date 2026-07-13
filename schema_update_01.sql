-- ============================================================
-- Update 01: guardar nombre y teléfono al registrarse
-- Correr en SQL Editor DESPUÉS de schema.sql (ese ya lo corriste,
-- este es un agregado, no hace falta re-correr el original).
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;
-- El trigger on_auth_user_created ya existe y usa esta función,
-- así que no hace falta recrearlo.


-- Permitir que el dueño borre sus propias fichas (no estaba en el
-- esquema original, solo había select/insert/update).
create policy "businesses_owner_delete_own"
  on public.businesses for delete
  using (auth.uid() = owner_id);
