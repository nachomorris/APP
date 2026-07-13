let currentFilter = 'pending';
let allCategories = [];
let allSubcategories = [];
let currentBusinessesList = [];

const alertBox = document.getElementById('alert');
const listEl = document.getElementById('list');
const tabs = document.querySelectorAll('.tab');
const listView = document.getElementById('listView');
const formView = document.getElementById('formView');
const businessForm = document.getElementById('businessForm');
const categorySelect = document.getElementById('category_id');
const subcategorySelect = document.getElementById('subcategory_id');
const saveBtn = document.getElementById('saveBtn');
const ownerSearch = document.getElementById('owner_search');
const ownerIdInput = document.getElementById('owner_id');
const ownerResults = document.getElementById('owner_results');
const searchBusinessesAdmin = document.getElementById('searchBusinessesAdmin');
const filterCategoryAdmin = document.getElementById('filterCategoryAdmin');
const filterSubcategoryAdmin = document.getElementById('filterSubcategoryAdmin');

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = 'alert show alert-' + type;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearAlert() {
  alertBox.className = 'alert';
}

function statusLabel(status) {
  if (status === 'published') return { text: 'Publicada', cls: 'badge-published' };
  if (status === 'rejected') return { text: 'Rechazada', cls: 'badge-rejected' };
  return { text: 'En revisión', cls: 'badge-pending' };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
});

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.getAttribute('data-status');
    loadList();
  });
});

// ---------- Auth + chequeo de admin ----------
async function requireAdmin() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  if (!sessionData.session) {
    window.location.href = 'login.html';
    return null;
  }

  const user = sessionData.session.user;

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (error || !profile || !profile.is_admin) {
    listEl.innerHTML = '';
    showAlert('Esta sección es solo para administradores.', 'error');
    setTimeout(() => { window.location.href = 'panel.html'; }, 1800);
    return null;
  }

  return user;
}

// ---------- Listado ----------
async function loadList() {
  clearAlert();
  listEl.innerHTML = '<p class="empty-state">Cargando...</p>';

  let query = supabaseClient
    .from('businesses')
    .select('*, categories(label), profiles(full_name, phone)')
    .order('created_at', { ascending: false });

  if (currentFilter !== 'all') {
    query = query.eq('status', currentFilter);
  }

  const { data, error } = await query;

  if (error) {
    listEl.innerHTML = '';
    showAlert('No se pudo cargar el listado: ' + error.message, 'error');
    return;
  }

  currentBusinessesList = data || [];
  renderFilteredBusinessList();
}

function renderFilteredBusinessList() {
  const term = searchBusinessesAdmin.value.trim().toLowerCase();
  const catFilter = filterCategoryAdmin.value;
  const subFilter = filterSubcategoryAdmin.value;

  const filtered = currentBusinessesList.filter((b) => {
    if (catFilter && b.category_id !== catFilter) return false;
    if (subFilter && b.subcategory_id !== subFilter) return false;
    if (term) {
      const haystack = ((b.name || '') + ' ' + (b.address || '')).toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  if (currentBusinessesList.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No hay fichas en esta pestaña.</p>';
    return;
  }
  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="empty-state">No encontramos fichas con ese filtro.</p>';
    return;
  }

  listEl.innerHTML = '';
  filtered.forEach((b) => renderCard(b));
}

searchBusinessesAdmin.addEventListener('input', renderFilteredBusinessList);
filterCategoryAdmin.addEventListener('change', () => {
  populateAdminSubcategoryFilter(filterCategoryAdmin.value);
  renderFilteredBusinessList();
});
filterSubcategoryAdmin.addEventListener('change', renderFilteredBusinessList);

function populateAdminCategoryFilter() {
  const current = filterCategoryAdmin.value;
  filterCategoryAdmin.innerHTML = '<option value="">Todas las categorías</option>' +
    allCategories.map((c) => `<option value="${c.id}">${escapeHtml(c.label)}</option>`).join('');
  filterCategoryAdmin.value = current;
}
function populateAdminSubcategoryFilter(categoryId) {
  const current = filterSubcategoryAdmin.value;
  const opts = allSubcategories.filter((s) => !categoryId || s.category_id === categoryId);
  filterSubcategoryAdmin.innerHTML = '<option value="">Todas las subcategorías</option>' +
    opts.map((s) => `<option value="${s.id}">${escapeHtml(s.label)}</option>`).join('');
  filterSubcategoryAdmin.value = opts.some((s) => s.id === current) ? current : '';
}

function renderCard(b) {
  const st = statusLabel(b.status);
  const owner = b.profiles || {};
  const category = b.categories ? b.categories.label : '';
  const hoursText = (b.hours && b.hours.texto) || '';

  const card = document.createElement('div');
  card.className = 'card admin-card';
  card.innerHTML = `
    <div class="top">
      <div>
        <div class="name">${escapeHtml(b.name)}</div>
        <div class="cat">${escapeHtml(category)}</div>
      </div>
      <span class="badge ${st.cls}">${st.text}</span>
    </div>

    <dl>
      <dt>Dueño</dt>
      <dd>${escapeHtml(owner.full_name) || '(sin nombre)'} ${owner.phone ? '· ' + escapeHtml(owner.phone) : ''}</dd>

      <dt>Descripción</dt>
      <dd>${escapeHtml(b.description) || '—'}</dd>

      <dt>Dirección</dt>
      <dd>${escapeHtml(b.address) || '—'}</dd>

      <dt>Horarios</dt>
      <dd>${escapeHtml(hoursText) || '—'}</dd>

      <dt>Contacto</dt>
      <dd>
        ${b.phone ? 'Tel: ' + escapeHtml(b.phone) + '<br>' : ''}
        ${b.whatsapp ? 'WhatsApp: ' + escapeHtml(b.whatsapp) + '<br>' : ''}
        ${b.instagram ? 'Instagram: ' + escapeHtml(b.instagram) + '<br>' : ''}
        ${b.website ? 'Web: ' + escapeHtml(b.website) : ''}
      </dd>

      ${b.rejection_note ? `<dt>Nota de rechazo</dt><dd>${escapeHtml(b.rejection_note)}</dd>` : ''}
    </dl>

    <div class="admin-actions"></div>
  `;

  const actions = card.querySelector('.admin-actions');

  if (b.status !== 'published') {
    const approveBtn = document.createElement('button');
    approveBtn.className = 'btn btn-primary btn-small';
    approveBtn.textContent = 'Aprobar';
    approveBtn.addEventListener('click', () => setStatus(b.id, 'published'));
    actions.appendChild(approveBtn);
  }

  if (b.status !== 'rejected') {
    const rejectBtn = document.createElement('button');
    rejectBtn.className = 'btn btn-secondary btn-small';
    rejectBtn.textContent = 'Rechazar';
    rejectBtn.addEventListener('click', () => rejectBusiness(b.id));
    actions.appendChild(rejectBtn);
  }

  if (b.status !== 'pending') {
    const pendingBtn = document.createElement('button');
    pendingBtn.className = 'btn btn-secondary btn-small';
    pendingBtn.textContent = 'Volver a pendiente';
    pendingBtn.addEventListener('click', () => setStatus(b.id, 'pending'));
    actions.appendChild(pendingBtn);
  }

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-secondary btn-small';
  editBtn.textContent = 'Editar';
  editBtn.addEventListener('click', () => openEditForm(b));
  actions.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn btn-danger btn-small';
  deleteBtn.textContent = 'Eliminar';
  deleteBtn.addEventListener('click', () => deleteBusiness(b.id));
  actions.appendChild(deleteBtn);

  listEl.appendChild(card);
}

// ---------- Categorías (para el formulario de edición) ----------
async function loadCategories() {
  const { data: categories, error: catErr } = await supabaseClient
    .from('categories')
    .select('id, label, sort_order')
    .order('sort_order', { ascending: true });

  if (catErr) {
    showAlert('No se pudieron cargar las categorías: ' + catErr.message, 'error');
    return;
  }

  allCategories = categories || [];

  categorySelect.innerHTML = '<option value="">Seleccioná una categoría</option>';
  allCategories.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.label;
    categorySelect.appendChild(opt);
  });

  const { data: subcats, error: subErr } = await supabaseClient
    .from('subcategories')
    .select('id, label, category_id, sort_order')
    .order('sort_order', { ascending: true });

  if (subErr) {
    showAlert('No se pudieron cargar las subcategorías: ' + subErr.message, 'error');
    return;
  }

  allSubcategories = subcats || [];
  populateAdminCategoryFilter();
  populateAdminSubcategoryFilter('');
}

function refreshSubcategoryOptions(categoryId, selectedSubcatId) {
  subcategorySelect.innerHTML = '<option value="">(opcional)</option>';
  allSubcategories
    .filter((s) => s.category_id === categoryId)
    .forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label;
      if (s.id === selectedSubcatId) opt.selected = true;
      subcategorySelect.appendChild(opt);
    });
}

categorySelect.addEventListener('change', () => {
  refreshSubcategoryOptions(categorySelect.value, null);
});

// ---------- Buscador de dueño (para reasignar la ficha a otro usuario) ----------
function ownerLabel(profile) {
  if (!profile) return '';
  const name = profile.full_name || '(sin nombre)';
  return profile.phone ? `${name} · ${profile.phone}` : name;
}

function setOwnerSelection(id, label) {
  ownerIdInput.value = id || '';
  ownerSearch.value = label || '';
  hideOwnerResults();
}

function renderOwnerResults(items) {
  if (!items.length) {
    ownerResults.innerHTML = '<div class="autocomplete-empty">No encontramos usuarios con ese nombre o teléfono.</div>';
  } else {
    ownerResults.innerHTML = items.map((p) => `<div class="autocomplete-item" data-owner="${p.id}" data-label="${escapeHtml(ownerLabel(p))}">${escapeHtml(ownerLabel(p))}</div>`).join('');
    ownerResults.querySelectorAll('[data-owner]').forEach((el) => {
      el.addEventListener('click', () => setOwnerSelection(el.getAttribute('data-owner'), el.getAttribute('data-label')));
    });
  }
  ownerResults.classList.remove('hidden');
}
function hideOwnerResults() {
  ownerResults.classList.add('hidden');
}

let ownerSearchTimeout = null;
async function searchOwners(query) {
  const q = query.trim();
  if (q.length < 2) {
    ownerResults.innerHTML = '<div class="autocomplete-empty">Escribí al menos 2 letras para buscar.</div>';
    ownerResults.classList.remove('hidden');
    return;
  }
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id, full_name, phone')
    .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`)
    .order('full_name', { ascending: true })
    .limit(15);

  if (error) {
    ownerResults.innerHTML = `<div class="autocomplete-empty">Error buscando usuarios: ${escapeHtml(error.message)}</div>`;
    ownerResults.classList.remove('hidden');
    return;
  }
  renderOwnerResults(data || []);
}

ownerSearch.addEventListener('input', () => {
  ownerIdInput.value = ''; // obliga a confirmar eligiendo de la lista
  clearTimeout(ownerSearchTimeout);
  const q = ownerSearch.value;
  ownerSearchTimeout = setTimeout(() => searchOwners(q), 250);
});
ownerSearch.addEventListener('focus', () => {
  if (ownerSearch.value.trim().length >= 2) searchOwners(ownerSearch.value);
});
ownerSearch.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideOwnerResults();
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#owner_search') && !e.target.closest('#owner_results')) {
    hideOwnerResults();
  }
});

// ---------- Formulario de edición (cualquier ficha, no solo las propias) ----------
function showListView() {
  formView.classList.add('hidden');
  listView.classList.remove('hidden');
  clearAlert();
}

function showFormView() {
  listView.classList.add('hidden');
  formView.classList.remove('hidden');
}

document.getElementById('cancelBtn').addEventListener('click', showListView);

function openEditForm(b) {
  businessForm.reset();
  document.getElementById('business_id').value = b.id;
  setOwnerSelection(b.owner_id || '', ownerLabel(b.profiles));
  document.getElementById('name').value = b.name || '';
  document.getElementById('description').value = b.description || '';
  document.getElementById('address').value = b.address || '';
  document.getElementById('hours').value = (b.hours && b.hours.texto) || '';
  document.getElementById('phone').value = b.phone || '';
  document.getElementById('whatsapp').value = b.whatsapp || '';
  document.getElementById('instagram').value = b.instagram || '';
  document.getElementById('website').value = b.website || '';
  document.getElementById('email').value = b.email || '';
  document.getElementById('facebook').value = b.facebook || '';
  document.getElementById('lat').value = (b.lat !== null && b.lat !== undefined) ? b.lat : '';
  document.getElementById('lng').value = (b.lng !== null && b.lng !== undefined) ? b.lng : '';
  document.getElementById('open_now').checked = b.open !== false;
  document.getElementById('featured').checked = !!b.featured;
  categorySelect.value = b.category_id || '';
  refreshSubcategoryOptions(b.category_id, b.subcategory_id);
  showFormView();
}

businessForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const id = document.getElementById('business_id').value;

  if (!ownerIdInput.value) {
    showAlert('Elegí un dueño para la ficha (buscalo por nombre o teléfono).', 'error');
    return;
  }

  const payload = {
    owner_id: ownerIdInput.value,
    name: document.getElementById('name').value.trim(),
    category_id: categorySelect.value,
    subcategory_id: subcategorySelect.value || null,
    description: document.getElementById('description').value.trim(),
    address: document.getElementById('address').value.trim(),
    hours: { texto: document.getElementById('hours').value.trim() },
    phone: document.getElementById('phone').value.trim(),
    whatsapp: document.getElementById('whatsapp').value.trim(),
    instagram: document.getElementById('instagram').value.trim(),
    website: document.getElementById('website').value.trim(),
    email: document.getElementById('email').value.trim(),
    facebook: document.getElementById('facebook').value.trim(),
    lat: document.getElementById('lat').value.trim() ? parseFloat(document.getElementById('lat').value.trim()) : null,
    lng: document.getElementById('lng').value.trim() ? parseFloat(document.getElementById('lng').value.trim()) : null,
    open: document.getElementById('open_now').checked,
    featured: document.getElementById('featured').checked,
  };

  if (!payload.category_id) {
    showAlert('Elegí una categoría.', 'error');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';

  const { error } = await supabaseClient.from('businesses').update(payload).eq('id', id);

  saveBtn.disabled = false;
  saveBtn.textContent = 'Guardar cambios';

  if (error) {
    showAlert('No se pudo guardar: ' + error.message, 'error');
    return;
  }

  showListView();
  showAlert('Ficha actualizada.', 'success');
  loadList();
});

async function setStatus(id, status, rejection_note) {
  const payload = { status };
  payload.rejection_note = status === 'rejected' ? (rejection_note || null) : null;

  const { error } = await supabaseClient.from('businesses').update(payload).eq('id', id);

  if (error) {
    showAlert('No se pudo actualizar: ' + error.message, 'error');
    return;
  }

  showAlert('Ficha actualizada.', 'success');
  loadList();
}

function rejectBusiness(id) {
  const note = window.prompt('¿Por qué la rechazás? (esto lo puede ver el comercio, opcional)') || '';
  setStatus(id, 'rejected', note.trim());
}

async function deleteBusiness(id) {
  if (!confirm('¿Eliminar esta ficha definitivamente?')) return;
  const { error } = await supabaseClient.from('businesses').delete().eq('id', id);
  if (error) {
    showAlert('No se pudo eliminar: ' + error.message, 'error');
    return;
  }
  showAlert('Ficha eliminada.', 'success');
  loadList();
}

// ---------- Secciones de nivel superior (Comercios / Eventos / Novedades) ----------
// Cada sección + su botón de pestaña se registran acá para poder mostrar una
// sola a la vez sin que cada archivo (admin-events.js, admin-novedades.js...)
// tenga que conocer a los demás.
const ADMIN_SECTION_TABS = {
  businessesSection: 'mainTabBusinesses',
  eventsAdminSection: 'mainTabEvents',
  novedadesAdminSection: 'mainTabNovedades',
};

function showAdminSection(sectionId) {
  Object.keys(ADMIN_SECTION_TABS).forEach((secId) => {
    const secEl = document.getElementById(secId);
    if (secEl) secEl.classList.toggle('hidden', secId !== sectionId);
    const tabEl = document.getElementById(ADMIN_SECTION_TABS[secId]);
    if (tabEl) tabEl.classList.toggle('active', secId === sectionId);
  });
  clearAlert();
}

// ---------- Init ----------
let currentAdminUser = null;

(async () => {
  currentAdminUser = await requireAdmin();
  if (!currentAdminUser) return;
  await loadCategories();
  loadList();
  if (typeof initEventsAdminSection === 'function') {
    // La sección de eventos se inicializa recién al abrir esa pestaña (ver admin-events.js).
  }
})();
