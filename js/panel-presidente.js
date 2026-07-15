// ============================================================
// Panel — sección "Mis socios" (rol presidente de cámara).
// Comercios adheridos a la cámara del usuario logueado
// (currentUserChamber, seteado en panel.js). Se puede ver y también
// editar la ficha completa de cada socio (reutiliza el formulario de
// "Mis fichas" de panel.js: openForm, fichasSection). Se carga después
// de js/panel.js y js/panel-events.js (reutiliza showAlert, clearAlert,
// escapeHtml, statusLabel, openForm, switchMainTab, fichasSection,
// sociosSection, mainTabFichas, mainTabSocios, returnToSocios).
// ============================================================

let sociosSectionLoaded = false;
let allSocios = [];

const sociosList = document.getElementById('sociosList');
const searchSocios = document.getElementById('searchSocios');
const sociosTitle = document.getElementById('sociosTitle');

searchSocios.addEventListener('input', renderSociosList);

async function initSociosSection() {
  if (sociosSectionLoaded) return;
  sociosSectionLoaded = true;
  await loadSocios();
}

async function loadSocios() {
  if (!currentUserChamber) {
    sociosList.innerHTML = '<p class="empty-state">Tu cuenta no tiene una cámara asignada. Contactate con el municipio.</p>';
    return;
  }

  sociosTitle.textContent = `Mis socios — ${currentUserChamber}`;
  sociosList.innerHTML = '<p class="empty-state">Cargando...</p>';

  const { data, error } = await supabaseClient
    .from('businesses')
    .select('id, name, address, phone, whatsapp, status, categories(label), subcategories(label), business_chambers!inner(chamber)')
    .eq('business_chambers.chamber', currentUserChamber)
    .order('name', { ascending: true });

  if (error) {
    sociosList.innerHTML = '';
    showAlert('No se pudo cargar el listado de socios: ' + error.message, 'error');
    return;
  }

  allSocios = data || [];
  renderSociosList();
}

function renderSociosList() {
  const term = searchSocios.value.trim().toLowerCase();

  const filtered = allSocios.filter((b) => {
    if (!term) return true;
    const haystack = ((b.name || '') + ' ' + (b.address || '')).toLowerCase();
    return haystack.includes(term);
  });

  if (allSocios.length === 0) {
    sociosList.innerHTML = '<p class="empty-state">Todavía no hay comercios cargados en tu cámara.</p>';
    return;
  }
  if (filtered.length === 0) {
    sociosList.innerHTML = '<p class="empty-state">No encontramos socios con ese filtro.</p>';
    return;
  }

  sociosList.innerHTML = filtered.map((b) => {
    const st = statusLabel(b.status);
    const subLabel = b.subcategories ? ' · ' + b.subcategories.label : '';
    return `
      <div class="business-item">
        <div class="info">
          <div class="name">${escapeHtml(b.name)}</div>
          <div class="meta">${escapeHtml(b.categories ? b.categories.label : '')}${escapeHtml(subLabel)} · <span class="badge ${st.cls}">${st.text}</span></div>
          <div class="meta">${escapeHtml(b.address) || 'Sin dirección cargada'}${b.phone ? ' · ' + escapeHtml(b.phone) : ''}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-secondary btn-small" onclick="openSocioEditForm('${b.id}')">Editar</button>
        </div>
      </div>
    `;
  }).join('');
}

// Abre la ficha completa de un socio en el formulario de "Mis fichas"
// (reutiliza openForm de panel.js). Al guardar o cancelar, vuelve acá
// en vez de al listado de fichas propias (returnToSocios, en panel.js).
function openSocioEditForm(businessId) {
  returnToSocios = true;
  sociosSection.classList.add('hidden');
  fichasSection.classList.remove('hidden');
  mainTabSocios.classList.remove('active');
  mainTabFichas.classList.add('active');
  openForm(businessId);
}
