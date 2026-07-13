// ============================================================
// Panel de administración — sección "Eventos".
// Se carga después de js/admin.js y reutiliza sus globals:
// supabaseClient, showAlert(), clearAlert(), escapeHtml(), currentAdminUser.
// ============================================================

let evAdminCategories = [];
let evAdminBusinesses = [];
let evAdminEvents = [];
let evAdminStatusFilter = 'pending';

const mainTabBusinesses = document.getElementById('mainTabBusinesses');
const mainTabEvents = document.getElementById('mainTabEvents');
const businessesSection = document.getElementById('businessesSection');
const eventsAdminSection = document.getElementById('eventsAdminSection');
const evAdminListView = document.getElementById('eventsAdminListView');
const evAdminFormView = document.getElementById('eventsAdminFormView');
const evAdminForm = document.getElementById('evAdminForm');
const evAdminList = document.getElementById('evAdminList');
const evadBusinessSelect = document.getElementById('evad_business_id');
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
  evadBusinessSelect.innerHTML = '<option value="">(sin ficha / evento oficial)</option>' +
    evAdminBusinesses.map((b) => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('');
}

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
    .select('*, businesses(id, legacy_id, name), profiles(full_name, phone)')
    .order('start_date', { ascending: true });
  if (error) { evAdminList.innerHTML = ''; showAlert('No se pudo cargar el listado de eventos: ' + error.message, 'error'); return; }
  evAdminEvents = data || [];
  renderEvAdminList();
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
function evAdShowList() { evAdminFormView.classList.add('hidden'); evAdminListView.classList.remove('hidden'); clearAlert(); }
function evAdShowForm() { evAdminListView.classList.add('hidden'); evAdminFormView.classList.remove('hidden'); }
document.getElementById('evAdminCancelBtn').addEventListener('click', evAdShowList);

evadIsFree.addEventListener('change', () => document.getElementById('evad_price_wrap').classList.toggle('hidden', evadIsFree.checked));
evadRequiresRegistration.addEventListener('change', () => document.getElementById('evad_registration_wrap').classList.toggle('hidden', !evadRequiresRegistration.checked));
evadIsOfficial.addEventListener('change', () => {
  evadBusinessSelect.disabled = evadIsOfficial.checked;
  if (evadIsOfficial.checked) evadBusinessSelect.value = '';
});
evadRecurrenceType.addEventListener('change', () => {
  const t = evadRecurrenceType.value;
  document.getElementById('evad_recurrence_until_wrap').classList.toggle('hidden', t === 'none' || t === 'custom');
  document.getElementById('evad_recurrence_custom_wrap').classList.toggle('hidden', t !== 'custom');
});

function evAdResetForm() {
  evAdminForm.reset();
  document.getElementById('evad_id').value = '';
  document.getElementById('evad_price_wrap').classList.remove('hidden');
  document.getElementById('evad_registration_wrap').classList.add('hidden');
  document.getElementById('evad_recurrence_until_wrap').classList.add('hidden');
  document.getElementById('evad_recurrence_custom_wrap').classList.add('hidden');
  evadBusinessSelect.disabled = false;
}

document.getElementById('newOfficialEventBtn').addEventListener('click', () => {
  evAdResetForm();
  document.getElementById('evAdminFormTitle').textContent = 'Nuevo evento oficial';
  evadIsOfficial.checked = true;
  evadBusinessSelect.disabled = true;
  document.getElementById('evad_status').value = 'published';
  evAdShowForm();
});

function openEvAdminForm(e) {
  evAdResetForm();
  document.getElementById('evAdminFormTitle').textContent = 'Editar evento';
  document.getElementById('evad_id').value = e.id;
  evadIsOfficial.checked = !!e.is_official;
  evadBusinessSelect.disabled = !!e.is_official;
  evadBusinessSelect.value = e.business_id || '';
  document.getElementById('evad_title').value = e.title || '';
  document.getElementById('evad_short_description').value = e.short_description || '';
  document.getElementById('evad_description').value = e.description || '';
  evadCategorySelect.value = e.category_id || '';
  document.getElementById('evad_cover_image').value = e.cover_image || '';
  document.getElementById('evad_gallery').value = (e.gallery || []).join(', ');
  document.getElementById('evad_start_date').value = e.start_date || '';
  document.getElementById('evad_end_date').value = e.end_date || '';
  document.getElementById('evad_start_time').value = e.start_time ? e.start_time.slice(0, 5) : '';
  document.getElementById('evad_end_time').value = e.end_time ? e.end_time.slice(0, 5) : '';
  document.getElementById('evad_address').value = e.address || '';
  document.getElementById('evad_lat').value = e.lat != null ? e.lat : '';
  document.getElementById('evad_lng').value = e.lng != null ? e.lng : '';
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
  document.getElementById('evad_capacity').value = e.capacity != null ? e.capacity : '';
  document.getElementById('evad_tags').value = (e.tags || []).join(', ');
  evadRecurrenceType.value = 'none'; // editar una fila puntual no regenera la serie
  document.getElementById('evad_status').value = e.status;
  document.getElementById('evad_review_note').value = e.review_note || '';
  document.getElementById('evad_is_featured').checked = !!e.is_featured;
  document.getElementById('evad_featured_order').value = e.featured_order || 0;
  evAdShowForm();
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
  const endDate = document.getElementById('evad_end_date').value;
  if (!document.getElementById('evad_title').value.trim()) { showAlert('El título es obligatorio.', 'error'); return; }
  if (!evadCategorySelect.value) { showAlert('Elegí una categoría.', 'error'); return; }
  if (!startDate || !endDate) { showAlert('Completá las fechas.', 'error'); return; }
  if (endDate < startDate) { showAlert('La fecha de finalización no puede ser anterior a la de inicio.', 'error'); return; }

  const isFree = evadIsFree.checked;
  const requiresReg = evadRequiresRegistration.checked;
  const isOfficial = evadIsOfficial.checked;
  const recurrenceType = evadRecurrenceType.value;
  const spanDays = Math.round((evAdParseDate(endDate) - evAdParseDate(startDate)) / 86400000);

  const basePayload = {
    business_id: isOfficial ? null : (evadBusinessSelect.value || null),
    is_official: isOfficial,
    title: document.getElementById('evad_title').value.trim(),
    short_description: document.getElementById('evad_short_description').value.trim(),
    description: document.getElementById('evad_description').value.trim(),
    category_id: evadCategorySelect.value,
    cover_image: document.getElementById('evad_cover_image').value.trim(),
    gallery: document.getElementById('evad_gallery').value.split(',').map((s) => s.trim()).filter(Boolean),
    start_time: document.getElementById('evad_start_time').value || null,
    end_time: document.getElementById('evad_end_time').value || null,
    address: document.getElementById('evad_address').value.trim(),
    lat: document.getElementById('evad_lat').value.trim() ? parseFloat(document.getElementById('evad_lat').value.trim()) : null,
    lng: document.getElementById('evad_lng').value.trim() ? parseFloat(document.getElementById('evad_lng').value.trim()) : null,
    phone: document.getElementById('evad_phone').value.trim(),
    whatsapp: document.getElementById('evad_whatsapp').value.trim(),
    instagram: document.getElementById('evad_instagram').value.trim(),
    website: document.getElementById('evad_website').value.trim(),
    is_free: isFree,
    price: isFree ? null : (document.getElementById('evad_price').value ? parseFloat(document.getElementById('evad_price').value) : null),
    requires_registration: requiresReg,
    registration_url: requiresReg ? document.getElementById('evad_registration_url').value.trim() : '',
    capacity: document.getElementById('evad_capacity').value ? parseInt(document.getElementById('evad_capacity').value, 10) : null,
    tags: document.getElementById('evad_tags').value.split(',').map((s) => s.trim()).filter(Boolean),
    recurrence_type: recurrenceType,
    status: document.getElementById('evad_status').value,
    review_note: document.getElementById('evad_review_note').value.trim() || null,
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
