-- ============================================================
-- Alta + usuarios de AEHGA (mismo patrón que UDAER, clave: aehga)
--
-- 1) Crea las 11 fichas de gastronomía que faltaban.
-- 2) Crea un usuario por cada mail único (clave 'aehga') y le
--    asigna su/s comercio/s. Si el mail ya existe (por ej. el
--    dueño de 'Lo De Vito' ya tiene cuenta por UDAER con otro
--    comercio), NO se toca su contraseña: solo se le suma esta
--    ficha nueva a su cuenta existente.
-- 3) Marca las 27 fichas como AEHGA en business_chambers.
--
-- Es seguro correr el archivo completo (todo es idempotente).
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- 1) Altas: fichas de gastronomía que no existían ------------
insert into public.businesses (legacy_id, name, category_id, phone, email, status, open, owner_id) values
  ('cafe-al-paso-agustin', 'Café Al Paso Agustín', 'gastronomia', '+5492664743213', 'cafealpasoagustin@gmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1)),
  ('montini-resto', 'Montini', 'gastronomia', '+5492614713641', 'zeladapv@gmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1)),
  ('gales', 'Gales', 'gastronomia', '+5492664323073', 'cymasas222@gmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1)),
  ('hola-bondiola', 'Hola Bondiola', 'gastronomia', '+5491162075632', 'juan.crudele1@gmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1)),
  ('matil-nery-la-mulata', 'Matil Nery La Mulata De Los Ricos Sabores Caseros', 'gastronomia', '+5492665294340', 'guillermoparra02@gmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1)),
  ('que-rico', 'Que Rico', 'gastronomia', '+5492664755734', 'quericocarritobar@gmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1)),
  ('heladeria-yo-helados', 'Heladeria Yo Helados', 'gastronomia', '+5492664582652', 'luciasoledadsaa@gmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1)),
  ('rotiseria-july', 'Rotisería July', 'gastronomia', '+5491137761432', 'pereafernandosergio@gmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1)),
  ('tostadero-puntano', 'Tostadero Puntano', 'gastronomia', '+5492664748431', 'hotelpuntano@gmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1)),
  ('fabrica-de-alfajor-puntano', 'Fabrica De Alfajor Puntano', 'gastronomia', '+5492664748431', 'hotelpuntano@gmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1)),
  ('destileria-eternal', 'Destilería Eternal', 'gastronomia', '+5492665030555', 'marcosjavierdiep@gmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1))
on conflict (legacy_id) do nothing;

-- 2) Un usuario por cada dueño único de la planilla AEHGA (clave: aehga) ----
do $$
declare
  r record;
  v_user_id uuid;
  v_created boolean;
begin
  set local search_path = public, extensions;

  for r in
    select * from (values
      ('cafealpasoagustin@gmail.com', 'Bergamin Mariana', '+5492664743213', array['cafe-al-paso-agustin']),
      ('florsaragiotto@hotmail.com', 'Florencia Saragiotto', '+5492664905524', array['lo-de-vito']),
      ('josuko16@gmail.com', 'Josue Eamnuel Gonzalez', '+5492664707182', array['casa-de-las-flores']),
      ('zeladapv@gmail.com', 'Zelada Paula', '+5492614713641', array['montini-resto']),
      ('cymasas222@gmail.com', 'Cyma Das', '+5492664323073', array['gales']),
      ('elchegonzalo@gmail.com', 'Gonzalo Gastón Romero Costa', '+5492664886777', array['parrilla-don-juan']),
      ('ventas@gineternal.com', 'Mariela Thimental', '+5492665030552', array['gin-eternal']),
      ('juan.crudele1@gmail.com', 'Juan Pablo Crudele', '+5491162075632', array['hola-bondiola']),
      ('informes@altosdealiwen.com', 'Monica Grecco', '+5492665006249', array['apart-altos-de-aliwen']),
      ('dpregiosrl@gmail.com', 'Dp Regio Srl', '+5492664302349', array['lunamakena']),
      ('elmalonsrl@gmail.com', 'El Malon Srl', '+5492664858404', array['el-malon']),
      ('administracion@hotelpotrero.sanluis.gov.ar', 'Hotel Potrero De Los Funes', '+5492664881911', array['hotel-potrero-de-los-funes']),
      ('aguamansasanluis@gmail.com', 'Maria Valeria Velasco Videla', '+5492664851673', array['aguamansa-apart-hotel']),
      ('guillermoparra02@gmail.com', 'Matil Nery', '+5492665294340', array['matil-nery-la-mulata']),
      ('quericocarritobar@gmail.com', 'Nataly Valenzuela', '+5492664755734', array['que-rico']),
      ('luciasoledadsaa@gmail.com', 'Lucia Soledad Saa', '+5492664582652', array['heladeria-yo-helados']),
      ('complejodellago@hotmail.com', 'Complejo Del Lago Srl', '+5492664703295', array['complejo-del-lago']),
      ('ngalanti94@gmail.com', 'Nicolas Galanti', '+5492664262335', array['romanito']),
      ('pereafernandosergio@gmail.com', 'Juliana López Viviana', '+5491137761432', array['rotiseria-july']),
      ('syksrl@gmail.com', 'S&k Srl', '+5492664888901', array['montearena']),
      ('mtbalbo@gmail.com', 'Balbo Maria Teressa', '+5492664571363', array['pisco-yaku']),
      ('abuelitoantonio1914@yahoo.com.ar', 'Marcos J. E. Sánchez', '+5492664678178', array['abuelito-antonio-cabanas']),
      ('hotelpuntano@gmail.com', 'Coop De Trabajo Cafalser Ltda', '+5492664748431', array['hotel-puntano','tostadero-puntano','cafe-puntano','fabrica-de-alfajor-puntano']),
      ('marcosjavierdiep@gmail.com', 'Eternal Sas', '+5492665030555', array['destileria-eternal'])
    ) as t(email, full_name, phone, legacy_ids)
  loop
    begin
      v_created := false;
      select id into v_user_id from auth.users where email = r.email;

      if v_user_id is null then
        v_user_id := gen_random_uuid();
        v_created := true;
        insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at, confirmation_token, email_change,
          email_change_token_new, recovery_token
        ) values (
          '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
          r.email, crypt('aehga', gen_salt('bf')),
          now(), '{"provider":"email","providers":["email"]}',
          jsonb_build_object('full_name', r.full_name, 'phone', r.phone),
          now(), now(), '', '', '', ''
        );

        insert into auth.identities (
          id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
        ) values (
          gen_random_uuid(), v_user_id, v_user_id::text,
          jsonb_build_object('sub', v_user_id::text, 'email', r.email),
          'email', now(), now(), now()
        );
      end if;

      -- fuerza nombre/teléfono en el perfil, solo si el usuario es nuevo
      if v_created then
        update public.profiles set full_name = r.full_name, phone = r.phone
          where id = v_user_id;
      end if;

      update public.businesses set owner_id = v_user_id
        where legacy_id = any(r.legacy_ids);
    exception when others then
      raise notice 'Fallo con % : %', r.email, sqlerrm;
    end;
  end loop;
end $$;

-- 3) Marcar cámara AEHGA en las 27 fichas ----------------------
insert into public.business_chambers (business_id, chamber)
select id, 'AEHGA' from public.businesses
where legacy_id in (
  'abuelito-antonio-cabanas',
  'aguamansa-apart-hotel',
  'apart-altos-de-aliwen',
  'cafe-al-paso-agustin',
  'cafe-puntano',
  'casa-de-las-flores',
  'complejo-del-lago',
  'destileria-eternal',
  'el-malon',
  'fabrica-de-alfajor-puntano',
  'gales',
  'gin-eternal',
  'heladeria-yo-helados',
  'hola-bondiola',
  'hotel-potrero-de-los-funes',
  'hotel-puntano',
  'lo-de-vito',
  'lunamakena',
  'matil-nery-la-mulata',
  'montearena',
  'montini-resto',
  'parrilla-don-juan',
  'pisco-yaku',
  'que-rico',
  'romanito',
  'rotiseria-july',
  'tostadero-puntano'
)
on conflict (business_id) do update set chamber = excluded.chamber, updated_at = now();

-- 4) Verificación: dueño real asignado en las 27 fichas -------
select legacy_id, name, owner_id
from public.businesses
where legacy_id in (
  'abuelito-antonio-cabanas',
  'aguamansa-apart-hotel',
  'apart-altos-de-aliwen',
  'cafe-al-paso-agustin',
  'cafe-puntano',
  'casa-de-las-flores',
  'complejo-del-lago',
  'destileria-eternal',
  'el-malon',
  'fabrica-de-alfajor-puntano',
  'gales',
  'gin-eternal',
  'heladeria-yo-helados',
  'hola-bondiola',
  'hotel-potrero-de-los-funes',
  'hotel-puntano',
  'lo-de-vito',
  'lunamakena',
  'matil-nery-la-mulata',
  'montearena',
  'montini-resto',
  'parrilla-don-juan',
  'pisco-yaku',
  'que-rico',
  'romanito',
  'rotiseria-july',
  'tostadero-puntano'
)
and owner_id = (select id from public.profiles where is_admin = true limit 1);
