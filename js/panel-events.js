// ============================================================
// Panel de comercio — sección "Mis eventos".
// Se carga después de js/panel.js y reutiliza sus globals:
// currentUser, showAlert(), clearAlert(), escapeHtml(), requireSession().
// ============================================================

let eventCategories = [];
let myBusinessesForEvents = [];
let myEvents = [];
let eventFilter = 'upcoming';
let scheduleRowCount = 0;

const eventsListEl = document.getElementById('eventsList');
const eventsListView = document.getElementById('eventsListView');
const eventFormView = document.getElementById('eventFormView');
const eventForm = document.getElementById('eventForm');
const evBusinessSelect = document.getElementById('ev_business_id');
const evBusinessSearch = document.getElementById('ev_business_search');
const evBusinessResults = document.getElementById('ev_business_results');
const evCategorySelect = document.getElementById('ev_category_id');
const evRecurrenceType = document.getElementById('ev_recurrence_type');
const evIsFree = document.getElementById('ev_is_free');
const evRequiresRegistration = document.getElementById('ev_requires_registration');
const eventFormTitle = document.getElementById('eventFormTitle');
const eventReviewNote = document.getElementById('eventReviewNote');

// ---------- Helpers de fecha (locales, sin corrimiento de huso) ----------
function evParseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function evFmtDate(dateObj) {
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
}
function evTodayStr() {
  return evFmtDate(new Date());
}

// ---------- Tabs de nivel superior (Mis fichas / Mis eventos / Mis socios / Mi cuenta) ----------
const mainTabFichas = document.getElementById('mainTabFichas');
const mainTabEventos = document.getElementById('mainTabEventos');
const mainTabSocios = document.getElementById('mainTabSocios');
const mainTabCuenta = document.getElementById('mainTabCuenta');
const fichasSection = document.getElementById('fichasSection');
const eventosSection = document.getElementById('eventosSection');
const sociosSection = document.getElementById('sociosSection');
const cuentaSection = document.getElementById('cuentaSection');

function switchMainTab(tab) {
  mainTabFichas.classList.toggle('active', tab === 'fichas');
  mainTabEventos.classList.toggle('active', tab === 'eventos');
  mainTabSocios.classList.toggle('active', tab === 'socios');
  mainTabCuenta.classList.toggle('active', tab === 'cuenta');
  fichasSection.classList.toggle('hidden', tab !== 'fichas');
  eventosSection.classList.toggle('hidden', tab !== 'eventos');
  sociosSection.classList.toggle('hidden', tab !== 'socios');
  cuentaSection.classList.toggle('hidden', tab !== 'cuenta');
  clearAlert();
  if (tab === 'eventos' && !eventCategories.length) {
    initEventsSection();
  }
  if (tab === 'cuenta' && typeof initAccountSection === 'function') {
    initAccountSection();
  }
  if (tab === 'socios' && typeof initSociosSection === 'function') {
    initSociosSection();
  }
}
mainTabSocios.addEventListener('click', () => switchMainTab('socios'));

// ---------- Mostrar/ocultar pestañas según el rol del usuario ----------
// comercio: solo administra su(s) ficha(s), no ve "Mis eventos" ni "Mis socios".
// comercio_pro: lo mismo + puede cargar eventos.
// eventos: no puede tener fichas, no ve "Mis fichas" (arranca en eventos).
// presidente: solo ve "Mis socios" (no tiene fichas ni eventos propios).
// master_eventos: no maneja fichas ni tiene eventos "propios" acá — el control
// total de la agenda lo hace desde admin.html (link "Panel de admin"), así que
// en el panel de dueños solo ve "Mi cuenta".
// admin: ve todo.
function applyRoleVisibility(role) {
  const hideEventos = role === 'comercio' || role === 'presidente' || role === 'master_eventos';
  const hideFichas = role === 'eventos' || role === 'presidente' || role === 'master_eventos';
  const showSocios = role === 'presidente';

  mainTabEventos.classList.toggle('hidden', hideEventos);
  mainTabFichas.classList.toggle('hidden', hideFichas);
  mainTabSocios.classList.toggle('hidden', !showSocios);
  document.getElementById('newBusinessBtn').classList.toggle('hidden', hideFichas);

  if (showSocios) {
    switchMainTab('socios');
  } else if (role === 'master_eventos') {
    switchMainTab('cuenta');
  } else if (hideFichas) {
    switchMainTab('eventos');
  }
}

mainTabFichas.addEventListener('click', () => switchMainTab('fichas'));
mainTabEventos.addEventListener('click', () => switchMainTab('eventos'));
mainTabCuenta.addEventListener('click', () => switchMainTab('cuenta'));

// ---------- Carga inicial de la sección eventos ----------
async function initEventsSection() {
  await Promise.all([loadEventCategories(), loadMyBusinessesForEvents()]);
  await loadMyEvents();
}

async function loadEventCategories() {
  const { data, error } = await supabaseClient
    .from('event_categories')
    .select('id, label, icon, color, sort_order')
    .order('sort_order', { ascending: true });

  if (error) {
    showAlert('No se pudieron cargar las categorías de eventos: ' + error.message, 'error');
    return;
  }
  eventCategories = data || [];
  evCategorySelect.innerHTML = '<option value="">Seleccioná una categoría</option>' +
    eventCategories.map((c) => `<option value="${c.id}">${c.icon || ''} ${escapeHtml(c.label)}</option>`).join('');
}

async function loadMyBusinessesForEvents() {
  const { data, error } = await supabaseClient
    .from('businesses')
    .select('id, name, status')
    .eq('owner_id', currentUser.id)
    .order('name', { ascending: true });

  if (error) {
    showAlert('No se pudieron cargar tus fichas: ' + error.message, 'error');
    return;
  }
  myBusinessesForEvents = data || [];

  if (myBusinessesForEvents.length === 0) {
    document.getElementById('newEventBtn').disabled = true;
    eventsListEl.innerHTML = '<p class="empty-state">Todavía no tenés una ficha comercial. Creá una primero en "Mis fichas" para poder cargar eventos.</p>';
  } else {
    document.getElementById('newEventBtn').disabled = false;
  }
}

// ---------- Buscador de ficha organizadora (autocompletado) ----------
function setBusinessSelection(id) {
  evBusinessSelect.value = id || '';
  const biz = myBusinessesForEvents.find((b) => b.id === id);
  evBusinessSearch.value = biz ? biz.name : '';
  hideBusinessResults();
}

function renderBusinessResults(query) {
  const q = (query || '').trim().toLowerCase();
  const matches = q
    ? myBusinessesForEvents.filter((b) => b.name.toLowerCase().includes(q))
    : myBusinessesForEvents;

  if (matches.length === 0) {
    evBusinessResults.innerHTML = '<div class="autocomplete-empty">No encontramos ninguna ficha tuya con ese nombre.</div>';
  } else {
    evBusinessResults.innerHTML = matches.map((b) => `<div class="autocomplete-item" data-biz="${b.id}">${escapeHtml(b.name)}</div>`).join('');
    evBusinessResults.querySelectorAll('[data-biz]').forEach((el) => {
      el.addEventListener('click', () => setBusinessSelection(el.getAttribute('data-biz')));
    });
  }
  evBusinessResults.classList.remove('hidden');
}
function hideBusinessResults() {
  evBusinessResults.classList.add('hidden');
}

evBusinessSearch.addEventListener('focus', () => renderBusinessResults(evBusinessSearch.value));
evBusinessSearch.addEventListener('input', () => {
  evBusinessSelect.value = ''; // obliga a elegir de la lista para confirmar la selección
  renderBusinessResults(evBusinessSearch.value);
});
evBusinessSearch.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideBusinessResults();
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#ev_business_search') && !e.target.closest('#ev_business_results')) {
    hideBusinessResults();
  }
});

// ---------- Listado ----------
function eventStatusLabel(status) {
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

function eventIsFinishedRow(e) {
  const end = evParseDate(e.end_date) || evParseDate(e.start_date);
  if (!end) return false;
  const t = e.end_time || e.start_time || '23:59:59';
  const [h, m] = t.split(':').map(Number);
  end.setHours(h || 23, m || 59, 0, 0);
  return end.getTime() < Date.now();
}

async function loadMyEvents() {
  eventsListEl.innerHTML = '<p class="empty-state">Cargando...</p>';

  const { data, error } = await supabaseClient
    .from('events')
    .select('*, businesses(name)')
    .eq('owner_id', currentUser.id)
    .order('start_date', { ascending: true });

  if (error) {
    eventsListEl.innerHTML = '';
    showAlert('No se pudieron cargar tus eventos: ' + error.message, 'error');
    return;
  }

  myEvents = data || [];
  renderEventsList();
}

document.getElementById('eventFilterTabs').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-evfilter]');
  if (!btn) return;
  document.querySelectorAll('#eventFilterTabs .tab').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');
  eventFilter = btn.getAttribute('data-evfilter');
  renderEventsList();
});

function renderEventsList() {
  let items = myEvents.slice();

  if (eventFilter === 'upcoming') {
    items = items.filter((e) => !eventIsFinishedRow(e) && e.status !== 'draft');
  } else if (eventFilter === 'draft') {
    items = items.filter((e) => e.status === 'draft');
  } else if (eventFilter === 'review') {
    items = items.filter((e) => e.status === 'pending' || e.status === 'needs_changes');
  } else if (eventFilter === 'finished') {
    items = items.filter((e) => eventIsFinishedRow(e));
  }

  if (myEvents.length === 0) {
    eventsListEl.innerHTML = '<p class="empty-state">Todavía no cargaste ningún evento. Creá el primero con el botón de arriba.</p>';
    return;
  }
  if (items.length === 0) {
    eventsListEl.innerHTML = '<p class="empty-state">No hay eventos en esta pestaña.</p>';
    return;
  }

  eventsListEl.innerHTML = '';
  items.forEach((e) => {
    const st = eventStatusLabel(e.status);
    const org = e.businesses ? e.businesses.name : '';
    const dateLabel = e.start_date === e.end_date ? e.start_date : `${e.start_date} → ${e.end_date}`;
    const item = document.createElement('div');
    item.className = 'business-item';
    item.style.flexWrap = 'wrap';
    item.innerHTML = `
      <div class="info">
        <div class="name">${escapeHtml(e.title)}</div>
        <div class="meta">${escapeHtml(dateLabel)} · <span class="badge ${st.cls}">${st.text}</span></div>
        <div class="meta">👁 ${e.views_count || 0} vistas${e.business_id ? ' · ' + escapeHtml(org || '') : ''}</div>
        ${e.review_note ? `<div class="meta" style="color:var(--warning);">Observación del admin: ${escapeHtml(e.review_note)}</div>` : ''}
      </div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-secondary btn-small" data-edit="${e.id}">Editar</button>
        <button class="btn btn-secondary btn-small" data-dup="${e.id}">Duplicar</button>
        <button class="btn btn-danger btn-small" data-del="${e.id}">Eliminar</button>
      </div>
    `;
    eventsListEl.appendChild(item);
  });

  eventsListEl.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEventForm(b.getAttribute('data-edit'))));
  eventsListEl.querySelectorAll('[data-dup]').forEach((b) => b.addEventListener('click', () => duplicateEvent(b.getAttribute('data-dup'))));
  eventsListEl.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => deleteEvent(b.getAttribute('data-del'))));
}

async function deleteEvent(id) {
  if (!confirm('¿Seguro que querés eliminar este evento? No se puede deshacer.')) return;
  const { error } = await supabaseClient.from('events').delete().eq('id', id);
  if (error) {
    showAlert('No se pudo eliminar: ' + error.message, 'error');
    return;
  }
  showAlert('Evento eliminado.', 'success');
  loadMyEvents();
}

// ---------- Cronograma dinámico ----------
function addScheduleRow(data) {
  const wrap = document.getElementById('scheduleRows');
  const rowId = 'sched_' + (scheduleRowCount++);
  const row = document.createElement('div');
  row.className = 'dynamic-row';
  row.id = rowId;
  row.innerHTML = `
    <div class="fields">
      <input type="date" class="sched-date" value="${data && data.item_date ? data.item_date : ''}" placeholder="Fecha">
      <input type="time" class="sched-start" value="${data && data.start_time ? data.start_time.slice(0, 5) : ''}" placeholder="Inicio">
      <input type="time" class="sched-end" value="${data && data.end_time ? data.end_time.slice(0, 5) : ''}" placeholder="Fin">
    </div>
    <button type="button" class="remove-row" title="Quitar">✕</button>
  `;
  row.querySelector('.remove-row').addEventListener('click', () => row.remove());
  const descRow = document.createElement('div');
  descRow.style.marginBottom = '14px';
  descRow.innerHTML = `<input type="text" class="sched-desc" placeholder="Descripción de la actividad" value="${data && data.description ? escapeHtml(data.description) : ''}">`;
  wrap.appendChild(row);
  wrap.appendChild(descRow);
  row.dataset.descEl = '';
  row._descRow = descRow;
}
document.getElementById('addScheduleRowBtn').addEventListener('click', () => addScheduleRow());

function collectScheduleRows() {
  const wrap = document.getElementById('scheduleRows');
  const rows = wrap.querySelectorAll('.dynamic-row');
  const items = [];
  rows.forEach((row) => {
    const date = row.querySelector('.sched-date').value;
    const start = row.querySelector('.sched-start').value;
    const end = row.querySelector('.sched-end').value;
    const desc = row._descRow ? row._descRow.querySelector('.sched-desc').value.trim() : '';
    if (date && desc) {
      items.push({ item_date: date, start_time: start || null, end_time: end || null, description: desc });
    }
  });
  return items;
}
function clearScheduleRows() {
  document.getElementById('scheduleRows').innerHTML = '';
}

// ---------- Mostrar/ocultar campos condicionales ----------
evIsFree.addEventListener('change', () => {
  document.getElementById('ev_price_wrap').classList.toggle('hidden', evIsFree.checked);
});
evRequiresRegistration.addEventListener('change', () => {
  document.getElementById('ev_registration_wrap').classList.toggle('hidden', !evRequiresRegistration.checked);
});
evRecurrenceType.addEventListener('change', () => {
  const type = evRecurrenceType.value;
  document.getElementById('ev_recurrence_until_wrap').classList.toggle('hidden', type === 'none' || type === 'custom');
  document.getElementById('ev_recurrence_custom_wrap').classList.toggle('hidden', type !== 'custom');
  const scheduleDisabled = type !== 'none';
  document.getElementById('addScheduleRowBtn').disabled = scheduleDisabled;
  if (scheduleDisabled) clearScheduleRows();
});

// ---------- Abrir formulario (nuevo / editar) ----------
document.getElementById('newEventBtn').addEventListener('click', () => openEventForm(null));
document.getElementById('cancelEventBtn').addEventListener('click', showEventsListView);

function showEventsListView() {
  eventFormView.classList.add('hidden');
  eventsListView.classList.remove('hidden');
  clearAlert();
}
function showEventFormView() {
  eventsListView.classList.add('hidden');
  eventFormView.classList.remove('hidden');
}

function resetEventForm() {
  eventForm.reset();
  document.getElementById('event_id').value = '';
  clearScheduleRows();
  document.getElementById('ev_price_wrap').classList.remove('hidden');
  document.getElementById('ev_registration_wrap').classList.add('hidden');
  document.getElementById('ev_recurrence_until_wrap').classList.add('hidden');
  document.getElementById('ev_recurrence_custom_wrap').classList.add('hidden');
  document.getElementById('addScheduleRowBtn').disabled = false;
  eventReviewNote.classList.add('hidden');
  setBusinessSelection('');
  if (myBusinessesForEvents.length === 1) {
    setBusinessSelection(myBusinessesForEvents[0].id);
  }
}

async function openEventForm(eventId) {
  resetEventForm();

  if (!eventId) {
    eventFormTitle.textContent = 'Nuevo evento';
    showEventFormView();
    return;
  }

  eventFormTitle.textContent = 'Editar evento';
  const e = myEvents.find((x) => x.id === eventId);
  if (!e) {
    showAlert('No se encontró el evento.', 'error');
    return;
  }

  document.getElementById('event_id').value = e.id;
  setBusinessSelection(e.business_id || '');
  document.getElementById('ev_title').value = e.title || '';
  document.getElementById('ev_short_description').value = e.short_description || '';
  document.getElementById('ev_description').value = e.description || '';
  evCategorySelect.value = e.category_id || '';
  document.getElementById('ev_cover_image').value = e.cover_image || '';
  document.getElementById('ev_gallery').value = (e.gallery || []).join(', ');
  document.getElementById('ev_start_date').value = e.start_date || '';
  document.getElementById('ev_end_date').value = e.end_date || '';
  document.getElementById('ev_start_time').value = e.start_time ? e.start_time.slice(0, 5) : '';
  document.getElementById('ev_end_time').value = e.end_time ? e.end_time.slice(0, 5) : '';
  document.getElementById('ev_address').value = e.address || '';
  document.getElementById('ev_lat').value = e.lat != null ? e.lat : '';
  document.getElementById('ev_lng').value = e.lng != null ? e.lng : '';
  document.getElementById('ev_contact_name').value = e.contact_name || '';
  document.getElementById('ev_phone').value = e.phone || '';
  document.getElementById('ev_whatsapp').value = e.whatsapp || '';
  document.getElementById('ev_instagram').value = e.instagram || '';
  document.getElementById('ev_website').value = e.website || '';
  evIsFree.checked = !!e.is_free;
  document.getElementById('ev_price_wrap').classList.toggle('hidden', evIsFree.checked);
  document.getElementById('ev_price').value = e.price != null ? e.price : '';
  evRequiresRegistration.checked = !!e.requires_registration;
  document.getElementById('ev_registration_wrap').classList.toggle('hidden', !evRequiresRegistration.checked);
  document.getElementById('ev_registration_url').value = e.registration_url || '';
  document.getElementById('ev_capacity').value = e.capacity != null ? e.capacity : '';
  document.getElementById('ev_tags').value = (e.tags || []).join(', ');
  evRecurrenceType.value = e.recurrence_type || 'none';
  evRecurrenceType.dispatchEvent(new Event('change'));

  if (e.review_note && (e.status === 'needs_changes' || e.status === 'rejected')) {
    eventReviewNote.textContent = 'Observación del administrador: ' + e.review_note;
    eventReviewNote.classList.remove('hidden');
  }

  if (e.recurrence_type === 'none') {
    const { data: sched } = await supabaseClient
      .from('event_schedule_items')
      .select('*')
      .eq('event_id', e.id)
      .order('item_date', { ascending: true });
    (sched || []).forEach((s) => addScheduleRow(s));
  }

  showEventFormView();
}

// ---------- Recurrencia: cálculo de fechas ----------
function computeOccurrenceDates(startStr, type, untilStr, customRaw) {
  const start = evParseDate(startStr);
  if (!start) return [];
  if (type === 'none') return [start];

  if (type === 'custom') {
    const lines = (customRaw || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const parsed = lines.map((s) => evParseDate(s)).filter(Boolean);
    parsed.sort((a, b) => a - b);
    return parsed.length ? parsed : [start];
  }

  const until = untilStr ? evParseDate(untilStr) : (() => {
    const d = new Date(start);
    d.setMonth(d.getMonth() + 3);
    return d;
  })();

  const targetDows = type === 'weekly_fri' ? [5]
    : type === 'weekly_sat' ? [6]
    : type === 'weekend' ? [5, 6]
    : [start.getDay()]; // 'weekly'

  const results = [];
  const cursor = new Date(start);
  const maxCount = 26;
  while (cursor <= until && results.length < maxCount) {
    if (targetDows.includes(cursor.getDay())) results.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return results.length ? results : [start];
}

// ---------- Guardar (borrador / enviar a revisión) ----------
let pendingTargetStatus = 'pending';
document.getElementById('saveEventBtn').addEventListener('click', () => { pendingTargetStatus = 'pending'; });
document.getElementById('saveEventDraftBtn').addEventListener('click', () => {
  pendingTargetStatus = 'draft';
  eventForm.requestSubmit();
});

eventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const id = document.getElementById('event_id').value;
  const startDate = document.getElementById('ev_start_date').value;
  const endDate = document.getElementById('ev_end_date').value;

  if (!evBusinessSelect.value) { showAlert('Elegí qué ficha organiza el evento.', 'error'); return; }
  if (!document.getElementById('ev_title').value.trim()) { showAlert('El título es obligatorio.', 'error'); return; }
  if (!evCategorySelect.value) { showAlert('Elegí una categoría.', 'error'); return; }
  if (!startDate || !endDate) { showAlert('Completá la fecha de inicio y de finalización.', 'error'); return; }
  if (endDate < startDate) { showAlert('La fecha de finalización no puede ser anterior a la de inicio.', 'error'); return; }

  const isFree = evIsFree.checked;
  const requiresReg = evRequiresRegistration.checked;
  const recurrenceType = evRecurrenceType.value;

  const spanDays = Math.round((evParseDate(endDate) - evParseDate(startDate)) / 86400000);

  const basePayload = {
    business_id: evBusinessSelect.value,
    title: document.getElementById('ev_title').value.trim(),
    short_description: document.getElementById('ev_short_description').value.trim(),
    description: document.getElementById('ev_description').value.trim(),
    category_id: evCategorySelect.value,
    cover_image: document.getElementById('ev_cover_image').value.trim(),
    gallery: document.getElementById('ev_gallery').value.split(',').map((s) => s.trim()).filter(Boolean),
    start_time: document.getElementById('ev_start_time').value || null,
    end_time: document.getElementById('ev_end_time').value || null,
    address: document.getElementById('ev_address').value.trim(),
    lat: document.getElementById('ev_lat').value.trim() ? parseFloat(document.getElementById('ev_lat').value.trim()) : null,
    lng: document.getElementById('ev_lng').value.trim() ? parseFloat(document.getElementById('ev_lng').value.trim()) : null,
    contact_name: document.getElementById('ev_contact_name').value.trim(),
    phone: document.getElementById('ev_phone').value.trim(),
    whatsapp: document.getElementById('ev_whatsapp').value.trim(),
    instagram: document.getElementById('ev_instagram').value.trim(),
    website: document.getElementById('ev_website').value.trim(),
    is_free: isFree,
    price: isFree ? null : (document.getElementById('ev_price').value ? parseFloat(document.getElementById('ev_price').value) : null),
    requires_registration: requiresReg,
    registration_url: requiresReg ? document.getElementById('ev_registration_url').value.trim() : '',
    capacity: document.getElementById('ev_capacity').value ? parseInt(document.getElementById('ev_capacity').value, 10) : null,
    tags: document.getElementById('ev_tags').value.split(',').map((s) => s.trim()).filter(Boolean),
    recurrence_type: recurrenceType,
    status: pendingTargetStatus,
    owner_id: currentUser.id,
  };

  const saveBtn = document.getElementById('saveEventBtn');
  const draftBtn = document.getElementById('saveEventDraftBtn');
  saveBtn.disabled = true; draftBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';

  try {
    if (id) {
      // Edición: siempre una sola fila (cada ocurrencia se edita por separado).
      const payload = { ...basePayload, start_date: startDate, end_date: endDate };
      // .select('id'): si la RLS bloquea la fila, Postgres no tira error,
      // solo no actualiza nada — sin esto mostraríamos "guardado" aunque
      // no se haya guardado nada.
      const { data, error } = await supabaseClient.from('events').update(payload).eq('id', id).select('id');
      if (error) throw error;
      if (!data || !data.length) throw new Error('No se pudo guardar: este evento ya no está a tu nombre.');

      await supabaseClient.from('event_schedule_items').delete().eq('event_id', id);
      const scheduleItems = recurrenceType === 'none' ? collectScheduleRows() : [];
      if (scheduleItems.length) {
        await supabaseClient.from('event_schedule_items').insert(scheduleItems.map((s) => ({ ...s, event_id: id })));
      }
    } else {
      // Alta: si es recurrente, se generan varias filas (una por fecha real).
      const untilStr = document.getElementById('ev_recurrence_until').value;
      const customRaw = document.getElementById('ev_recurrence_dates').value;
      const occurrenceStarts = computeOccurrenceDates(startDate, recurrenceType, untilStr, customRaw);
      const recurrenceGroupId = (occurrenceStarts.length > 1 && crypto.randomUUID) ? crypto.randomUUID() : null;

      const rows = occurrenceStarts.map((d) => {
        const start = evFmtDate(d);
        const end = evFmtDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + spanDays));
        return { ...basePayload, start_date: start, end_date: end, recurrence_group_id: recurrenceGroupId };
      });

      const { data: inserted, error } = await supabaseClient.from('events').insert(rows).select('id');
      if (error) throw error;

      const scheduleItems = recurrenceType === 'none' ? collectScheduleRows() : [];
      if (scheduleItems.length && inserted && inserted[0]) {
        await supabaseClient.from('event_schedule_items').insert(scheduleItems.map((s) => ({ ...s, event_id: inserted[0].id })));
      }
    }

    showEventsListView();
    showAlert(pendingTargetStatus === 'draft' ? 'Evento guardado como borrador.' : 'Evento enviado a revisión. Te avisamos cuando lo aprobemos.', 'success');
    await loadMyEvents();
  } catch (err) {
    showAlert('No se pudo guardar el evento: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false; draftBtn.disabled = false;
    saveBtn.textContent = 'Enviar a revisión';
  }
});

// ---------- Duplicar ----------
async function duplicateEvent(id) {
  const e = myEvents.find((x) => x.id === id);
  if (!e) return;
  resetEventForm();
  eventFormTitle.textContent = 'Duplicar evento';
  setBusinessSelection(e.business_id || '');
  document.getElementById('ev_title').value = 'Copia de ' + (e.title || '');
  document.getElementById('ev_short_description').value = e.short_description || '';
  document.getElementById('ev_description').value = e.description || '';
  evCategorySelect.value = e.category_id || '';
  document.getElementById('ev_cover_image').value = e.cover_image || '';
  document.getElementById('ev_gallery').value = (e.gallery || []).join(', ');
  document.getElementById('ev_start_date').value = e.start_date || '';
  document.getElementById('ev_end_date').value = e.end_date || '';
  document.getElementById('ev_start_time').value = e.start_time ? e.start_time.slice(0, 5) : '';
  document.getElementById('ev_end_time').value = e.end_time ? e.end_time.slice(0, 5) : '';
  document.getElementById('ev_address').value = e.address || '';
  document.getElementById('ev_lat').value = e.lat != null ? e.lat : '';
  document.getElementById('ev_lng').value = e.lng != null ? e.lng : '';
  document.getElementById('ev_contact_name').value = e.contact_name || '';
  document.getElementById('ev_phone').value = e.phone || '';
  document.getElementById('ev_whatsapp').value = e.whatsapp || '';
  document.getElementById('ev_instagram').value = e.instagram || '';
  document.getElementById('ev_website').value = e.website || '';
  evIsFree.checked = !!e.is_free;
  document.getElementById('ev_price_wrap').classList.toggle('hidden', evIsFree.checked);
  document.getElementById('ev_price').value = e.price != null ? e.price : '';
  evRequiresRegistration.checked = !!e.requires_registration;
  document.getElementById('ev_registration_wrap').classList.toggle('hidden', !evRequiresRegistration.checked);
  document.getElementById('ev_registration_url').value = e.registration_url || '';
  document.getElementById('ev_capacity').value = e.capacity != null ? e.capacity : '';
  document.getElementById('ev_tags').value = (e.tags || []).join(', ');
  showEventFormView();
}

// ---------- Init: si venimos desde el enlace #eventos de la Agenda ----------
if (location.hash === '#eventos') {
  switchMainTab('eventos');
}
