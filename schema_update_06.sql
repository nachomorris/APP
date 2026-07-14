-- ============================================================
-- Update 06: Cámara/asociación del comercio (UDAER / CCTA / AEHGA)
-- Correr en el SQL Editor DESPUÉS de schema.sql + updates 01-05.
--
-- Este dato es SOLO para uso interno del administrador (vos), no
-- para mostrar en la web ni en el panel del comercio. Por eso NO
-- se guarda como columna de "businesses" (ahí cualquier policy de
-- lectura pública/dueño lo dejaría visible), sino en una tabla
-- aparte sin ninguna policy de lectura pública ni de dueño: solo
-- is_admin() puede leerla o escribirla. Si no hay policy que la
-- habilite, PostgREST simplemente no devuelve filas para nadie más.
-- ============================================================

create table public.business_chambers (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  chamber text not null check (chamber in ('UDAER', 'CCTA', 'AEHGA')),
  updated_at timestamptz not null default now()
);

alter table public.business_chambers enable row level security;

-- Única policy: solo el admin puede ver/crear/editar/borrar.
-- (Ni el dueño del comercio ni el público tienen ninguna policy acá,
-- así que para ellos la tabla queda "vacía" siempre.)
create policy "business_chambers_admin_all"
  on public.business_chambers for all
  using (public.is_admin())
  with check (public.is_admin());
