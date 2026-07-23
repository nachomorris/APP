// ============================================================
// Panel — sección "Mis socios" (rol presidente de cámara).
// Comercios adheridos a la cámara del usuario logueado
// (currentUserChamber, seteado en panel.js). Se puede ver y también
// editar la ficha completa de cada socio (reutiliza el formulario de
// "Mis fichas" de panel.js: openForm, fichasSection). También puede
// mandarle a cada socio un link de ingreso: si ya tiene cuenta propia,
// se le genera el link directo; si el comercio todavía figura a nombre
// del admin (se cargó sin dueño real todavía), primero se le crea la
// cuenta con su email. Se carga después de js/panel.js y
// js/panel-events.js (reutiliza showAlert, clearAlert, escapeHtml,
// statusLabel, openForm, switchMainTab, fichasSection, sociosSection,
// mainTabFichas, mainTabSocios, returnToSocios).
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

  // presidente_get_socios ya viene con el rol/email del dueño de cada
  // ficha resuelto del lado del servidor (profiles no se puede leer
  // directo por RLS para perfiles ajenos).
  const { data, error } = await supabaseClient.rpc('presidente_get_socios');

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
    const subLabel = b.subcategory_label ? ' · ' + b.subcategory_label : '';
    const needsAccount = !b.owner_role || b.owner_role === 'admin';
    const thumbUrl = (Array.isArray(b.images) && b.images[0]) ? b.images[0] : null;
    const ownerLabel = needsAccount ? 'Sin dueño propio todavía (a cargo del municipio)' : (b.owner_full_name || b.owner_email || 'Socio');
    return `
      <div class="business-item">
        ${thumbUrl
          ? `<img src="${escapeHtml(thumbUrl)}" alt="" style="width:64px; height:48px; object-fit:cover; border-radius:8px; flex-shrink:0;">`
          : `<div style="width:64px; height:48px; border-radius:8px; background:var(--primary-light); flex-shrink:0;"></div>`
        }
        <div class="info">
          <div class="name">${escapeHtml(b.name)}</div>
          <div class="meta">${escapeHtml(b.category_label || '')}${escapeHtml(subLabel)} · <span class="badge ${st.cls}">${st.text}</span></div>
          <div class="meta">${escapeHtml(b.address) || 'Sin dirección cargada'}${b.phone ? ' · ' + escapeHtml(b.phone) : ''}</div>
          <div class="meta">Dueño: ${escapeHtml(ownerLabel)}</div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-secondary btn-small" onclick="openSocioEditForm('${b.id}')">Editar</button>
          ${needsAccount
            ? `<button type="button" class="btn btn-secondary btn-small" onclick="toggleSocioAccountForm('${b.id}')">Crear cuenta y generar link</button>`
            : `<button type="button" class="btn btn-secondary btn-small" id="socio-link-btn-${b.id}" onclick="generateSocioInviteLink('${b.owner_id}', document.getElementById('socio-link-btn-${b.id}'))">Generar link de ingreso</button>`
          }
        </div>
        ${needsAccount ? `
        <div class="socio-account-form hidden" id="socio-account-form-${b.id}" style="margin-top:10px; padding-top:10px; border-top:1px solid var(--border);">
          <p class="field-hint" style="margin-top:0;">Este comercio todavía no tiene dueño propio. Cargá el email del socio para crearle la cuenta y generar su link de ingreso.</p>
          <label for="socio-email-${b.id}">Email del socio *</label>
          <input type="email" id="socio-email-${b.id}">
          <label for="socio-name-${b.id}">Nombre y apellido (opcional)</label>
          <input type="text" id="socio-name-${b.id}">
          <label for="socio-phone-${b.id}">Teléfono (opcional)</label>
          <input type="tel" id="socio-phone-${b.id}">
          <button type="button" class="btn btn-primary btn-small" id="socio-create-btn-${b.id}" onclick="createSocioAccount('${b.id}')">Crear cuenta y generar link</button>
        </div>` : ''}
      </div>
    `;
  }).join('');
}

function toggleSocioAccountForm(businessId) {
  const form = document.getElementById(`socio-account-form-${businessId}`);
  if (form) form.classList.toggle('hidden');
}

async function createSocioAccount(businessId) {
  const email = document.getElementById(`socio-email-${businessId}`).value.trim();
  const fullName = document.getElementById(`socio-name-${businessId}`).value.trim();
  const phone = document.getElementById(`socio-phone-${businessId}`).value.trim();

  if (!email) {
    showAlert('El email del socio es obligatorio.', 'error');
    return;
  }

  const btn = document.getElementById(`socio-create-btn-${businessId}`);
  btn.disabled = true;
  btn.textContent = 'Creando...';

  const { data: token, error } = await supabaseClient.rpc('presidente_create_socio_account', {
    p_business_id: businessId,
    new_email: email,
    new_full_name: fullName || null,
    new_phone: phone || null,
  });

  btn.disabled = false;
  btn.textContent = 'Crear cuenta y generar link';

  if (error) {
    showAlert('No se pudo crear la cuenta: ' + error.message, 'error');
    return;
  }

  await shareInviteLink(token);
  loadSocios();
}

async function generateSocioInviteLink(ownerId, btn) {
  const originalText = btn ? btn.innerHTML : null;
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Generando...';
  }

  const { data: token, error } = await supabaseClient.rpc('create_invite_link', { target_user_id: ownerId });

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }

  if (error) {
    showAlert('No se pudo generar el link: ' + error.message, 'error');
    return;
  }

  await shareInviteLink(token);
}

async function shareInviteLink(token) {
  const url = `https://visitpotrero.com/activar.html?token=${token}`;
  try {
    await navigator.clipboard.writeText(url);
    showAlert('Link copiado al portapapeles. Vale por 7 días y una sola vez: ' + url, 'success');
  } catch (e) {
    window.prompt('Copiá este link y mandaselo (vale por 7 días y una sola vez):', url);
  }
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
