-- ============================================================
-- Fix v3: usuarios UDAER (usa esto, reemplaza a v2)
--
-- Confirmado con la prueba: el mecanismo de crear el usuario
-- (pgcrypto + trigger) ya funciona bien. Este archivo agrega un
-- solo cambio: además de dejar que el trigger cree el perfil,
-- fuerza el nombre/teléfono directo en public.profiles, para no
-- depender de si schema_update_01.sql (que le enseña al trigger
-- a leer nombre/teléfono) ya corrió o no en este proyecto.
--
-- Es 100% seguro correr el archivo completo (las 3 partes son
-- idempotentes, se puede repetir todo sin duplicar nada).
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- 1) Altas: fichas que no existían en el catálogo -------------
insert into public.businesses (legacy_id, name, category_id, phone, email, status, open, owner_id) values
  ('vistas-de-victoria', 'Vistas De Victoria', 'alojamiento', '+5492664968556', 'florsaragiotto@hotmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1)),
  ('cabanas-lujan', 'Cabañas Lujan', 'alojamiento', '+5492664771877', 'cabaniaslujan@gmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1)),
  ('hospedaje-ruta-18', 'Hospedaje Ruta 18', 'alojamiento', null, 'motoposadaruta18@gmail.com', 'published', true, (select id from public.profiles where is_admin = true limit 1))
on conflict (legacy_id) do nothing;

-- 2) Un usuario por cada dueño de la planilla UDAER (clave: UDAER) ----
do $$
declare
  r record;
  v_user_id uuid;
  v_created boolean;
begin
  set local search_path = public, extensions;

  for r in
    select * from (values
      ('laquebrada.apartamentos@gmail.com', 'Cristian Javier Vinaccia', '+5492664019664', array['la-quebrada-apart-hotel']),
      ('danityles@gmail.com', 'Daniel Tyles', '+5492664205210', array['los-naranjos']),
      ('petilucero@hotmail.com', 'Norma Lucero', '+5492664649875', array['la-norma-casa-en-alquiler']),
      ('flaviomuller76@gmail.com', 'Flavio Luis Muller', '+5492664678680', array['los-pinos-1']),
      ('info@cabanasdelduende.com', 'Hernández Elisabet Mariel', '+5492901469068', array['del-duende']),
      ('estacionpotrero@gmail.com', 'Jose Angel Chariano', '+5491131023001', array['estacion-potrero']),
      ('ramonaferreyra55@gmail.com', 'Ferreyra Ramona', '+1122920254', array['la-lomita']),
      ('complejoeureka@gmail.com', 'Barro Rosana Noemi', '+5492664678901', array['eureka']),
      ('castillo.desol@yahoo.com.ar', 'Maria Sol Rossi', '+5492664559847', array['castillo-de-sol']),
      ('miguel_holtkamp@hotmail.com', 'Miguel Angel Holtkamp', '+5492664024996', array['cabanas-holtfor']),
      ('cabanaslacasadeltata@gmail.com', 'Alojamientos La Casa Del Tata', '+5492664209889', array['la-casa-del-tata-hostal']),
      ('vmelgar@hotmail.com', 'Fernandez Sergio', '+5491136257261', array['munay']),
      ('florsaragiotto@hotmail.com', 'Ricardo Hernán Demarco', '+5492664968556', array['vistas-de-victoria']),
      ('ayresdefunes@gmail.com', 'Parra Adrián Alejandro', '+5492664893799', array['ayres-de-funes']),
      ('dpregiosrl@gmail.com', 'Dp Regio Srl', '+5492664302349', array['lunamakena-2']),
      ('cabaniaslujan@gmail.com', 'Elizabeth Silvia Diaz', '+5492664771877', array['cabanas-lujan']),
      ('antukakuyen@hotmail.com', 'Sergio Gustavo Rodas', '+5492665286061', array['antu-kuyen']),
      ('joragueva@hotmail.com', 'Guevara José Raúl', '+5492664223030', array['lunas-y-soles','lunas-y-soles-2']),
      ('csoldorado@yahoo.com.ar', 'Barca Antonio Félix', '+5492664551587', array['sol-dorado']),
      ('cabanasdelfuego@gmail.com', 'Ciccone Pablo Sebastian', '+5492901613595', array['del-fuego']),
      ('chiquitomedio@hotmail.com.ar', 'Horacio Cardoso', '+5491152484474', array['oliber-cabanas']),
      ('arielalborperez@gmail.com', 'Ariel Albor Perez', '+54902664659027', array['los-molles']),
      ('motoposadaruta18@gmail.com', 'Jose Fernando Puebla', '', array['hospedaje-ruta-18']),
      ('cdelfini47@hotmail.com', 'Cdelfini47@hotmail.com', '+5492664709284', array['el-reparo']),
      ('ingenierohugoponce@hotmail.com', 'Ponce Néstor Hugo', '+549542664543002', array['gemas-del-lago']),
      ('jaimecarbonell56@gmail.com', 'Ramona Judith Gomez', '+5492664660251', array['villa-king']),
      ('cdelfini47@hotmail.com', 'Claudio Delfini', '+5492664709284', array['el-reparo']),
      ('janito.davin@gmail.com', 'Alejandro Luis Davin', '+5492355', array['las-piedras']),
      ('martinblasco754@gmail.com', 'Matias Martin Blasco', '+5492664540187', array['ludmar']),
      ('miguelsaad1250@gmail.com', 'Miguel Angel Saad', '+5492664266538', array['el-triunfo-apart']),
      ('cesarfer.cel@gmail.com', 'Fernandez Cesar', '+5492664380004', array['mirando-al-valle']),
      ('naifeolivares6@gnail.com', 'Pablo', '+5492664731025', array['naife']),
      ('karinabaigorria@hotmail.com', 'Bascourleguy Diego', '+5492664584169', array['el-colibri']),
      ('contacto@cabanasilvestre.com.ar', 'Antonio B.s.m.silvestre', '+5492664396697', array['tronco-silvestre']),
      ('info@complejoretana.com.ar', 'Ana Verónica Silvestre', '+5492664369726', array['complejo-retana','retana']),
      ('britosergio@live.com.ar', 'Sergio Darío Brito', '+5491164860317', array['turmalina']),
      ('ccumelen@yahoo.com.ar', 'Ambrosini Mario Eduardo', '+5492664257465', array['cumelem']),
      ('lasoleadapotrero@gmail.com', 'María Inés Romero', '+5491141939061', array['la-soleada']),
      ('cascolucia02@gmail.com', 'Mendieta Y Asociados Srl', '+5493512241661', array['villa-las-lomas']),
      ('encantopuntano@gmail.com', 'Mirta Bernacchini', '+5492664654244', array['encanto-puntano']),
      ('rologudino@gmail.com', 'Complejo La Colina De Rodolfo Gudiño', '+5492664705702', array['la-colina']),
      ('chiquitomedio@hotmail.com.ar', 'Horacio Cardoso', '+5491152484474', array['oliber-cabanas']),
      ('aktulugar@hotmail.com.ar', 'Bonetto Elida Alicia', '+5492657544490', array['ak-tu-lugar'])
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
          r.email, crypt('UDAER', gen_salt('bf')),
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

      -- fuerza nombre/teléfono en el perfil, sin depender del trigger
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

-- 3) Marcar cámara UDAER en las 43 fichas ---------------------
insert into public.business_chambers (business_id, chamber)
select id, 'UDAER' from public.businesses
where legacy_id in (
  'ak-tu-lugar',
  'antu-kuyen',
  'ayres-de-funes',
  'cabanas-holtfor',
  'cabanas-lujan',
  'castillo-de-sol',
  'complejo-retana',
  'cumelem',
  'del-duende',
  'del-fuego',
  'el-colibri',
  'el-reparo',
  'el-triunfo-apart',
  'encanto-puntano',
  'estacion-potrero',
  'eureka',
  'gemas-del-lago',
  'hospedaje-ruta-18',
  'la-casa-del-tata-hostal',
  'la-colina',
  'la-lomita',
  'la-norma-casa-en-alquiler',
  'la-quebrada-apart-hotel',
  'la-soleada',
  'las-piedras',
  'los-molles',
  'los-naranjos',
  'los-pinos-1',
  'ludmar',
  'lunamakena-2',
  'lunas-y-soles',
  'lunas-y-soles-2',
  'mirando-al-valle',
  'munay',
  'naife',
  'oliber-cabanas',
  'retana',
  'sol-dorado',
  'tronco-silvestre',
  'turmalina',
  'villa-king',
  'villa-las-lomas',
  'vistas-de-victoria'
)
on conflict (business_id) do update set chamber = excluded.chamber, updated_at = now();

-- 4) Verificación rápida: deberían ser 0 filas sin dueño real -----
select legacy_id, name, owner_id
from public.businesses
where legacy_id in (
  'ak-tu-lugar',
  'antu-kuyen',
  'ayres-de-funes',
  'cabanas-holtfor',
  'cabanas-lujan',
  'castillo-de-sol',
  'complejo-retana',
  'cumelem',
  'del-duende',
  'del-fuego',
  'el-colibri',
  'el-reparo',
  'el-triunfo-apart',
  'encanto-puntano',
  'estacion-potrero',
  'eureka',
  'gemas-del-lago',
  'hospedaje-ruta-18',
  'la-casa-del-tata-hostal',
  'la-colina',
  'la-lomita',
  'la-norma-casa-en-alquiler',
  'la-quebrada-apart-hotel',
  'la-soleada',
  'las-piedras',
  'los-molles',
  'los-naranjos',
  'los-pinos-1',
  'ludmar',
  'lunamakena-2',
  'lunas-y-soles',
  'lunas-y-soles-2',
  'mirando-al-valle',
  'munay',
  'naife',
  'oliber-cabanas',
  'retana',
  'sol-dorado',
  'tronco-silvestre',
  'turmalina',
  'villa-king',
  'villa-las-lomas',
  'vistas-de-victoria'
)
and owner_id = (select id from public.profiles where is_admin = true limit 1);
