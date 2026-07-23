-- Diagnóstico puntual para ijonmorris@gmail.com
-- (auth uid confirmado desde el navegador: eb6110ac-511b-4388-b564-ff51e4b992da)

-- 1) ¿Existe un perfil con ese id exacto? ¿Qué role/is_admin tiene?
select id, email, full_name, role, is_admin, is_blocked
from public.profiles
where id = 'eb6110ac-511b-4388-b564-ff51e4b992da';

-- 2) Por si las dudas, buscá también por email (para ver si hay un
-- perfil "duplicado" con otro id y el email correcto, que sería la
-- señal de que la cuenta se recreó en algún momento).
select id, email, full_name, role, is_admin, is_blocked
from public.profiles
where email = 'ijonmorris@gmail.com';

-- 3) Confirmá que el id de auth.users coincide con el de profiles
-- para este email (deberían ser el mismo id en las dos tablas).
select id, email, created_at, last_sign_in_at
from auth.users
where email = 'ijonmorris@gmail.com';
