// ============================================================
// Panel de administración — sección "Actividades" (deportivas /
// culturales). Calcada de js/admin-events.js: mismo formulario
// completo (portada con foco, secciones colapsables, preview
// editable en vivo, recurrencia, precio/inscripción, destacados),
// pero solo el municipio carga actividades (sin ficha organizadora
// obligatoria ni distinción "oficial/no oficial") y la "categoría"
// es una etiqueta fija (Deportiva/Cultural) en vez de una tabla.
//
// Se carga después de js/admin.js y js/admin-events.js: reutiliza
// de ahí supabaseClient, showAlert(), clearAlert(), escapeHtml(),
// showAdminSection(), currentAdminUser, y varios helpers genéricos
// que no son específicos de eventos (evStatusLabel, EVAD_MESES_ES,
// evAdParseDate/evAdFmtDate, evAdFmtDay/evAdFmtDateRange/evAdFmtTimeRange,
// evAdPriceLabel, evAdWebsiteUrl/evAdInstagramUrl/evAdIsUrl,
// evAdSetupToggle, evadResizeImageToBlob, evadPreviewPointFromEvent,
// evAdComputeOccurrences).
// ============================================================

// Etiquetas fijas (no hay tabla de categorías para actividades).
const ACT_TAGS = {
  deportiva: { id: 'deportiva', label: 'Deportiva', icon: '🏅', color: '#ca8a04' },
  cultural: { id: 'cultural', label: 'Cultural', icon: '🎭', color: '#7c3aed' },
};
function actTagInfo(id) {
  return ACT_TAGS[id] || { id: '', label: 'Elegir etiqueta', icon: '🏷️', color: '#111111' };
}

let actAdminBusinesses = [];
let actAdminActivities = [];
let actAdminStatusFilter = 'published';

const mainTabActivities = document.getElementById('mainTabActivities');
const activitiesAdminListView = document.getElementById('activitiesAdminListView');
const activitiesAdminFormView = document.getElementById('activitiesAdminFormView');
const actAdminForm = document.getElementById('actAdminForm');
const actAdminList = document.getElementById('actAdminList');
const actadBusinessIdInput = document.getElementById('actad_business_id');
const actadBusinessSearch = document.getElementById('actad_business_search');
const actadBusinessResults = document.getElementById('actad_business_results');
const actadTagSelect = document.getElementById('actad_tag');
const actadIsFree = document.getElementById('actad_is_free');
const actadRequiresRegistration = document.getElementById('actad_requires_registration');
const actadRecurrenceType = document.getElementById('actad_recurrence_type');
const actadTitleInput = document.getElementById('actad_title');

// El título se guarda siempre en mayúscula (dato real, no solo estilo
// visual), igual que en eventos.
actadTitleInput.addEventListener('input', () => {
  const start = actadTitleInput.selectionStart;
  const end = actadTitleInput.selectionEnd;
  actadTitleInput.value = actadTitleInput.value.toUpperCase();
  if (start != null && end != null) actadTitleInput.setSelectionRange(start, end);
});

let actAdminSectionLoaded = false;

mainTabActivities.addEventListener('click', () => {
  showAdminSection('activitiesAdminSection');
  if (!actAdminSectionLoaded) {
    actAdminSectionLoaded = true;
    initActivitiesAdminSection();
  }
});

async function initActivitiesAdminSection() {
  await loadActAdminBusinesses();
  await loadActAdminActivities();
}

async function loadActAdminBusinesses() {
  const { data, error } = await supabaseClient
    .from('businesses')
    .select('id, name')
    .order('name', { ascending: true });
  if (error) { showAlert('No se pudieron cargar los comercios: ' + error.message, 'error'); return; }
  actAdminBusinesses = data || [];
}

// ---------- Buscador de ficha organizadora (opcional) ----------
function actAdSetBusinessSelection(id, name) {
  actadBusinessIdInput.value = id || '';
  actadBusinessSearch.value = name || '';
  hideActAdBusinessResults();
  if (typeof renderActAdPreview === 'function') renderActAdPreview();
}
function hideActAdBusinessResults() {
  actadBusinessResults.classList.add('hidden');
}
function renderActAdBusinessResults(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 1) {
    actadBusinessResults.innerHTML = '<div class="autocomplete-empty">Escribí para buscar un comercio.</div>';
    actadBusinessResults.classList.remove('hidden');
    return;
  }
  const items = actAdminBusinesses.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 15);
  if (!items.length) {
    actadBusinessResults.innerHTML = '<div class="autocomplete-empty">No encontramos comercios con ese nombre.</div>';
  } else {
    actadBusinessResults.innerHTML = items.map((b) =>
      `<div class="autocomplete-item" data-business="${b.id}" data-name="${escapeHtml(b.name)}">${escapeHtml(b.name)}</div>`
    ).join('');
    actadBusinessResults.querySelectorAll('[data-business]').forEach((el) => {
      el.addEventListener('click', () => actAdSetBusinessSelection(el.getAttribute('data-business'), el.getAttribute('data-name')));
    });
  }
  actadBusinessResults.classList.remove('hidden');
}
actadBusinessSearch.addEventListener('input', () => {
  actadBusinessIdInput.value = '';
  renderActAdBusinessResults(actadBusinessSearch.value);
  if (typeof renderActAdPreview === 'function') renderActAdPreview();
});
actadBusinessSearch.addEventListener('focus', () => {
  renderActAdBusinessResults(actadBusinessSearch.value);
});
actadBusinessSearch.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideActAdBusinessResults();
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#actad_business_search') && !e.target.closest('#actad_business_results')) {
    hideActAdBusinessResults();
  }
});

// ---------- Listado ----------
document.getElementById('actAdminStatusTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-actstatus]');
  if (!btn) return;
  document.querySelectorAll('#actAdminStatusTabs .tab').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');
  actAdminStatusFilter = btn.getAttribute('data-actstatus');
  renderActAdminList();
});
document.getElementById('actAdminTagFilter').addEventListener('change', renderActAdminList);
document.getElementById('actAdminOrgSearch').addEventListener('input', renderActAdminList);
document.getElementById('actAdminDateFilter').addEventListener('input', renderActAdminList);

function actAdminIsFinished(a) {
  const [y, m, d] = (a.end_date || a.start_date).split('-').map(Number);
  const end = new Date(y, m - 1, d);
  const t = a.end_time || a.start_time || '23:59:59';
  const [h, mi] = t.split(':').map(Number);
  end.setHours(h || 23, mi || 59, 0, 0);
  return end.getTime() < Date.now();
}

async function loadActAdminActivities() {
  actAdminList.innerHTML = '<p class="empty-state">Cargando...</p>';
  const { data, error } = await supabaseClient
    .from('activities')
    .select('*, businesses(id, legacy_id, name), profiles(full_name, phone, email)')
    .order('start_date', { ascending: true });
  if (error) { actAdminList.innerHTML = ''; showAlert('No se pudo cargar el listado de actividades: ' + error.message, 'error'); return; }
  actAdminActivities = data || [];
  updateActAdminStatusCounts();
  renderActAdminList();
}

function updateActAdminStatusCounts() {
  const counts = {
    pending: 0, needs_changes: 0, published: 0, featured: 0,
    finished: 0, hidden: 0, rejected: 0, all: actAdminActivities.length,
  };
  actAdminActivities.forEach((a) => {
    if (a.status in counts) counts[a.status]++;
    if (a.is_featured) counts.featured++;
    if (actAdminIsFinished(a)) counts.finished++;
  });
  document.querySelectorAll('#actAdminStatusTabs .tab-count').forEach((el) => {
    const key = el.getAttribute('data-count-for');
    el.textContent = counts[key] != null ? counts[key] : 0;
  });
}

function renderActAdminList() {
  let items = actAdminActivities.slice();
  const tagFilter = document.getElementById('actAdminTagFilter').value;
  const orgSearch = document.getElementById('actAdminOrgSearch').value.trim().toLowerCase();
  const dateFilter = document.getElementById('actAdminDateFilter').value;

  if (actAdminStatusFilter === 'featured') {
    items = items.filter((a) => a.is_featured);
  } else if (actAdminStatusFilter === 'finished') {
    items = items.filter((a) => actAdminIsFinished(a));
  } else if (actAdminStatusFilter !== 'all') {
    items = items.filter((a) => a.status === actAdminStatusFilter);
  }
  if (tagFilter) items = items.filter((a) => a.tag === tagFilter);
  if (dateFilter) items = items.filter((a) => a.start_date <= dateFilter && a.end_date >= dateFilter);
  if (orgSearch) {
    items = items.filter((a) => {
      const org = (a.businesses ? a.businesses.name : '') + ' ' + (a.title || '');
      return org.toLowerCase().includes(orgSearch);
    });
  }
  if (actAdminStatusFilter === 'featured') {
    items.sort((a, b) => a.featured_order - b.featured_order);
  }

  if (items.length === 0) {
    actAdminList.innerHTML = '<p class="empty-state">No hay actividades en esta vista.</p>';
    return;
  }

  actAdminList.innerHTML = '';
  items.forEach((a) => renderActAdminCard(a));
}

function renderActAdminCard(a) {
  const st = evStatusLabel(a.status);
  const tag = actTagInfo(a.tag);
  const owner = a.profiles || {};
  const org = a.businesses ? a.businesses.name : '(organiza el municipio)';
  const dateLabel = a.start_date === a.end_date ? a.start_date : `${a.start_date} → ${a.end_date}`;

  const card = document.createElement('div');
  card.className = 'card admin-card';
  card.innerHTML = `
    <div class="top">
      <div>
        <div class="name">${escapeHtml(a.title)}</div>
        <div class="cat">${tag.icon} ${escapeHtml(tag.label)}</div>
      </div>
      <span class="badge ${st.cls}">${st.text}</span>
    </div>
    <dl>
      <dt>Organiza</dt>
      <dd>${escapeHtml(org)} ${a.business_id ? `<a href="admin.html" onclick="event.preventDefault(); document.getElementById('mainTabBusinesses').click();" style="color:var(--primary-dark); font-weight:700;">(ver ficha)</a>` : ''}</dd>

      <dt>Cuándo</dt>
      <dd>${escapeHtml(dateLabel)}${a.start_time ? ' · ' + a.start_time.slice(0, 5) : ''}${a.end_time ? ' a ' + a.end_time.slice(0, 5) : ''}</dd>

      <dt>Cargada por</dt>
      <dd>${escapeHtml(owner.full_name) || '(sin nombre)'} ${owner.phone ? '· ' + escapeHtml(owner.phone) : ''}</dd>

      <dt>Vistas</dt>
      <dd>👁 ${a.views_count || 0}${a.is_featured ? ' · ★ Destacada (orden ' + a.featured_order + ')' : ''}</dd>

      ${a.review_note ? `<dt>Observación cargada</dt><dd>${escapeHtml(a.review_note)}</dd>` : ''}
    </dl>
    <div class="admin-actions"></div>
  `;

  const actions = card.querySelector('.admin-actions');
  const btn = (label, cls, fn) => {
    const b = document.createElement('button');
    b.className = 'btn ' + cls + ' btn-small';
    b.textContent = label;
    b.addEventListener('click', fn);
    actions.appendChild(b);
  };

  if (a.status !== 'published') btn('Aprobar y publicar', 'btn-primary', () => setActStatus(a.id, 'published'));
  if (a.status !== 'needs_changes') btn('Pedir cambios', 'btn-secondary', () => requestActChanges(a.id));
  if (a.status !== 'rejected') btn('Rechazar', 'btn-secondary', () => rejectAct(a.id));
  if (a.status !== 'hidden') btn('Ocultar', 'btn-secondary', () => setActStatus(a.id, 'hidden'));
  else btn('Volver a publicar', 'btn-secondary', () => setActStatus(a.id, 'published'));
  btn(a.is_featured ? 'Quitar destacado' : 'Destacar', 'btn-secondary', () => toggleActFeatured(a));
  if (a.is_featured) {
    btn('▲ Subir', 'btn-secondary', () => reorderActFeatured(a, -1));
    btn('▼ Bajar', 'btn-secondary', () => reorderActFeatured(a, 1));
  }
  btn('Editar', 'btn-secondary', () => openActAdminForm(a));
  btn('Eliminar', 'btn-danger', () => deleteActAdmin(a.id));

  actAdminList.appendChild(card);
}

async function setActStatus(id, status, review_note) {
  const payload = { status };
  if (review_note !== undefined) payload.review_note = review_note;
  if (status === 'published' || status === 'approved') payload.review_note = null;
  const { error } = await supabaseClient.from('activities').update(payload).eq('id', id);
  if (error) { showAlert('No se pudo actualizar: ' + error.message, 'error'); return; }
  showAlert('Actividad actualizada.', 'success');
  loadActAdminActivities();
}
function requestActChanges(id) {
  const note = window.prompt('¿Qué tiene que corregir? (obligatorio)');
  if (note === null) return;
  if (!note.trim()) { showAlert('Escribí una observación.', 'error'); return; }
  setActStatus(id, 'needs_changes', note.trim());
}
function rejectAct(id) {
  const note = window.prompt('¿Por qué se rechaza? (opcional)') || '';
  setActStatus(id, 'rejected', note.trim());
}
async function toggleActFeatured(a) {
  const { error } = await supabaseClient.from('activities').update({ is_featured: !a.is_featured }).eq('id', a.id);
  if (error) { showAlert('No se pudo actualizar: ' + error.message, 'error'); return; }
  loadActAdminActivities();
}
async function reorderActFeatured(a, delta) {
  const { error } = await supabaseClient.from('activities').update({ featured_order: (a.featured_order || 0) + delta }).eq('id', a.id);
  if (error) { showAlert('No se pudo reordenar: ' + error.message, 'error'); return; }
  loadActAdminActivities();
}
async function deleteActAdmin(id) {
  if (!confirm('¿Eliminar esta actividad definitivamente?')) return;
  const { error } = await supabaseClient.from('activities').delete().eq('id', id);
  if (error) { showAlert('No se pudo eliminar: ' + error.message, 'error'); return; }
  showAlert('Actividad eliminada.', 'success');
  loadActAdminActivities();
}

// ---------- Formulario (crear / editar) ----------
// Misma página "limpia" que la de eventos: sin topbar ni section-tabs,
// header propio a todo el ancho.
function actAdSetChromeVisible(visible) {
  const topbar = document.querySelector('.topbar');
  const tabs = document.querySelector('.section-tabs');
  const fullHeader = document.getElementById('actAdminFullHeader');
  if (topbar) topbar.classList.toggle('hidden', !visible);
  if (tabs) tabs.classList.toggle('hidden', !visible);
  if (fullHeader) fullHeader.classList.toggle('hidden', visible);
}
function actAdShowList() {
  activitiesAdminFormView.classList.add('hidden');
  activitiesAdminListView.classList.remove('hidden');
  actAdSetChromeVisible(true);
  clearAlert();
}
function actAdShowForm() {
  activitiesAdminListView.classList.add('hidden');
  activitiesAdminFormView.classList.remove('hidden');
  actAdSetChromeVisible(false);
  renderActAdPreview();
  window.scrollTo(0, 0);
}
document.getElementById('actAdminCancelBtn').addEventListener('click', actAdShowList);
document.getElementById('actAdminBackBtn').addEventListener('click', actAdShowList);

actadIsFree.addEventListener('change', () => document.getElementById('actad_price_wrap').classList.toggle('hidden', actadIsFree.checked));
actadRequiresRegistration.addEventListener('change', () => document.getElementById('actad_registration_wrap').classList.toggle('hidden', !actadRequiresRegistration.checked));
actadRecurrenceType.addEventListener('change', () => {
  const t = actadRecurrenceType.value;
  document.getElementById('actad_recurrence_until_wrap').classList.toggle('hidden', t === 'none' || t === 'custom');
  document.getElementById('actad_recurrence_custom_wrap').classList.toggle('hidden', t !== 'custom');
});

// ---------- Secciones colapsables (reutiliza evAdSetupToggle, genérico) ----------
const actadGalleryToggleCtl = evAdSetupToggle('actadGalleryToggle', 'actadGalleryWrap');
const actadBasicToggleCtl = evAdSetupToggle('actadBasicToggle', 'actadBasicWrap');
const actadWhenToggleCtl = evAdSetupToggle('actadWhenToggle', 'actadWhenWrap');
const actadDateToggleCtl = evAdSetupToggle('actadDateToggle', 'actadDateAdvancedWrap');
const actadLocationToggleCtl = evAdSetupToggle('actadLocationToggle', 'actadLocationWrap');
const actadPriceToggleCtl = evAdSetupToggle('actadPriceToggle', 'actadPriceWrap');
const actadStatusToggleCtl = evAdSetupToggle('actadStatusToggle', 'actadStatusWrap');
const actadGalleryToggle = document.getElementById('actadGalleryToggle');
const actadGalleryWrap = document.getElementById('actadGalleryWrap');

// ---------- Foto de portada (subir, SIN recortar), bucket "activity-images" ----------
// Mismo mecanismo que eventos: id temporal de carpeta hasta que se
// guarda la fila, punto de encuadre (focal point) no destructivo.
let actadPhotoFolderId = null;
let actadPhotoUploading = false;

const actadCoverImageInput = document.getElementById('actad_cover_image');
const actadPhotoInput = document.getElementById('actadPhotoInput');
const actadFocalXInput = document.getElementById('actad_cover_focal_x');
const actadFocalYInput = document.getElementById('actad_cover_focal_y');

function refreshActadPhotoUploadState(currentPhotoUrl) {
  actadCoverImageInput.value = currentPhotoUrl || '';
}

function actadApplyFocalPoint(xPct, yPct) {
  const x = Math.max(0, Math.min(100, xPct));
  const y = Math.max(0, Math.min(100, yPct));
  actadFocalXInput.value = x.toFixed(1);
  actadFocalYInput.value = y.toFixed(1);
  renderActAdPreview();
}

actadPhotoInput.addEventListener('change', async () => {
  const file = actadPhotoInput.files && actadPhotoInput.files[0];
  if (!file) return;

  actadPhotoUploading = true;
  renderActAdPreview();

  try {
    const blob = await evadResizeImageToBlob(file, 1800);
    if (!actadPhotoFolderId) actadPhotoFolderId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    const path = `${actadPhotoFolderId}/cover-${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseClient.storage
      .from('activity-images')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;

    const { data: pub } = supabaseClient.storage.from('activity-images').getPublicUrl(path);
    refreshActadPhotoUploadState(pub.publicUrl);
    actadApplyFocalPoint(50, 50);
    showAlert('Foto lista. Arrastrá sobre la foto para elegir el encuadre y no te olvides de guardar la actividad.', 'success');
  } catch (err) {
    showAlert('No se pudo subir la foto: ' + err.message, 'error');
  } finally {
    actadPhotoUploading = false;
    actadPhotoInput.value = '';
    renderActAdPreview();
  }
});

// ---------- Vista previa en vivo (réplica de la página de detalle real) ----------
// Reutiliza EVAD_MESES_ES/evAdFmtDay/evAdFmtDateRange/evAdFmtTimeRange/
// evAdPriceLabel/evAdWebsiteUrl/evAdInstagramUrl/evAdIsUrl/evStatusLabel
// (definidos en admin-events.js, son genéricos).

function renderActAdPreview() {
  const preview = document.getElementById('actadPreview');
  if (!preview) return;

  const rawTitle = document.getElementById('actad_title').value.trim();
  const rawShortDesc = document.getElementById('actad_short_description').value.trim();
  const rawDesc = document.getElementById('actad_description').value.trim();
  const cover = document.getElementById('actad_cover_image').value.trim();
  const rawAddress = document.getElementById('actad_address').value.trim();
  const startDate = document.getElementById('actad_start_date').value;
  const endDate = document.getElementById('actad_end_date').value;
  const startTime = document.getElementById('actad_start_time').value;
  const endTime = document.getElementById('actad_end_time').value;
  const rawPhone = document.getElementById('actad_phone').value.trim();
  const rawInstagram = document.getElementById('actad_instagram').value.trim();
  const rawWebsite = document.getElementById('actad_website').value.trim();
  const status = document.getElementById('actad_status').value;
  const businessName = actadBusinessSearch.value.trim();

  const tag = actTagInfo(actadTagSelect.value);
  const org = businessName || '';

  const statusEl = document.getElementById('actadPreviewStatus');
  if (statusEl) statusEl.textContent = evStatusLabel(status).text;

  const focalX = parseFloat(actadFocalXInput.value) || 50;
  const focalY = parseFloat(actadFocalYInput.value) || 50;

  const hasCustomEnd = !!((endDate && endDate !== startDate) || endTime);
  const endHint = hasCustomEnd
    ? `Hasta ${endDate ? escapeHtml(evAdFmtDay(endDate)) : ''}${endTime ? ' · ' + escapeHtml(endTime.slice(0, 5)) + ' hs' : ''} <span style="opacity:.6;">(desde "Personalizar" arriba)</span>`
    : '';

  preview.innerHTML = `
    <div class="evad-top-card">
      <div class="detail-hero editable-cover" data-act-cover style="background:${cover ? (tag.color || '#111') : '#f0eee9'}">
        ${cover
          ? `<img src="${escapeHtml(cover)}" alt="" style="object-position:${focalX}% ${focalY}%">`
          : `<img src="images/logo-markk.png" alt="" class="evad-hero-placeholder">`}
        <span class="edit-hint">${actadPhotoUploading ? '⏳ Subiendo...' : (cover ? '📷 Cambiar · arrastrar para encuadrar' : '📷 Elegir foto')}</span>
      </div>

      <div class="detail-title evad-editable" contenteditable="true" data-act-field="title" data-placeholder="Título de la actividad">${escapeHtml(rawTitle)}</div>

      <div class="detail-cat clickable" data-act-toggle="tag">${tag.icon} ${escapeHtml(tag.label)}</div>

      <p class="evad-editable evad-short-desc" contenteditable="true" data-act-field="short_description" data-placeholder="✏️ Descripción corta">${escapeHtml(rawShortDesc)}</p>
    </div>

    <div class="detail-block">
      <h3>Cuándo</h3>
      <div class="evad-quick-datetime">
        <div class="evad-qd-field">
          <span class="evad-qd-label">Fecha</span>
          <input type="date" data-act-quickfield="start_date" value="${startDate || ''}">
        </div>
        <div class="evad-qd-field">
          <span class="evad-qd-label">Hora</span>
          <input type="time" data-act-quickfield="start_time" value="${startTime ? startTime.slice(0, 5) : ''}">
        </div>
      </div>
      ${endHint ? `<p class="field-hint" style="margin:6px 0 0;">${endHint}</p>` : ''}
    </div>

    <div class="detail-block">
      <h3>Descripción</h3>
      <p class="evad-editable" contenteditable="true" data-act-field="description" data-placeholder="Agregá una descripción de la actividad...">${escapeHtml(rawDesc)}</p>
    </div>

    <div class="detail-block">
      <h3>Lugar y contacto</h3>
      <div class="detail-row"><span class="ic">📍</span><span class="evad-editable" contenteditable="true" data-act-field="address" data-placeholder="Dirección o link de Maps">${escapeHtml(rawAddress)}</span></div>
      ${org ? `<div class="detail-row"><span class="ic">🏪</span>${escapeHtml(org)}</div>` : ''}
      <div class="detail-row"><span class="ic">📞</span><span class="evad-editable" contenteditable="true" data-act-field="phone" data-placeholder="Teléfono">${escapeHtml(rawPhone)}</span></div>
      <div class="detail-row"><span class="ic">🌐</span><span class="evad-editable" contenteditable="true" data-act-field="website" data-placeholder="Sitio web">${escapeHtml(rawWebsite)}</span></div>
      <div class="detail-row"><span class="ic">📷</span><span class="evad-editable" contenteditable="true" data-act-field="instagram" data-placeholder="Instagram">${escapeHtml(rawInstagram)}</span></div>
    </div>
  `;
}

actAdminForm.addEventListener('input', renderActAdPreview);
actAdminForm.addEventListener('change', renderActAdPreview);

// ---------- Edición directa sobre la previsualización ----------
const ACTAD_PREVIEW_TEXT_FIELDS = {
  title: 'actad_title',
  short_description: 'actad_short_description',
  description: 'actad_description',
  address: 'actad_address',
  phone: 'actad_phone',
  website: 'actad_website',
  instagram: 'actad_instagram',
};
const ACTAD_PREVIEW_QUICK_FIELDS = {
  start_date: 'actad_start_date',
  start_time: 'actad_start_time',
};

let actadCoverDragMoved = false;

function actadCloseTagPicker() {
  const el = document.getElementById('actadTagDropdown');
  if (el) el.remove();
}
function actadOpenTagPicker(anchorEl) {
  actadCloseTagPicker();
  const dd = document.createElement('div');
  dd.className = 'evad-cat-dropdown';
  dd.id = 'actadTagDropdown';
  dd.innerHTML = Object.values(ACT_TAGS).map((t) => `<div class="opt" data-tag-id="${t.id}">${t.icon} ${escapeHtml(t.label)}</div>`).join('');
  document.body.appendChild(dd);
  const rect = anchorEl.getBoundingClientRect();
  dd.style.top = (rect.bottom + 4) + 'px';
  dd.style.left = rect.left + 'px';
  dd.querySelectorAll('[data-tag-id]').forEach((opt) => {
    opt.addEventListener('click', (evt) => {
      evt.stopPropagation();
      actadTagSelect.value = opt.getAttribute('data-tag-id');
      actadTagSelect.dispatchEvent(new Event('change', { bubbles: true }));
      actadCloseTagPicker();
    });
  });
  setTimeout(() => document.addEventListener('click', actadCloseTagPicker, { once: true }), 0);
}

function actadSetupPreviewEditing() {
  const preview = document.getElementById('actadPreview');
  if (!preview) return;

  preview.addEventListener('input', (e) => {
    if (e.target.closest('[data-act-quickfield]')) { e.stopPropagation(); return; }

    const el = e.target.closest('[data-act-field]');
    if (!el || !el.isContentEditable) return;
    e.stopPropagation();
    const field = el.getAttribute('data-act-field');
    const inputId = ACTAD_PREVIEW_TEXT_FIELDS[field];
    if (inputId) {
      let val = (el.innerText || el.textContent).trim();
      if (field === 'title') val = val.toUpperCase();
      document.getElementById(inputId).value = val;
    }
  });

  preview.addEventListener('focusout', (e) => {
    const editableEl = e.target.closest('[data-act-field]');
    if (editableEl && editableEl.isContentEditable) { renderActAdPreview(); return; }
    const quickEl = e.target.closest('[data-act-quickfield]');
    if (quickEl) { renderActAdPreview(); }
  });

  preview.addEventListener('change', (e) => {
    const el = e.target.closest('[data-act-quickfield]');
    if (!el) return;
    e.stopPropagation();
    const inputId = ACTAD_PREVIEW_QUICK_FIELDS[el.getAttribute('data-act-quickfield')];
    if (inputId) document.getElementById(inputId).value = el.value;
  });

  preview.addEventListener('click', (e) => {
    const tagToggle = e.target.closest('[data-act-toggle="tag"]');
    if (tagToggle) {
      e.stopPropagation();
      actadOpenTagPicker(tagToggle);
      return;
    }
    const coverEl = e.target.closest('[data-act-cover]');
    if (coverEl && !actadCoverDragMoved && !actadPhotoUploading) {
      e.stopPropagation();
      actadPhotoInput.value = '';
      actadPhotoInput.click();
    }
  });

  let dragging = false, startX = 0, startY = 0, moved = false;
  preview.addEventListener('pointerdown', (e) => {
    const coverEl = e.target.closest('[data-act-cover]');
    if (!coverEl || !actadCoverImageInput.value || actadPhotoUploading) return;
    dragging = true; moved = false;
    startX = e.clientX; startY = e.clientY;
    const p = evadPreviewPointFromEvent(e, coverEl);
    actadApplyFocalPoint(p.x, p.y);
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const coverEl = preview.querySelector('[data-act-cover]');
    if (!coverEl) return;
    if (Math.abs(e.clientX - startX) > 4 || Math.abs(e.clientY - startY) > 4) moved = true;
    const p = evadPreviewPointFromEvent(e, coverEl);
    actadApplyFocalPoint(p.x, p.y);
  });
  window.addEventListener('pointerup', () => {
    if (dragging) {
      actadCoverDragMoved = moved;
      setTimeout(() => { actadCoverDragMoved = false; }, 0);
    }
    dragging = false;
  });
}
actadSetupPreviewEditing();

function actAdResetForm() {
  actAdminForm.reset();
  document.getElementById('actad_id').value = '';
  document.getElementById('actad_price_wrap').classList.remove('hidden');
  document.getElementById('actad_registration_wrap').classList.add('hidden');
  document.getElementById('actad_recurrence_until_wrap').classList.add('hidden');
  document.getElementById('actad_recurrence_custom_wrap').classList.add('hidden');
  document.getElementById('actad_recurrence_section').classList.remove('hidden');
  actadGalleryToggleCtl.setOpen(false);
  actadBasicToggleCtl.setOpen(false);
  actadWhenToggleCtl.setOpen(false);
  actadDateToggleCtl.setOpen(false);
  actadLocationToggleCtl.setOpen(false);
  actadPriceToggleCtl.setOpen(false);
  actadStatusToggleCtl.setOpen(false);
  actAdSetBusinessSelection('', '');
  document.getElementById('actadOwnerInfo').classList.add('hidden');
  actadPhotoFolderId = null;
  refreshActadPhotoUploadState('');
  actadApplyFocalPoint(50, 50);
}

document.getElementById('newActivityBtn').addEventListener('click', () => {
  actAdResetForm();
  document.getElementById('actAdminFormTitle').textContent = 'Nueva actividad';
  document.getElementById('actad_status').value = 'published';
  actAdShowForm();
});

function openActAdminForm(a) {
  actAdResetForm();
  document.getElementById('actAdminFormTitle').textContent = 'Editar actividad';
  document.getElementById('actad_id').value = a.id;
  document.getElementById('actad_recurrence_section').classList.add('hidden');
  actadPhotoFolderId = a.id;
  const org = a.businesses ? a.businesses.name : '';
  actAdSetBusinessSelection(a.business_id || '', org);
  document.getElementById('actad_title').value = a.title || '';
  document.getElementById('actad_short_description').value = a.short_description || '';
  document.getElementById('actad_description').value = a.description || '';
  actadTagSelect.value = a.tag || '';
  refreshActadPhotoUploadState(a.cover_image || '');
  actadApplyFocalPoint(a.cover_focal_x != null ? a.cover_focal_x : 50, a.cover_focal_y != null ? a.cover_focal_y : 50);
  document.getElementById('actad_gallery').value = (a.gallery || []).join(', ');
  if ((a.gallery || []).length) { actadGalleryWrap.classList.remove('hidden'); actadGalleryToggle.classList.add('open'); }
  document.getElementById('actad_start_date').value = a.start_date || '';
  document.getElementById('actad_end_date').value = a.end_date || '';
  document.getElementById('actad_start_time').value = a.start_time ? a.start_time.slice(0, 5) : '';
  document.getElementById('actad_end_time').value = a.end_time ? a.end_time.slice(0, 5) : '';
  document.getElementById('actad_address').value = a.address || '';
  document.getElementById('actad_phone').value = a.phone || '';
  document.getElementById('actad_whatsapp').value = a.whatsapp || '';
  document.getElementById('actad_instagram').value = a.instagram || '';
  document.getElementById('actad_website').value = a.website || '';
  actadIsFree.checked = !!a.is_free;
  document.getElementById('actad_price_wrap').classList.toggle('hidden', actadIsFree.checked);
  document.getElementById('actad_price').value = a.price != null ? a.price : '';
  actadRequiresRegistration.checked = !!a.requires_registration;
  document.getElementById('actad_registration_wrap').classList.toggle('hidden', !actadRequiresRegistration.checked);
  document.getElementById('actad_registration_url').value = a.registration_url || '';
  actadRecurrenceType.value = 'none';
  document.getElementById('actad_status').value = a.status;
  document.getElementById('actad_is_featured').checked = !!a.is_featured;
  document.getElementById('actad_featured_order').value = a.featured_order || 0;
  actAdRenderOwnerInfo(a);

  const hasCustomDate = !!(a.end_date && a.end_date !== a.start_date) || !!a.end_time || !!a.recurrence_group_id;
  actadBasicToggleCtl.setOpen(true);
  actadWhenToggleCtl.setOpen(hasCustomDate);
  actadDateToggleCtl.setOpen(hasCustomDate);
  actadLocationToggleCtl.setOpen(!!(a.address || a.phone || a.whatsapp || a.instagram || a.website));
  actadPriceToggleCtl.setOpen(!a.is_free || !!a.requires_registration);
  actadStatusToggleCtl.setOpen(true);

  actAdShowForm();
}

// ---------- Info interna: quién cargó la actividad ----------
function actAdRenderOwnerInfo(a) {
  const box = document.getElementById('actadOwnerInfo');
  const p = a.profiles || {};
  const nameLine = p.full_name || 'Cargada desde el panel de admin';
  const contactBits = [p.phone, p.email].filter(Boolean).join(' · ');
  let createdLabel = '';
  if (a.created_at) {
    const d = new Date(a.created_at);
    createdLabel = d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  box.innerHTML = `
    <span class="tag">Info interna</span><br>
    Cargada por: <b>${escapeHtml(nameLine)}</b>${contactBits ? ' · ' + escapeHtml(contactBits) : ''}
    ${createdLabel ? ` · ${escapeHtml(createdLabel)}` : ''}
  `;
  box.classList.remove('hidden');
}

actAdminForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  if (actadPhotoUploading) {
    showAlert('Esperá a que termine de subir la foto antes de guardar.', 'error');
    return;
  }

  const id = document.getElementById('actad_id').value;
  const startDate = document.getElementById('actad_start_date').value;
  const endDate = document.getElementById('actad_end_date').value || startDate;
  if (!document.getElementById('actad_title').value.trim()) { actadBasicToggleCtl.setOpen(true); showAlert('El título es obligatorio.', 'error'); return; }
  if (!actadTagSelect.value) { actadBasicToggleCtl.setOpen(true); showAlert('Elegí una etiqueta.', 'error'); return; }
  if (!startDate) { actadWhenToggleCtl.setOpen(true); showAlert('Completá la fecha.', 'error'); return; }
  if (endDate < startDate) { showAlert('La fecha de finalización no puede ser anterior a la de inicio.', 'error'); return; }

  const isFree = actadIsFree.checked;
  const requiresReg = actadRequiresRegistration.checked;
  const recurrenceType = actadRecurrenceType.value;
  const spanDays = Math.round((evAdParseDate(endDate) - evAdParseDate(startDate)) / 86400000);

  const basePayload = {
    business_id: actadBusinessIdInput.value || null,
    title: document.getElementById('actad_title').value.trim().toUpperCase(),
    short_description: document.getElementById('actad_short_description').value.trim(),
    description: document.getElementById('actad_description').value.trim(),
    tag: actadTagSelect.value,
    cover_image: document.getElementById('actad_cover_image').value.trim(),
    cover_focal_x: parseFloat(actadFocalXInput.value) || 50,
    cover_focal_y: parseFloat(actadFocalYInput.value) || 50,
    gallery: document.getElementById('actad_gallery').value.split(',').map((s) => s.trim()).filter(Boolean),
    start_time: document.getElementById('actad_start_time').value || null,
    end_time: document.getElementById('actad_end_time').value || null,
    address: document.getElementById('actad_address').value.trim(),
    phone: document.getElementById('actad_phone').value.trim(),
    whatsapp: document.getElementById('actad_whatsapp').value.trim(),
    instagram: document.getElementById('actad_instagram').value.trim(),
    website: document.getElementById('actad_website').value.trim(),
    is_free: isFree,
    price: isFree ? null : (document.getElementById('actad_price').value ? parseFloat(document.getElementById('actad_price').value) : null),
    requires_registration: requiresReg,
    registration_url: requiresReg ? document.getElementById('actad_registration_url').value.trim() : '',
    recurrence_type: recurrenceType,
    status: document.getElementById('actad_status').value,
    is_featured: document.getElementById('actad_is_featured').checked,
    featured_order: parseInt(document.getElementById('actad_featured_order').value, 10) || 0,
  };

  const saveBtn = document.getElementById('actAdminSaveBtn');
  saveBtn.disabled = true; saveBtn.textContent = 'Guardando...';

  try {
    if (id) {
      const payload = { ...basePayload, start_date: startDate, end_date: endDate };
      const { error } = await supabaseClient.from('activities').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const untilStr = document.getElementById('actad_recurrence_until').value;
      const customRaw = document.getElementById('actad_recurrence_dates').value;
      const occurrences = evAdComputeOccurrences(startDate, recurrenceType, untilStr, customRaw);
      const recurrenceGroupId = (occurrences.length > 1 && crypto.randomUUID) ? crypto.randomUUID() : null;
      const rows = occurrences.map((d) => {
        const s = evAdFmtDate(d);
        const en = evAdFmtDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + spanDays));
        return { ...basePayload, start_date: s, end_date: en, recurrence_group_id: recurrenceGroupId, owner_id: currentAdminUser.id };
      });
      const { error } = await supabaseClient.from('activities').insert(rows);
      if (error) throw error;
    }

    actAdShowList();
    showAlert('Actividad guardada.', 'success');
    await loadActAdminActivities();
  } catch (err) {
    showAlert('No se pudo guardar: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = 'Guardar actividad';
  }
});
