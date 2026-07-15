// ============================================================
// Panel de administración — sección "Eventos".
// Se carga después de js/admin.js y reutiliza sus globals:
// supabaseClient, showAlert(), clearAlert(), escapeHtml(), currentAdminUser.
// ============================================================

let evAdminCategories = [];
let evAdminBusinesses = [];
let evAdminEvents = [];
let evAdminStatusFilter = 'published';

const mainTabBusinesses = document.getElementById('mainTabBusinesses');
const mainTabEvents = document.getElementById('mainTabEvents');
const businessesSection = document.getElementById('businessesSection');
const eventsAdminSection = document.getElementById('eventsAdminSection');
const evAdminListView = document.getElementById('eventsAdminListView');
const evAdminFormView = document.getElementById('eventsAdminFormView');
const evAdminForm = document.getElementById('evAdminForm');
const evAdminList = document.getElementById('evAdminList');
const evadBusinessIdInput = document.getElementById('evad_business_id');
const evadBusinessSearch = document.getElementById('evad_business_search');
const evadBusinessResults = document.getElementById('evad_business_results');
const evadCategorySelect = document.getElementById('evad_category_id');
const evadIsOfficial = document.getElementById('evad_is_official');
const evadIsFree = document.getElementById('evad_is_free');
const evadRequiresRegistration = document.getElementById('evad_requires_registration');
const evadRecurrenceType = document.getElementById('evad_recurrence_type');

let evAdminSectionLoaded = false;

mainTabBusinesses.addEventListener('click', () => {
  showAdminSection('businessesSection');
});
mainTabEvents.addEventListener('click', () => {
  showAdminSection('eventsAdminSection');
  if (!evAdminSectionLoaded) {
    evAdminSectionLoaded = true;
    initEventsAdminSection();
  }
});

async function initEventsAdminSection() {
  await Promise.all([loadEvAdminCategories(), loadEvAdminBusinesses()]);
  await loadEvAdminEvents();
}

async function loadEvAdminCategories() {
  const { data, error } = await supabaseClient
    .from('event_categories')
    .select('id, label, icon, color, sort_order')
    .order('sort_order', { ascending: true });
  if (error) { showAlert('No se pudieron cargar las categorías: ' + error.message, 'error'); return; }
  evAdminCategories = data || [];
  const opts = '<option value="">Todas las categorías</option>' +
    evAdminCategories.map((c) => `<option value="${c.id}">${c.icon || ''} ${escapeHtml(c.label)}</option>`).join('');
  document.getElementById('evAdminCategoryFilter').innerHTML = opts;
  evadCategorySelect.innerHTML = '<option value="">Seleccioná una categoría</option>' +
    evAdminCategories.map((c) => `<option value="${c.id}">${c.icon || ''} ${escapeHtml(c.label)}</option>`).join('');
}

async function loadEvAdminBusinesses() {
  const { data, error } = await supabaseClient
    .from('businesses')
    .select('id, name')
    .order('name', { ascending: true });
  if (error) { showAlert('No se pudieron cargar los comercios: ' + error.message, 'error'); return; }
  evAdminBusinesses = data || [];
}

// ---------- Buscador de ficha organizadora (filtra localmente sobre evAdminBusinesses) ----------
function evAdSetBusinessSelection(id, name) {
  evadBusinessIdInput.value = id || '';
  evadBusinessSearch.value = name || '';
  hideEvAdBusinessResults();
  if (typeof renderEvAdPreview === 'function') renderEvAdPreview();
}
function hideEvAdBusinessResults() {
  evadBusinessResults.classList.add('hidden');
}
function renderEvAdBusinessResults(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 1) {
    evadBusinessResults.innerHTML = '<div class="autocomplete-empty">Escribí para buscar un comercio.</div>';
    evadBusinessResults.classList.remove('hidden');
    return;
  }
  const items = evAdminBusinesses.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 15);
  if (!items.length) {
    evadBusinessResults.innerHTML = '<div class="autocomplete-empty">No encontramos comercios con ese nombre.</div>';
  } else {
    evadBusinessResults.innerHTML = items.map((b) =>
      `<div class="autocomplete-item" data-business="${b.id}" data-name="${escapeHtml(b.name)}">${escapeHtml(b.name)}</div>`
    ).join('');
    evadBusinessResults.querySelectorAll('[data-business]').forEach((el) => {
      el.addEventListener('click', () => evAdSetBusinessSelection(el.getAttribute('data-business'), el.getAttribute('data-name')));
    });
  }
  evadBusinessResults.classList.remove('hidden');
}
evadBusinessSearch.addEventListener('input', () => {
  evadBusinessIdInput.value = ''; // obliga a confirmar eligiendo de la lista
  renderEvAdBusinessResults(evadBusinessSearch.value);
  if (typeof renderEvAdPreview === 'function') renderEvAdPreview();
});
evadBusinessSearch.addEventListener('focus', () => {
  if (!evadBusinessSearch.disabled) renderEvAdBusinessResults(evadBusinessSearch.value);
});
evadBusinessSearch.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideEvAdBusinessResults();
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#evad_business_search') && !e.target.closest('#evad_business_results')) {
    hideEvAdBusinessResults();
  }
});

// ---------- Listado ----------
document.getElementById('evAdminStatusTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-evstatus]');
  if (!btn) return;
  document.querySelectorAll('#evAdminStatusTabs .tab').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');
  evAdminStatusFilter = btn.getAttribute('data-evstatus');
  renderEvAdminList();
});
document.getElementById('evAdminCategoryFilter').addEventListener('change', renderEvAdminList);
document.getElementById('evAdminOrgSearch').addEventListener('input', renderEvAdminList);
document.getElementById('evAdminDateFilter').addEventListener('input', renderEvAdminList);

function evAdminIsFinished(e) {
  const [y, m, d] = (e.end_date || e.start_date).split('-').map(Number);
  const end = new Date(y, m - 1, d);
  const t = e.end_time || e.start_time || '23:59:59';
  const [h, mi] = t.split(':').map(Number);
  end.setHours(h || 23, mi || 59, 0, 0);
  return end.getTime() < Date.now();
}

async function loadEvAdminEvents() {
  evAdminList.innerHTML = '<p class="empty-state">Cargando...</p>';
  const { data, error } = await supabaseClient
    .from('events')
    .select('*, businesses(id, legacy_id, name), profiles(full_name, phone, email)')
    .order('start_date', { ascending: true });
  if (error) { evAdminList.innerHTML = ''; showAlert('No se pudo cargar el listado de eventos: ' + error.message, 'error'); return; }
  evAdminEvents = data || [];
  updateEvAdminStatusCounts();
  renderEvAdminList();
}

function updateEvAdminStatusCounts() {
  const counts = {
    pending: 0, needs_changes: 0, published: 0, featured: 0,
    finished: 0, hidden: 0, rejected: 0, all: evAdminEvents.length,
  };
  evAdminEvents.forEach((e) => {
    if (e.status in counts) counts[e.status]++;
    if (e.is_featured) counts.featured++;
    if (evAdminIsFinished(e)) counts.finished++;
  });
  document.querySelectorAll('#evAdminStatusTabs .tab-count').forEach((el) => {
    const key = el.getAttribute('data-count-for');
    el.textContent = counts[key] != null ? counts[key] : 0;
  });
}

function evStatusLabel(status) {
  const map = {
    draft: { text: 'Borrador', cls: 'badge-draft' },
    pending: { text: 'Pendiente de revisión', cls: 'badge-pending' },
    approved: { text: 'Aprobado', cls: 'badge-published' },
    published: { text: 'Publicado', cls: 'badge-published' },
    needs_changes: { text: 'Requiere modificaciones', cls: 'badge-pending' },
    rejected: { text: 'Rechazado', cls: 'badge-rejected' },
    finished: { text: 'Finalizado', cls: 'badge-draft' },
    hidden: { text: 'Oculto', cls: 'badge-draft' },
  };
  return map[status] || { text: status, cls: 'badge-draft' };
}

function renderEvAdminList() {
  let items = evAdminEvents.slice();
  const catFilter = document.getElementById('evAdminCategoryFilter').value;
  const orgSearch = document.getElementById('evAdminOrgSearch').value.trim().toLowerCase();
  const dateFilter = document.getElementById('evAdminDateFilter').value;

  if (evAdminStatusFilter === 'featured') {
    items = items.filter((e) => e.is_featured);
  } else if (evAdminStatusFilter === 'finished') {
    items = items.filter((e) => evAdminIsFinished(e));
  } else if (evAdminStatusFilter !== 'all') {
    items = items.filter((e) => e.status === evAdminStatusFilter);
  }
  if (catFilter) items = items.filter((e) => e.category_id === catFilter);
  if (dateFilter) items = items.filter((e) => e.start_date <= dateFilter && e.end_date >= dateFilter);
  if (orgSearch) {
    items = items.filter((e) => {
      const org = (e.businesses ? e.businesses.name : '') + ' ' + (e.title || '');
      return org.toLowerCase().includes(orgSearch);
    });
  }
  if (evAdminStatusFilter === 'featured') {
    items.sort((a, b) => a.featured_order - b.featured_order);
  }

  if (items.length === 0) {
    evAdminList.innerHTML = '<p class="empty-state">No hay eventos en esta vista.</p>';
    return;
  }

  evAdminList.innerHTML = '';
  items.forEach((e) => renderEvAdminCard(e));
}

function renderEvAdminCard(e) {
  const st = evStatusLabel(e.status);
  const cat = evAdminCategories.find((c) => c.id === e.category_id) || {};
  const owner = e.profiles || {};
  const org = e.businesses ? e.businesses.name : (e.is_official ? 'Municipalidad (oficial)' : '(sin ficha)');
  const dateLabel = e.start_date === e.end_date ? e.start_date : `${e.start_date} → ${e.end_date}`;

  const card = document.createElement('div');
  card.className = 'card admin-card';
  card.innerHTML = `
    <div class="top">
      <div>
        <div class="name">${escapeHtml(e.title)}</div>
        <div class="cat">${cat.icon || ''} ${escapeHtml(cat.label || e.category_id)}</div>
      </div>
      <span class="badge ${st.cls}">${st.text}</span>
    </div>
    <dl>
      <dt>Organiza</dt>
      <dd>${escapeHtml(org)} ${e.business_id ? `<a href="admin.html" onclick="event.preventDefault(); document.getElementById('mainTabBusinesses').click();" style="color:var(--primary-dark); font-weight:700;">(ver ficha)</a>` : ''}</dd>

      <dt>Cuándo</dt>
      <dd>${escapeHtml(dateLabel)}${e.start_time ? ' · ' + e.start_time.slice(0, 5) : ''}${e.end_time ? ' a ' + e.end_time.slice(0, 5) : ''}</dd>

      <dt>Cargado por</dt>
      <dd>${escapeHtml(owner.full_name) || '(sin nombre)'} ${owner.phone ? '· ' + escapeHtml(owner.phone) : ''}</dd>

      <dt>Vistas</dt>
      <dd>👁 ${e.views_count || 0}${e.is_featured ? ' · ★ Destacado (orden ' + e.featured_order + ')' : ''}</dd>

      ${e.review_note ? `<dt>Observación cargada</dt><dd>${escapeHtml(e.review_note)}</dd>` : ''}
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

  if (e.status !== 'published') btn('Aprobar y publicar', 'btn-primary', () => setEvStatus(e.id, 'published'));
  if (e.status !== 'needs_changes') btn('Pedir cambios', 'btn-secondary', () => requestEvChanges(e.id));
  if (e.status !== 'rejected') btn('Rechazar', 'btn-secondary', () => rejectEv(e.id));
  if (e.status !== 'hidden') btn('Ocultar', 'btn-secondary', () => setEvStatus(e.id, 'hidden'));
  else btn('Volver a publicar', 'btn-secondary', () => setEvStatus(e.id, 'published'));
  btn(e.is_featured ? 'Quitar destacado' : 'Destacar', 'btn-secondary', () => toggleEvFeatured(e));
  if (e.is_featured) {
    btn('▲ Subir', 'btn-secondary', () => reorderFeatured(e, -1));
    btn('▼ Bajar', 'btn-secondary', () => reorderFeatured(e, 1));
  }
  btn('Editar', 'btn-secondary', () => openEvAdminForm(e));
  btn('Eliminar', 'btn-danger', () => deleteEvAdmin(e.id));

  evAdminList.appendChild(card);
}

async function setEvStatus(id, status, review_note) {
  const payload = { status };
  if (review_note !== undefined) payload.review_note = review_note;
  if (status === 'published' || status === 'approved') payload.review_note = null;
  const { error } = await supabaseClient.from('events').update(payload).eq('id', id);
  if (error) { showAlert('No se pudo actualizar: ' + error.message, 'error'); return; }
  showAlert('Evento actualizado.', 'success');
  loadEvAdminEvents();
}
function requestEvChanges(id) {
  const note = window.prompt('¿Qué tiene que corregir el organizador? (obligatorio, lo va a ver en su panel)');
  if (note === null) return;
  if (!note.trim()) { showAlert('Escribí una observación para el organizador.', 'error'); return; }
  setEvStatus(id, 'needs_changes', note.trim());
}
function rejectEv(id) {
  const note = window.prompt('¿Por qué se rechaza? (opcional, lo puede ver el organizador)') || '';
  setEvStatus(id, 'rejected', note.trim());
}
async function toggleEvFeatured(e) {
  const { error } = await supabaseClient.from('events').update({ is_featured: !e.is_featured }).eq('id', e.id);
  if (error) { showAlert('No se pudo actualizar: ' + error.message, 'error'); return; }
  loadEvAdminEvents();
}
async function reorderFeatured(e, delta) {
  const { error } = await supabaseClient.from('events').update({ featured_order: (e.featured_order || 0) + delta }).eq('id', e.id);
  if (error) { showAlert('No se pudo reordenar: ' + error.message, 'error'); return; }
  loadEvAdminEvents();
}
async function deleteEvAdmin(id) {
  if (!confirm('¿Eliminar este evento definitivamente?')) return;
  const { error } = await supabaseClient.from('events').delete().eq('id', id);
  if (error) { showAlert('No se pudo eliminar: ' + error.message, 'error'); return; }
  showAlert('Evento eliminado.', 'success');
  loadEvAdminEvents();
}

// ---------- Formulario (crear oficial / editar cualquiera) ----------
// La página de carga de evento se ve "limpia": sin topbar ni la barra de
// secciones (Comercios/Eventos/Novedades/...), solo la flecha para volver.
function evAdSetChromeVisible(visible) {
  const topbar = document.querySelector('.topbar');
  const tabs = document.querySelector('.section-tabs');
  if (topbar) topbar.classList.toggle('hidden', !visible);
  if (tabs) tabs.classList.toggle('hidden', !visible);
}
function evAdShowList() {
  evAdminFormView.classList.add('hidden');
  evAdminListView.classList.remove('hidden');
  evAdSetChromeVisible(true);
  clearAlert();
}
function evAdShowForm() {
  evAdminListView.classList.add('hidden');
  evAdminFormView.classList.remove('hidden');
  evAdSetChromeVisible(false);
  renderEvAdPreview();
  window.scrollTo(0, 0);
}
document.getElementById('evAdminCancelBtn').addEventListener('click', evAdShowList);
document.getElementById('evAdminBackBtn').addEventListener('click', evAdShowList);

evadIsFree.addEventListener('change', () => document.getElementById('evad_price_wrap').classList.toggle('hidden', evadIsFree.checked));
evadRequiresRegistration.addEventListener('change', () => document.getElementById('evad_registration_wrap').classList.toggle('hidden', !evadRequiresRegistration.checked));
evadIsOfficial.addEventListener('change', () => {
  evadBusinessSearch.disabled = evadIsOfficial.checked;
  if (evadIsOfficial.checked) evAdSetBusinessSelection('', '');
  renderEvAdPreview();
});
evadRecurrenceType.addEventListener('change', () => {
  const t = evadRecurrenceType.value;
  document.getElementById('evad_recurrence_until_wrap').classList.toggle('hidden', t === 'none' || t === 'custom');
  document.getElementById('evad_recurrence_custom_wrap').classList.toggle('hidden', t !== 'custom');
});

// ---------- Secciones colapsables: colapsadas por defecto, se abren con un click ----------
// Reutilizado para: galería adicional, personalizar fecha (fin/hora fin/repetición),
// precio e inscripción, y estado y visibilidad. La idea es poder cargar un evento
// rápido con lo mínimo, y solo entrar a estos detalles si hace falta.
function evAdSetupToggle(toggleId, wrapId) {
  const toggle = document.getElementById(toggleId);
  const wrap = document.getElementById(wrapId);
  function setOpen(open) {
    wrap.classList.toggle('hidden', !open);
    toggle.classList.toggle('open', open);
  }
  toggle.addEventListener('click', () => setOpen(wrap.classList.contains('hidden')));
  return { setOpen, isOpen: () => !wrap.classList.contains('hidden') };
}

const evadGalleryToggleCtl = evAdSetupToggle('evadGalleryToggle', 'evadGalleryWrap');
const evadBasicToggleCtl = evAdSetupToggle('evadBasicToggle', 'evadBasicWrap');
const evadWhenToggleCtl = evAdSetupToggle('evadWhenToggle', 'evadWhenWrap');
const evadDateToggleCtl = evAdSetupToggle('evadDateToggle', 'evadDateAdvancedWrap');
const evadLocationToggleCtl = evAdSetupToggle('evadLocationToggle', 'evadLocationWrap');
const evadPriceToggleCtl = evAdSetupToggle('evadPriceToggle', 'evadPriceWrap');
const evadStatusToggleCtl = evAdSetupToggle('evadStatusToggle', 'evadStatusWrap');
// Se mantienen estos nombres para no romper referencias existentes.
const evadGalleryToggle = document.getElementById('evadGalleryToggle');
const evadGalleryWrap = document.getElementById('evadGalleryWrap');

// ---------- Foto de portada (subir, SIN recortar), bucket "event-images" ----------
// No depende de que el evento ya exista: si es nuevo se usa un id temporal
// generado en el navegador como carpeta, y esa misma URL queda guardada en
// el campo oculto evad_cover_image hasta que se guarda el formulario.
// A diferencia de comercios/destacados/lugares, acá NO se recorta la imagen:
// se sube completa (solo redimensionada si es muy grande) para que en la
// tarjeta se vea recortada por CSS (object-fit:cover) pero al entrar a
// verla en grande se vea siempre entera, sin recorte.
// Elegir foto y ajustar el encuadre se hace directamente desde la
// previsualización de arriba (evadPreview); acá solo quedan los campos
// ocultos (evad_cover_image, evad_cover_focal_x/y) y el <input type=file>.
let evadPhotoFolderId = null;
let evadPhotoUploading = false;

const evadCoverImageInput = document.getElementById('evad_cover_image');
const evadPhotoInput = document.getElementById('evadPhotoInput');
const evadFocalXInput = document.getElementById('evad_cover_focal_x');
const evadFocalYInput = document.getElementById('evad_cover_focal_y');

function refreshEvadPhotoUploadState(currentPhotoUrl) {
  evadCoverImageInput.value = currentPhotoUrl || '';
}

// ---------- Punto de encuadre de la portada ----------
// La foto se guarda siempre completa (sin recorte destructivo); este punto
// solo controla qué parte queda visible en el recorte de la tarjeta
// (object-position), tocando o arrastrando sobre la previsualización.
function evadApplyFocalPoint(xPct, yPct) {
  const x = Math.max(0, Math.min(100, xPct));
  const y = Math.max(0, Math.min(100, yPct));
  evadFocalXInput.value = x.toFixed(1);
  evadFocalYInput.value = y.toFixed(1);
  renderEvAdPreview();
}

function evadResizeImageToBlob(file, maxSide) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSide || height > maxSide) {
          if (width >= height) { height = Math.round(height * (maxSide / width)); width = maxSide; }
          else { width = Math.round(width * (maxSide / height)); height = maxSide; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('No se pudo procesar la imagen.')), 'image/jpeg', 0.88);
      };
      img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

evadPhotoInput.addEventListener('change', async () => {
  const file = evadPhotoInput.files && evadPhotoInput.files[0];
  if (!file) return;

  evadPhotoUploading = true;
  renderEvAdPreview(); // muestra "Subiendo..." en la previsualización

  try {
    const blob = await evadResizeImageToBlob(file, 1800);
    if (!evadPhotoFolderId) evadPhotoFolderId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    const path = `${evadPhotoFolderId}/cover-${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseClient.storage
      .from('event-images')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;

    const { data: pub } = supabaseClient.storage.from('event-images').getPublicUrl(path);
    refreshEvadPhotoUploadState(pub.publicUrl);
    evadApplyFocalPoint(50, 50); // foto nueva: arranca centrada, se puede ajustar arrastrando en la preview
    showAlert('Foto lista. Arrastrá sobre la foto para elegir el encuadre y no te olvides de guardar el evento.', 'success');
  } catch (err) {
    showAlert('No se pudo subir la foto: ' + err.message, 'error');
  } finally {
    evadPhotoUploading = false;
    evadPhotoInput.value = '';
    renderEvAdPreview();
  }
});

// ---------- Vista previa en vivo (réplica de la página de detalle real del evento) ----------
// Mismas funciones de formato de fecha/hora/precio/links que usa index.html
// (MESES_ES, fmtDay, fmtDateRange, fmtTimeRange, priceLabel, organizerName, websiteUrl,
// instagramUrl) para que se vea igual a lo que el visitante ve al entrar al evento.
const EVAD_MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function evAdFmtDay(dateStr) {
  const d = evAdParseDate(dateStr);
  return `${d.getDate()} de ${EVAD_MESES_ES[d.getMonth()]}`;
}
function evAdFmtDateRange(startStr, endStr) {
  if (!startStr) return '';
  if (startStr === endStr || !endStr) return evAdFmtDay(startStr);
  const d1 = evAdParseDate(startStr);
  const d2 = evAdParseDate(endStr);
  if (d1.getMonth() === d2.getMonth()) return `Del ${d1.getDate()} al ${d2.getDate()} de ${EVAD_MESES_ES[d2.getMonth()]}`;
  return `Del ${evAdFmtDay(startStr)} al ${evAdFmtDay(endStr)}`;
}
function evAdFmtTimeRange(startTime, endTime) {
  if (startTime && endTime) return `${startTime.slice(0, 5)} a ${endTime.slice(0, 5)} hs`;
  if (startTime) return `Desde las ${startTime.slice(0, 5)} hs`;
  return '';
}
function evAdPriceLabel(isFree, price) {
  if (isFree) return 'Gratis';
  if (price != null && price !== '') return `$${Number(price).toLocaleString('es-AR')}`;
  return '';
}
function evAdWebsiteUrl(v) {
  if (!v) return '';
  v = v.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return 'https://' + v;
}
function evAdInstagramUrl(v) {
  if (!v) return '';
  v = v.trim();
  if (/^https?:\/\//i.test(v)) return v;
  return 'https://instagram.com/' + v.replace(/^@/, '');
}
function evAdIsUrl(v) {
  return /^https?:\/\//i.test((v || '').trim());
}

function renderEvAdPreview() {
  const preview = document.getElementById('evadPreview');
  if (!preview) return;

  const rawTitle = document.getElementById('evad_title').value.trim();
  const rawDesc = document.getElementById('evad_description').value.trim();
  const cover = document.getElementById('evad_cover_image').value.trim();
  const rawAddress = document.getElementById('evad_address').value.trim();
  const startDate = document.getElementById('evad_start_date').value;
  const endDate = document.getElementById('evad_end_date').value;
  const startTime = document.getElementById('evad_start_time').value;
  const endTime = document.getElementById('evad_end_time').value;
  const rawPhone = document.getElementById('evad_phone').value.trim();
  const rawInstagram = document.getElementById('evad_instagram').value.trim();
  const rawWebsite = document.getElementById('evad_website').value.trim();
  const rawPrice = document.getElementById('evad_price').value;
  const isFree = evadIsFree.checked;
  const requiresReg = evadRequiresRegistration.checked;
  const isOfficial = evadIsOfficial.checked;
  const status = document.getElementById('evad_status').value;
  const businessName = evadBusinessSearch.value.trim();

  const cat = evAdminCategories.find((c) => c.id === evadCategorySelect.value) || {};
  const org = businessName ? businessName : (isOfficial ? 'Municipalidad de Potrero de los Funes' : '');

  const statusEl = document.getElementById('evadPreviewStatus');
  if (statusEl) statusEl.textContent = evStatusLabel(status).text;

  const focalX = parseFloat(evadFocalXInput.value) || 50;
  const focalY = parseFloat(evadFocalYInput.value) || 50;

  const hasCustomEnd = !!((endDate && endDate !== startDate) || endTime);
  const endHint = hasCustomEnd
    ? `Hasta ${endDate ? escapeHtml(evAdFmtDay(endDate)) : ''}${endTime ? ' · ' + escapeHtml(endTime.slice(0, 5)) + ' hs' : ''} <span style="opacity:.6;">(desde "Personalizar" arriba)</span>`
    : '';

  // Los campos "básicos" se pueden editar tocando directamente acá (además de
  // en el formulario de arriba): título, categoría, fecha/hora de inicio,
  // precio/inscripción, descripción, dirección, teléfono, web e instagram.
  // La foto: tocar para elegir otra, arrastrar para ajustar el encuadre.
  preview.innerHTML = `
    <div class="detail-hero editable-cover" data-ev-cover style="background:${cat.color || '#111'}">
      ${cover
        ? `<img src="${escapeHtml(cover)}" alt="" style="object-position:${focalX}% ${focalY}%">`
        : `<img src="images/logo-markk.png" alt="" class="evad-hero-placeholder">`}
      <span class="edit-hint">${evadPhotoUploading ? '⏳ Subiendo...' : (cover ? '📷 Cambiar · arrastrar para encuadrar' : '📷 Elegir foto')}</span>
    </div>

    <div class="detail-title evad-editable" contenteditable="true" data-ev-field="title" data-placeholder="Título del evento">${escapeHtml(rawTitle)}</div>

    <div class="detail-cat clickable" data-ev-toggle="category">${cat.icon || '🏷️'} ${escapeHtml(cat.label || 'Elegir categoría')}</div>

    <div class="event-badges">
      <span class="badge ${isFree ? 'free' : 'price'} clickable" data-ev-toggle="is_free">${isFree
        ? '● Entrada gratuita'
        : `● $<span class="evad-editable" contenteditable="true" data-ev-field="price" data-placeholder="precio">${rawPrice ? escapeHtml(String(rawPrice)) : ''}</span>`}</span>
      <span class="badge price clickable" data-ev-toggle="requires_registration">${requiresReg ? '● Requiere inscripción' : '+ Requiere inscripción'}</span>
    </div>

    <div class="detail-block">
      <h3>Cuándo</h3>
      <div class="evad-quick-datetime">
        <input type="date" data-ev-quickfield="start_date" value="${startDate || ''}">
        <input type="time" data-ev-quickfield="start_time" value="${startTime ? startTime.slice(0, 5) : ''}">
      </div>
      ${endHint ? `<p class="field-hint" style="margin:6px 0 0;">${endHint}</p>` : ''}
    </div>

    <div class="detail-block">
      <h3>Descripción</h3>
      <p class="evad-editable" contenteditable="true" data-ev-field="description" data-placeholder="Agregá una descripción del evento...">${escapeHtml(rawDesc)}</p>
    </div>

    <div class="detail-block">
      <h3>Lugar y contacto</h3>
      <div class="detail-row"><span class="ic">📍</span><span class="evad-editable" contenteditable="true" data-ev-field="address" data-placeholder="Dirección o link de Maps">${escapeHtml(rawAddress)}</span></div>
      ${org ? `<div class="detail-row"><span class="ic">🏪</span>${escapeHtml(org)}</div>` : ''}
      <div class="detail-row"><span class="ic">📞</span><span class="evad-editable" contenteditable="true" data-ev-field="phone" data-placeholder="Teléfono">${escapeHtml(rawPhone)}</span></div>
      <div class="detail-row"><span class="ic">🌐</span><span class="evad-editable" contenteditable="true" data-ev-field="website" data-placeholder="Sitio web">${escapeHtml(rawWebsite)}</span></div>
      <div class="detail-row"><span class="ic">📷</span><span class="evad-editable" contenteditable="true" data-ev-field="instagram" data-placeholder="Instagram">${escapeHtml(rawInstagram)}</span></div>
    </div>
  `;
}

evAdminForm.addEventListener('input', renderEvAdPreview);
evAdminForm.addEventListener('change', renderEvAdPreview);

// ---------- Edición directa sobre la previsualización ----------
// #evadPreview es un contenedor fijo (solo se reemplaza su innerHTML en cada
// render), así que los listeners se atan una sola vez acá con delegación en
// vez de reatarse en cada renderEvAdPreview().
const EVAD_PREVIEW_TEXT_FIELDS = {
  title: 'evad_title',
  description: 'evad_description',
  address: 'evad_address',
  phone: 'evad_phone',
  website: 'evad_website',
  instagram: 'evad_instagram',
};
const EVAD_PREVIEW_QUICK_FIELDS = {
  start_date: 'evad_start_date',
  start_time: 'evad_start_time',
};

let evadCoverDragMoved = false;

function evadPreviewPointFromEvent(evt, el) {
  const rect = el.getBoundingClientRect();
  const point = (evt.touches && evt.touches[0]) ? evt.touches[0] : evt;
  return {
    x: ((point.clientX - rect.left) / rect.width) * 100,
    y: ((point.clientY - rect.top) / rect.height) * 100,
  };
}

function evadCloseCategoryPicker() {
  const el = document.getElementById('evadCatDropdown');
  if (el) el.remove();
}
function evadOpenCategoryPicker(anchorEl) {
  evadCloseCategoryPicker();
  const dd = document.createElement('div');
  dd.className = 'evad-cat-dropdown';
  dd.id = 'evadCatDropdown';
  dd.innerHTML = evAdminCategories.length
    ? evAdminCategories.map((c) => `<div class="opt" data-cat-id="${c.id}">${c.icon || ''} ${escapeHtml(c.label)}</div>`).join('')
    : '<div class="opt" style="opacity:.6;">No hay categorías</div>';
  document.body.appendChild(dd);
  const rect = anchorEl.getBoundingClientRect();
  dd.style.top = (rect.bottom + 4) + 'px';
  dd.style.left = rect.left + 'px';
  dd.querySelectorAll('[data-cat-id]').forEach((opt) => {
    opt.addEventListener('click', (evt) => {
      evt.stopPropagation();
      evadCategorySelect.value = opt.getAttribute('data-cat-id');
      evadCategorySelect.dispatchEvent(new Event('change', { bubbles: true }));
      evadCloseCategoryPicker();
    });
  });
  setTimeout(() => document.addEventListener('click', evadCloseCategoryPicker, { once: true }), 0);
}

function evadSetupPreviewEditing() {
  const preview = document.getElementById('evadPreview');
  if (!preview) return;

  // Texto (título, descripción, dirección, teléfono, web, instagram, precio):
  // se sincroniza el valor real en cada tecla, pero SIN re-renderizar todo
  // (perdería el cursor); se corta la burbuja para que el listener global del
  // form no dispare un render completo mientras se está escribiendo.
  preview.addEventListener('input', (e) => {
    // Los inputs nativos de fecha/hora disparan 'input' mientras el usuario
    // todavía está interactuando con el selector (antes de elegir un valor
    // final); si eso llegaba a burbujear hasta el listener global del form,
    // se re-renderizaba toda la preview a mitad de la interacción y el
    // selector nativo se cerraba solo. Se corta acá sin sincronizar todavía
    // (la sincronización real pasa en 'change', cuando el valor ya quedó fijo).
    if (e.target.closest('[data-ev-quickfield]')) { e.stopPropagation(); return; }

    const el = e.target.closest('[data-ev-field]');
    if (!el || !el.isContentEditable) return;
    e.stopPropagation();
    const field = el.getAttribute('data-ev-field');
    if (field === 'price') {
      document.getElementById('evad_price').value = el.textContent.replace(/[^0-9.]/g, '');
      return;
    }
    const inputId = EVAD_PREVIEW_TEXT_FIELDS[field];
    if (inputId) document.getElementById(inputId).value = (el.innerText || el.textContent).trim();
  });

  // Al salir del campo se re-renderiza una vez para normalizar (formato de
  // precio, placeholder si quedó vacío, etc.) — y también para los inputs de
  // fecha/hora: en varios navegadores de celular 'change' se dispara MIENTRAS
  // el selector nativo sigue abierto (por ejemplo en cada vuelta de la rueda
  // de fecha/hora), y si ahí mismo se reconstruye el DOM el selector se
  // cierra solo a mitad de la interacción. Por eso el re-render se posterga
  // siempre hasta 'focusout' (cuando el selector ya se cerró de verdad).
  preview.addEventListener('focusout', (e) => {
    const editableEl = e.target.closest('[data-ev-field]');
    if (editableEl && editableEl.isContentEditable) { renderEvAdPreview(); return; }
    const quickEl = e.target.closest('[data-ev-quickfield]');
    if (quickEl) { renderEvAdPreview(); }
  });

  // Fecha/hora de inicio: inputs nativos embebidos en la previsualización.
  // Acá solo se sincroniza el valor real; el re-render queda para 'focusout'.
  preview.addEventListener('change', (e) => {
    const el = e.target.closest('[data-ev-quickfield]');
    if (!el) return;
    e.stopPropagation();
    const inputId = EVAD_PREVIEW_QUICK_FIELDS[el.getAttribute('data-ev-quickfield')];
    if (inputId) document.getElementById(inputId).value = el.value;
  });

  // Clicks: gratis/pago, requiere inscripción, categoría, foto.
  preview.addEventListener('click', (e) => {
    if (e.target.closest('[data-ev-field="price"]')) return; // dejar que se edite el número, no togglear

    const freeToggle = e.target.closest('[data-ev-toggle="is_free"]');
    if (freeToggle) {
      e.stopPropagation();
      evadIsFree.checked = !evadIsFree.checked;
      evadIsFree.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    const regToggle = e.target.closest('[data-ev-toggle="requires_registration"]');
    if (regToggle) {
      e.stopPropagation();
      evadRequiresRegistration.checked = !evadRequiresRegistration.checked;
      evadRequiresRegistration.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    const catToggle = e.target.closest('[data-ev-toggle="category"]');
    if (catToggle) {
      e.stopPropagation();
      evadOpenCategoryPicker(catToggle);
      return;
    }
    const coverEl = e.target.closest('[data-ev-cover]');
    if (coverEl && !evadCoverDragMoved && !evadPhotoUploading) {
      e.stopPropagation();
      evadPhotoInput.value = '';
      evadPhotoInput.click();
    }
  });

  // Portada: arrastrar para elegir qué parte se ve (mismo mecanismo que la
  // vista previa chica de arriba, aplicado acá también).
  let dragging = false, startX = 0, startY = 0, moved = false;
  preview.addEventListener('pointerdown', (e) => {
    const coverEl = e.target.closest('[data-ev-cover]');
    if (!coverEl || !evadCoverImageInput.value || evadPhotoUploading) return;
    dragging = true; moved = false;
    startX = e.clientX; startY = e.clientY;
    const p = evadPreviewPointFromEvent(e, coverEl);
    evadApplyFocalPoint(p.x, p.y);
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const coverEl = preview.querySelector('[data-ev-cover]');
    if (!coverEl) return;
    if (Math.abs(e.clientX - startX) > 4 || Math.abs(e.clientY - startY) > 4) moved = true;
    const p = evadPreviewPointFromEvent(e, coverEl);
    evadApplyFocalPoint(p.x, p.y);
  });
  window.addEventListener('pointerup', () => {
    if (dragging) {
      evadCoverDragMoved = moved;
      setTimeout(() => { evadCoverDragMoved = false; }, 0);
    }
    dragging = false;
  });
}
evadSetupPreviewEditing();

function evAdResetForm() {
  evAdminForm.reset();
  document.getElementById('evad_id').value = '';
  document.getElementById('evad_price_wrap').classList.remove('hidden');
  document.getElementById('evad_registration_wrap').classList.add('hidden');
  document.getElementById('evad_recurrence_until_wrap').classList.add('hidden');
  document.getElementById('evad_recurrence_custom_wrap').classList.add('hidden');
  document.getElementById('evad_recurrence_section').classList.remove('hidden'); // solo se oculta al editar
  evadGalleryToggleCtl.setOpen(false);
  evadBasicToggleCtl.setOpen(false);
  evadWhenToggleCtl.setOpen(false);
  evadDateToggleCtl.setOpen(false);
  evadLocationToggleCtl.setOpen(false);
  evadPriceToggleCtl.setOpen(false);
  evadStatusToggleCtl.setOpen(false);
  evadBusinessSearch.disabled = false;
  evAdSetBusinessSelection('', '');
  document.getElementById('evadOwnerInfo').classList.add('hidden');
  evadPhotoFolderId = null;
  refreshEvadPhotoUploadState('');
  evadApplyFocalPoint(50, 50);
}

document.getElementById('newOfficialEventBtn').addEventListener('click', () => {
  evAdResetForm();
  document.getElementById('evAdminFormTitle').textContent = 'Nuevo evento';
  evadIsOfficial.checked = true;
  evadBusinessSearch.disabled = true;
  document.getElementById('evad_status').value = 'published';
  evAdShowForm();
});

function openEvAdminForm(e) {
  evAdResetForm();
  document.getElementById('evAdminFormTitle').textContent = 'Editar evento';
  document.getElementById('evad_id').value = e.id;
  document.getElementById('evad_recurrence_section').classList.add('hidden'); // editar una fila puntual no regenera la serie
  evadPhotoFolderId = e.id;
  evadIsOfficial.checked = !!e.is_official;
  evadBusinessSearch.disabled = !!e.is_official;
  const org = e.businesses ? e.businesses.name : '';
  evAdSetBusinessSelection(e.business_id || '', org);
  document.getElementById('evad_title').value = e.title || '';
  document.getElementById('evad_short_description').value = e.short_description || '';
  document.getElementById('evad_description').value = e.description || '';
  evadCategorySelect.value = e.category_id || '';
  refreshEvadPhotoUploadState(e.cover_image || '');
  evadApplyFocalPoint(e.cover_focal_x != null ? e.cover_focal_x : 50, e.cover_focal_y != null ? e.cover_focal_y : 50);
  document.getElementById('evad_gallery').value = (e.gallery || []).join(', ');
  if ((e.gallery || []).length) { evadGalleryWrap.classList.remove('hidden'); evadGalleryToggle.classList.add('open'); }
  document.getElementById('evad_start_date').value = e.start_date || '';
  document.getElementById('evad_end_date').value = e.end_date || '';
  document.getElementById('evad_start_time').value = e.start_time ? e.start_time.slice(0, 5) : '';
  document.getElementById('evad_end_time').value = e.end_time ? e.end_time.slice(0, 5) : '';
  document.getElementById('evad_address').value = e.address || '';
  document.getElementById('evad_phone').value = e.phone || '';
  document.getElementById('evad_whatsapp').value = e.whatsapp || '';
  document.getElementById('evad_instagram').value = e.instagram || '';
  document.getElementById('evad_website').value = e.website || '';
  evadIsFree.checked = !!e.is_free;
  document.getElementById('evad_price_wrap').classList.toggle('hidden', evadIsFree.checked);
  document.getElementById('evad_price').value = e.price != null ? e.price : '';
  evadRequiresRegistration.checked = !!e.requires_registration;
  document.getElementById('evad_registration_wrap').classList.toggle('hidden', !evadRequiresRegistration.checked);
  document.getElementById('evad_registration_url').value = e.registration_url || '';
  evadRecurrenceType.value = 'none'; // editar una fila puntual no regenera la serie
  document.getElementById('evad_status').value = e.status;
  document.getElementById('evad_is_featured').checked = !!e.is_featured;
  document.getElementById('evad_featured_order').value = e.featured_order || 0;
  evAdRenderOwnerInfo(e);

  // Auto-abrir las secciones colapsadas que tengan datos no-default cargados,
  // para no esconder información relevante al editar un evento existente.
  const hasCustomDate = !!(e.end_date && e.end_date !== e.start_date) || !!e.end_time || !!e.recurrence_group_id;
  evadBasicToggleCtl.setOpen(true); // al editar conviene ver organizador/descripción corta
  evadWhenToggleCtl.setOpen(hasCustomDate);
  evadDateToggleCtl.setOpen(hasCustomDate);
  evadLocationToggleCtl.setOpen(!!(e.address || e.phone || e.whatsapp || e.instagram || e.website));
  evadPriceToggleCtl.setOpen(!e.is_free || !!e.requires_registration);
  evadStatusToggleCtl.setOpen(true); // al editar siempre conviene ver estado/destacado

  evAdShowForm();
}

// ---------- Info interna: quién cargó el evento (no se muestra públicamente) ----------
function evAdRenderOwnerInfo(e) {
  const box = document.getElementById('evadOwnerInfo');
  const p = e.profiles || {};
  const nameLine = e.is_official
    ? 'Evento oficial (cargado desde el panel de admin)'
    : (p.full_name || '(sin nombre cargado)');
  const contactBits = [p.phone, p.email].filter(Boolean).join(' · ');
  let createdLabel = '';
  if (e.created_at) {
    const d = new Date(e.created_at);
    createdLabel = d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  box.innerHTML = `
    <span class="tag">Info interna</span><br>
    Cargado por: <b>${escapeHtml(nameLine)}</b>${contactBits ? ' · ' + escapeHtml(contactBits) : ''}
    ${createdLabel ? ` · ${escapeHtml(createdLabel)}` : ''}
  `;
  box.classList.remove('hidden');
}

function evAdParseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function evAdFmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function evAdComputeOccurrences(startStr, type, untilStr, customRaw) {
  const start = evAdParseDate(startStr);
  if (type === 'none') return [start];
  if (type === 'custom') {
    const parsed = (customRaw || '').split('\n').map((s) => s.trim()).filter(Boolean).map(evAdParseDate);
    parsed.sort((a, b) => a - b);
    return parsed.length ? parsed : [start];
  }
  const until = untilStr ? evAdParseDate(untilStr) : (() => { const d = new Date(start); d.setMonth(d.getMonth() + 3); return d; })();
  const dows = type === 'weekly_fri' ? [5] : type === 'weekly_sat' ? [6] : type === 'weekend' ? [5, 6] : [start.getDay()];
  const results = [];
  const cursor = new Date(start);
  while (cursor <= until && results.length < 26) {
    if (dows.includes(cursor.getDay())) results.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return results.length ? results : [start];
}

evAdminForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const id = document.getElementById('evad_id').value;
  const startDate = document.getElementById('evad_start_date').value;
  // Si no se personalizó la fecha de fin (sección oculta por defecto), el evento dura un solo día.
  const endDate = document.getElementById('evad_end_date').value || startDate;
  if (!document.getElementById('evad_title').value.trim()) { evadBasicToggleCtl.setOpen(true); showAlert('El título es obligatorio.', 'error'); return; }
  if (!evadCategorySelect.value) { evadBasicToggleCtl.setOpen(true); showAlert('Elegí una categoría.', 'error'); return; }
  if (!startDate) { evadWhenToggleCtl.setOpen(true); showAlert('Completá la fecha.', 'error'); return; }
  if (endDate < startDate) { showAlert('La fecha de finalización no puede ser anterior a la de inicio.', 'error'); return; }

  const isFree = evadIsFree.checked;
  const requiresReg = evadRequiresRegistration.checked;
  const isOfficial = evadIsOfficial.checked;
  const recurrenceType = evadRecurrenceType.value;
  const spanDays = Math.round((evAdParseDate(endDate) - evAdParseDate(startDate)) / 86400000);

  const basePayload = {
    business_id: isOfficial ? null : (evadBusinessIdInput.value || null),
    is_official: isOfficial,
    title: document.getElementById('evad_title').value.trim(),
    short_description: document.getElementById('evad_short_description').value.trim(),
    description: document.getElementById('evad_description').value.trim(),
    category_id: evadCategorySelect.value,
    cover_image: document.getElementById('evad_cover_image').value.trim(),
    cover_focal_x: parseFloat(evadFocalXInput.value) || 50,
    cover_focal_y: parseFloat(evadFocalYInput.value) || 50,
    gallery: document.getElementById('evad_gallery').value.split(',').map((s) => s.trim()).filter(Boolean),
    start_time: document.getElementById('evad_start_time').value || null,
    end_time: document.getElementById('evad_end_time').value || null,
    address: document.getElementById('evad_address').value.trim(),
    phone: document.getElementById('evad_phone').value.trim(),
    whatsapp: document.getElementById('evad_whatsapp').value.trim(),
    instagram: document.getElementById('evad_instagram').value.trim(),
    website: document.getElementById('evad_website').value.trim(),
    is_free: isFree,
    price: isFree ? null : (document.getElementById('evad_price').value ? parseFloat(document.getElementById('evad_price').value) : null),
    requires_registration: requiresReg,
    registration_url: requiresReg ? document.getElementById('evad_registration_url').value.trim() : '',
    recurrence_type: recurrenceType,
    status: document.getElementById('evad_status').value,
    is_featured: document.getElementById('evad_is_featured').checked,
    featured_order: parseInt(document.getElementById('evad_featured_order').value, 10) || 0,
  };

  const saveBtn = document.getElementById('evAdminSaveBtn');
  saveBtn.disabled = true; saveBtn.textContent = 'Guardando...';

  try {
    if (id) {
      const payload = { ...basePayload, start_date: startDate, end_date: endDate };
      const { error } = await supabaseClient.from('events').update(payload).eq('id', id);
      if (error) throw error;
    } else {
      const untilStr = document.getElementById('evad_recurrence_until').value;
      const customRaw = document.getElementById('evad_recurrence_dates').value;
      const occurrences = evAdComputeOccurrences(startDate, recurrenceType, untilStr, customRaw);
      const recurrenceGroupId = (occurrences.length > 1 && crypto.randomUUID) ? crypto.randomUUID() : null;
      const rows = occurrences.map((d) => {
        const s = evAdFmtDate(d);
        const en = evAdFmtDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + spanDays));
        return { ...basePayload, start_date: s, end_date: en, recurrence_group_id: recurrenceGroupId, owner_id: currentAdminUser.id };
      });
      const { error } = await supabaseClient.from('events').insert(rows);
      if (error) throw error;
    }

    evAdShowList();
    showAlert('Evento guardado.', 'success');
    await loadEvAdminEvents();
  } catch (err) {
    showAlert('No se pudo guardar: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = 'Guardar evento';
  }
});
