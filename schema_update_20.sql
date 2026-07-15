-- ============================================================
-- Update 20: el presidente de cámara puede EDITAR (no solo ver)
-- los comercios adheridos a su propia cámara.
--
-- Update 12 dejó al rol "presidente" como solo lectura a propósito.
-- Ahora se pide que pueda abrir la ficha de un socio y editarla
-- completa (nombre, descripción, dirección, horarios, contacto,
-- foto, amenities, etc.), igual que el dueño edita la suya.
--
-- No hace falta tocar protect_business_status(): ese trigger ya
-- protege el campo "status" para cualquiera que no sea admin
-- (dueño o presidente), así que un presidente no puede
-- autoaprobar ni cambiar el estado de un socio con este cambio.
--
-- Correr en el SQL Editor después de schema.sql + updates 01-19.
-- ============================================================

create policy "businesses_presidente_update_chamber"
  on public.businesses for update
  using (
    exists (
      select 1
      from public.business_chambers bc
      join public.profiles p on p.chamber = bc.chamber
      where bc.business_id = businesses.id
        and p.id = auth.uid()
        and p.role = 'presidente'
    )
  )
  with check (
    exists (
      select 1
      from public.business_chambers bc
      join public.profiles p on p.chamber = bc.chamber
      where bc.business_id = businesses.id
        and p.id = auth.uid()
        and p.role = 'presidente'
    )
  );
