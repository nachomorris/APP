-- ============================================================
-- Update 22: páginas públicas por cámara (visitpotrero.com/udaer/,
-- /ccta/, /aehga/), que muestran los comercios socios de cada cámara.
--
-- Update 06 dejó "business_chambers" sin ninguna policy de lectura
-- pública a propósito, porque en ese momento era un dato solo para
-- uso interno del admin ("NO para mostrar en la web"). Ahora se pide
-- justamente mostrarlo, así que hace falta que cualquier visitante
-- pueda leer (nunca editar) a qué cámara pertenece cada comercio ya
-- PUBLICADO. Los comercios pending/rejected siguen sin exponerse.
--
-- Correr en el SQL Editor después de schema.sql + updates 01-21.
-- ============================================================

create policy "business_chambers_public_read_published"
  on public.business_chambers for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = business_chambers.business_id
        and b.status = 'published'
    )
  );
