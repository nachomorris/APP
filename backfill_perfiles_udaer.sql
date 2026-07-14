-- ============================================================
-- Backfill: completa nombre/teléfono de los perfiles UDAER que
-- quedaron con "(sin nombre)". No toca owner_id (ya está bien);
-- solo completa full_name/phone donde estén vacíos. Seguro de
-- repetir.
-- ============================================================

update public.profiles p
set full_name = t.full_name, phone = t.phone
from (
  select u.id as user_id, v.full_name, v.phone
  from (values
    ('laquebrada.apartamentos@gmail.com', 'Cristian Javier Vinaccia', '+5492664019664'),
    ('danityles@gmail.com', 'Daniel Tyles', '+5492664205210'),
    ('petilucero@hotmail.com', 'Norma Lucero', '+5492664649875'),
    ('flaviomuller76@gmail.com', 'Flavio Luis Muller', '+5492664678680'),
    ('info@cabanasdelduende.com', 'Hernández Elisabet Mariel', '+5492901469068'),
    ('estacionpotrero@gmail.com', 'Jose Angel Chariano', '+5491131023001'),
    ('ramonaferreyra55@gmail.com', 'Ferreyra Ramona', '+1122920254'),
    ('complejoeureka@gmail.com', 'Barro Rosana Noemi', '+5492664678901'),
    ('castillo.desol@yahoo.com.ar', 'Maria Sol Rossi', '+5492664559847'),
    ('miguel_holtkamp@hotmail.com', 'Miguel Angel Holtkamp', '+5492664024996'),
    ('cabanaslacasadeltata@gmail.com', 'Alojamientos La Casa Del Tata', '+5492664209889'),
    ('vmelgar@hotmail.com', 'Fernandez Sergio', '+5491136257261'),
    ('florsaragiotto@hotmail.com', 'Ricardo Hernán Demarco', '+5492664968556'),
    ('ayresdefunes@gmail.com', 'Parra Adrián Alejandro', '+5492664893799'),
    ('dpregiosrl@gmail.com', 'Dp Regio Srl', '+5492664302349'),
    ('cabaniaslujan@gmail.com', 'Elizabeth Silvia Diaz', '+5492664771877'),
    ('antukakuyen@hotmail.com', 'Sergio Gustavo Rodas', '+5492665286061'),
    ('joragueva@hotmail.com', 'Guevara José Raúl', '+5492664223030'),
    ('csoldorado@yahoo.com.ar', 'Barca Antonio Félix', '+5492664551587'),
    ('cabanasdelfuego@gmail.com', 'Ciccone Pablo Sebastian', '+5492901613595'),
    ('chiquitomedio@hotmail.com.ar', 'Horacio Cardoso', '+5491152484474'),
    ('arielalborperez@gmail.com', 'Ariel Albor Perez', '+54902664659027'),
    ('motoposadaruta18@gmail.com', 'Jose Fernando Puebla', ''),
    ('cdelfini47@hotmail.com', 'Cdelfini47@hotmail.com', '+5492664709284'),
    ('ingenierohugoponce@hotmail.com', 'Ponce Néstor Hugo', '+549542664543002'),
    ('jaimecarbonell56@gmail.com', 'Ramona Judith Gomez', '+5492664660251'),
    ('janito.davin@gmail.com', 'Alejandro Luis Davin', '+5492355'),
    ('martinblasco754@gmail.com', 'Matias Martin Blasco', '+5492664540187'),
    ('miguelsaad1250@gmail.com', 'Miguel Angel Saad', '+5492664266538'),
    ('cesarfer.cel@gmail.com', 'Fernandez Cesar', '+5492664380004'),
    ('naifeolivares6@gnail.com', 'Pablo', '+5492664731025'),
    ('karinabaigorria@hotmail.com', 'Bascourleguy Diego', '+5492664584169'),
    ('contacto@cabanasilvestre.com.ar', 'Antonio B.s.m.silvestre', '+5492664396697'),
    ('info@complejoretana.com.ar', 'Ana Verónica Silvestre', '+5492664369726'),
    ('britosergio@live.com.ar', 'Sergio Darío Brito', '+5491164860317'),
    ('ccumelen@yahoo.com.ar', 'Ambrosini Mario Eduardo', '+5492664257465'),
    ('lasoleadapotrero@gmail.com', 'María Inés Romero', '+5491141939061'),
    ('cascolucia02@gmail.com', 'Mendieta Y Asociados Srl', '+5493512241661'),
    ('encantopuntano@gmail.com', 'Mirta Bernacchini', '+5492664654244'),
    ('rologudino@gmail.com', 'Complejo La Colina De Rodolfo Gudiño', '+5492664705702'),
    ('aktulugar@hotmail.com.ar', 'Bonetto Elida Alicia', '+5492657544490')
  ) as v(email, full_name, phone)
  join auth.users u on u.email = v.email
) as t
where p.id = t.user_id
  and (p.full_name is null or p.full_name = '');
