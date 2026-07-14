-- ============================================================
-- Diagnóstico: por qué no se crean los usuarios de UDAER
--
-- El script anterior (v2) atrapaba el error de cada usuario con
-- un "exception when others" para que uno solo no frenara a los
-- demás. Pero eso también tiene un costo: si TODOS fallan por la
-- misma razón, el script igual termina en "Success" en el SQL
-- Editor, porque el error queda silenciado como un simple aviso
-- (RAISE NOTICE) en vez de mostrarse como error. Por eso no vemos
-- qué está pasando realmente.
--
-- Corré estos dos pasos, EN ESTE ORDEN, y pasame el resultado
-- (sobre todo si el paso 2 tira un error en rojo).
-- ============================================================

-- Paso 1: ¿ya existe alguno de estos usuarios? (debería dar 0)
select count(*) as usuarios_ya_creados
from auth.users
where email in (
  'laquebrada.apartamentos@gmail.com',
  'danityles@gmail.com',
  'petilucero@hotmail.com'
);

-- Paso 2: prueba con UN solo usuario, SIN atrapar el error,
-- para que si algo falla lo veamos tal cual (mensaje completo en rojo).
do $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  set local search_path = public, extensions;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
    'prueba-udaer-test@example.com', crypt('UDAER', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', 'Usuario de prueba', 'phone', ''),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_user_id, v_user_id::text,
    jsonb_build_object('sub', v_user_id::text, 'email', 'prueba-udaer-test@example.com'),
    'email', now(), now(), now()
  );

  raise notice 'OK, usuario de prueba creado con id %', v_user_id;
end $$;

-- Si el paso 2 salió bien, confirmá que quedó el perfil y borralo:
select * from public.profiles where id in (
  select id from auth.users where email = 'prueba-udaer-test@example.com'
);

-- Limpieza del usuario de prueba (correr solo si el paso 2 funcionó):
-- delete from auth.users where email = 'prueba-udaer-test@example.com';
