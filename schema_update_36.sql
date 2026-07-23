-- ============================================================
-- Update 36: avisos por Telegram cuando (1) se crea un usuario nuevo,
-- (2) se crea o edita una ficha de comercio, y (3) alguien inicia
-- sesión. Todo corre adentro de Supabase (pg_net para el HTTP hacia
-- Telegram, Vault para guardar el token del bot sin exponerlo).
--
-- IMPORTANTE — antes de correr este archivo:
-- 1) Creá tu bot en Telegram hablándole a @BotFather (comando /newbot),
--    te va a dar un token con forma "123456789:AAcadena...".
-- 2) Mandale un mensaje cualquiera a tu bot nuevo (ej "hola"), así te
--    da permiso de escribirte a vos primero.
-- 3) Andá a https://api.telegram.org/bot<TU_TOKEN>/getUpdates en el
--    navegador (reemplazando <TU_TOKEN>) y buscá el número en
--    "message" -> "chat" -> "id". Ese es tu chat_id.
-- 4) En Supabase Dashboard -> Project Settings -> Vault, creá dos
--    secretos (Add new secret):
--      nombre: telegram_bot_token   valor: el token de BotFather
--      nombre: telegram_chat_id    valor: tu chat_id (como texto)
--    (Esto queda guardado encriptado en la base, no en este archivo,
--    así que aunque este .sql se suba a GitHub el token no queda
--    expuesto.)
-- 5) Recién ahí corré este archivo en el SQL Editor.
--
-- Correr en el SQL Editor después de schema.sql + updates 01-35.
-- ============================================================

create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault;

-- Función central: manda un mensaje de texto simple al chat guardado
-- en Vault. No frena la transacción que la llama (pg_net es asíncrono).
create or replace function public.notify_telegram(message text)
returns void
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_token text;
  v_chat_id text;
begin
  select decrypted_secret into v_token from vault.decrypted_secrets where name = 'telegram_bot_token';
  select decrypted_secret into v_chat_id from vault.decrypted_secrets where name = 'telegram_chat_id';

  if v_token is null or v_chat_id is null then
    -- No están cargados los secretos todavía: no rompemos nada, solo
    -- no mandamos el aviso.
    return;
  end if;

  perform net.http_post(
    url := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('chat_id', v_chat_id, 'text', message)
  );
end;
$$;

-- 1) Usuario nuevo (se crea la fila en profiles justo después de crearse
-- en auth.users, vía el trigger on_auth_user_created ya existente).
create or replace function public.trg_notify_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
begin
  perform public.notify_telegram(
    'Nuevo usuario creado' || chr(10) ||
    'Email: ' || coalesce(new.email, 'sin email') || chr(10) ||
    'Rol: ' || coalesce(new.role, 'comercio')
  );
  return new;
end;
$$;

drop trigger if exists on_profile_created_notify on public.profiles;
create trigger on_profile_created_notify
  after insert on public.profiles
  for each row execute function public.trg_notify_new_user();

-- 2) Ficha de comercio creada o editada.
create or replace function public.trg_notify_business_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_telegram('Ficha nueva creada: ' || new.name);
  else
    perform public.notify_telegram('Ficha editada: ' || new.name);
  end if;
  return new;
end;
$$;

drop trigger if exists on_business_change_notify on public.businesses;
create trigger on_business_change_notify
  after insert or update on public.businesses
  for each row execute function public.trg_notify_business_change();

-- 3) Inicio de sesión (Supabase actualiza auth.users.last_sign_in_at en
-- cada login exitoso).
create or replace function public.trg_notify_login()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_email text;
  v_role text;
begin
  select email, role into v_email, v_role from public.profiles where id = new.id;
  perform public.notify_telegram(
    'Inicio de sesión' || chr(10) ||
    'Email: ' || coalesce(v_email, new.email, 'desconocido') || chr(10) ||
    'Rol: ' || coalesce(v_role, 'comercio')
  );
  return new;
end;
$$;

drop trigger if exists on_login_notify on auth.users;
create trigger on_login_notify
  after update of last_sign_in_at on auth.users
  for each row
  when (old.last_sign_in_at is distinct from new.last_sign_in_at)
  execute function public.trg_notify_login();
