-- ============================================================
-- Diagnóstico: por qué falla "row-level security policy" al
-- subir la foto. Corré esto y pasame el resultado.
-- ============================================================

-- 1) ¿Existe el bucket?
select id, name, public from storage.buckets where id = 'business-images';

-- 2) ¿Existen las 4 políticas que creamos? (debería haber 4 filas)
select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and policyname like 'business_images%';
