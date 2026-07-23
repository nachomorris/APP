-- ============================================================
-- Update 33: "Generar link de ingreso" para un usuario, desde el
-- panel de admin. En vez de depender del mail (que tiene límites
-- de envío bajos por default en Supabase), el admin genera un link
-- de un solo uso que puede mandar por WhatsApp o donde quiera. Al
-- abrirlo, el usuario elige su contraseña por primera vez y entra
-- directo a su perfil.
--
-- Correr en el SQL Editor después de schema.sql + updates 01-32.
-- ============================================================

create table public.invite_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at timestamptz
);

-- RLS habilitado y sin ninguna política: nadie lee ni escribe esta
-- tabla directamente, solo a través de las dos funciones de abajo
-- (que corren con permisos elevados vía security definer).
alter table public.invite_tokens enable row level security;

-- El admin genera el token para un usuario puntual.
create or replace function public.admin_create_invite_link(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_token text;
begin
  if not public.is_admin() then
    raise exception 'No autorizado.';
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

grant execute on function public.admin_create_invite_link(uuid) to authenticated;

-- El usuario (todavía sin sesión) canjea el token y fija su contraseña.
-- Devuelve el email para que el frontend pueda loguearlo enseguida con
-- signInWithPassword (así entra con una sesión real, no inventada).
create or replace function public.redeem_invite_token(p_token text, new_password text)
returns text
language plpgsql
security definer
set search_path = public, extensions, auth
as $$
declare
  v_row record;
  v_email text;
begin
  if new_password is null or length(new_password) < 6 then
    raise exception 'La contraseña tiene que tener al menos 6 caracteres.';
  end if;

  select * into v_row from public.invite_tokens where token = p_token;

  if v_row is null then
    raise exception 'Este link no es válido.';
  end if;
  if v_row.used_at is not null then
    raise exception 'Este link ya fue usado. Pedile al administrador uno nuevo.';
  end if;
  if v_row.expires_at < now() then
    raise exception 'Este link venció. Pedile al administrador uno nuevo.';
  end if;

  select email into v_email from auth.users where id = v_row.user_id;

  update auth.users
    set encrypted_password = crypt(new_password, gen_salt('bf')),
        email_confirmed_at = coalesce(email_confirmed_at, now()),
        updated_at = now()
    where id = v_row.user_id;

  update public.invite_tokens set used_at = now() where token = p_token;

  return v_email;
end;
$$;

grant execute on function public.redeem_invite_token(text, text) to anon, authenticated;
