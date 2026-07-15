let currentUser = null;
let allSubcategories = [];
let allCategories = [];

const alertBox = document.getElementById('alert');
const listView = document.getElementById('listView');
const formView = document.getElementById('formView');
const businessList = document.getElementById('businessList');
const businessForm = document.getElementById('businessForm');
const categorySelect = document.getElementById('category_id');
const subcategorySelect = document.getElementById('subcategory_id');
const formTitle = document.getElementById('formTitle');
const saveBtn = document.getElementById('saveBtn');

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

// ---------- Auth ----------
async function requireSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = 'login.html';
    return null;
  }
  return data.session.user;
}

let currentUserRole = 'comercio';
let currentUserChamber = null;

async function checkAdminLink(userId) {
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('is_admin, is_blocked, role, chamber')
    .eq('id', userId)
    .single();

  if (profile && profile.is_blocked) {
    await supabaseClient.auth.signOut();
    window.location.href = 'login.html';
    return;
  }

  if (profile && (profile.is_admin || profile.role === 'master_eventos')) {
    document.getElementById('adminLink').classList.remove('hidden');
  }

  currentUserRole = (profile && profile.role) || 'comercio';
  currentUserChamber = (profile && profile.chamber) || null;
  if (typeof applyRoleVisibility === 'function') applyRoleVisibility(currentUserRole);
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  window.location.href = 'login.html';
});

// ---------- Categorías ----------
async function loadCategories() {
  const { data: categories, error: catErr } = await supabaseClient
    .from('categories')
    .select('id, label, icon, color, sort_order')
    .order('sort_order', { ascending: true });

  if (catErr) {
    showAlert('No se pudieron cargar las categorías: ' + catErr.message, 'error');
    return;
  }

  allCategories = categories || [];
  categorySelect.innerHTML = '<option value="">Seleccioná una categoría</option>';
  (categories || []).forEach((c) => {
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

const amenitiesWrap = document.getElementById('amenitiesWrap');
const gastroTagsWrap = document.getElementById('gastroTagsWrap');
const benefitsWrap = document.getElementById('benefitsWrap');
function updateAmenitiesVisibility() {
  const isAlojamiento = categorySelect.value === 'alojamiento';
  const isGastronomia = categorySelect.value === 'gastronomia';
  amenitiesWrap.classList.toggle('hidden', !isAlojamiento);
  gastroTagsWrap.classList.toggle('hidden', !isGastronomia);
  // Beneficios (ej. Promo BNA) aplica tanto a alojamiento como a
  // gastronomía, es una categoría aparte de servicios/etiquetas.
  benefitsWrap.classList.toggle('hidden', !isAlojamiento && !isGastronomia);
  // limpia los checks del grupo que queda oculto, para no arrastrar
  // selecciones de una categoría a otra
  if (!isAlojamiento) document.querySelectorAll('.amenity-check').forEach((cb) => { cb.checked = false; });
  if (!isGastronomia) document.querySelectorAll('.gastro-tag-check').forEach((cb) => { cb.checked = false; });
  if (!isAlojamiento && !isGastronomia) document.querySelectorAll('.benefit-check').forEach((cb) => { cb.checked = false; });
}

categorySelect.addEventListener('change', () => {
  refreshSubcategoryOptions(categorySelect.value, null);
  updateAmenitiesVisibility();
  updatePreview();
});

// ---------- Previsualización en vivo ----------
function updatePreview() {
  const name = document.getElementById('name').value.trim() || 'Nombre del comercio';
  const address = document.getElementById('address').value.trim();
  const categoryMeta = allCategories.find((c) => c.id === categorySelect.value);
  const subcatLabel = subcategorySelect.options[subcategorySelect.selectedIndex]
    ? subcategorySelect.options[subcategorySelect.selectedIndex].textContent
    : '';

  document.getElementById('previewName').textContent = name;
  document.getElementById('previewAddr').textContent = address ? '📍 ' + address : '📍 Sin dirección cargada';

  const catLabel = categoryMeta ? categoryMeta.label : 'Elegí una categoría';
  const subLabel = (subcatLabel && subcatLabel !== '(opcional)') ? ' · ' + subcatLabel : '';
  document.getElementById('previewCat').textContent = catLabel + subLabel;

  const thumb = document.getElementById('previewThumb');
  thumb.textContent = categoryMeta ? (categoryMeta.icon || '🏪') : '🏪';
  thumb.style.background = categoryMeta ? (categoryMeta.color || '#111111') : '#111111';
}

['name', 'address'].forEach((id) => {
  document.getElementById(id).addEventListener('input', updatePreview);
});
subcategorySelect.addEventListener('change', updatePreview);

// ---------- Listado de fichas ----------
let myBusinesses = [];

async function loadBusinesses() {
  businessList.innerHTML = '<p class="empty-state">Cargando...</p>';

  const { data, error } = await supabaseClient
    .from('businesses')
    .select('id, name, address, category_id, subcategory_id, status, categories(label), subcategories(label)')
    .eq('owner_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) {
    businessList.innerHTML = '';
    showAlert('No se pudieron cargar tus fichas: ' + error.message, 'error');
    return;
  }

  myBusinesses = data || [];

  // Con una sola ficha (el caso más común) buscar y filtrar no aporta nada;
  // solo se muestra si el dueño maneja varias.
  const searchWrap = document.getElementById('fichasSearchWrap');
  searchWrap.classList.toggle('hidden', myBusinesses.length <= 1);

  populateFilterOptions();
  renderBusinessList();
}

function populateFilterOptions() {
  const filterCategory = document.getElementById('filterCategory');
  const currentValue = filterCategory.value;
  const usedCategoryIds = new Set(myBusinesses.map((b) => b.category_id));

  filterCategory.innerHTML = '<option value="">Todas las categorías</option>';
  allCategories
    .filter((c) => usedCategoryIds.has(c.id))
    .forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.label;
      filterCategory.appendChild(opt);
    });
  filterCategory.value = currentValue;

  populateFilterSubcategoryOptions();
}

function populateFilterSubcategoryOptions() {
  const filterCategory = document.getElementById('filterCategory');
  const filterSubcategory = document.getElementById('filterSubcategory');
  const currentValue = filterSubcategory.value;
  const usedSubcatIds = new Set(myBusinesses.map((b) => b.subcategory_id).filter(Boolean));

  filterSubcategory.innerHTML = '<option value="">Todas las subcategorías</option>';
  allSubcategories
    .filter((s) => usedSubcatIds.has(s.id))
    .filter((s) => !filterCategory.value || s.category_id === filterCategory.value)
    .forEach((s) => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.label;
      filterSubcategory.appendChild(opt);
    });
  filterSubcategory.value = currentValue;
}

function renderBusinessList() {
  const term = document.getElementById('searchFichas').value.trim().toLowerCase();
  const categoryFilter = document.getElementById('filterCategory').value;
  const subcategoryFilter = document.getElementById('filterSubcategory').value;

  const filtered = myBusinesses.filter((b) => {
    if (categoryFilter && b.category_id !== categoryFilter) return false;
    if (subcategoryFilter && b.subcategory_id !== subcategoryFilter) return false;
    if (term) {
      const haystack = ((b.name || '') + ' ' + (b.address || '')).toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  if (myBusinesses.length === 0) {
    businessList.innerHTML = '<p class="empty-state">Todavía no cargaste ninguna ficha. Creá la primera con el botón de arriba.</p>';
    return;
  }

  if (filtered.length === 0) {
    businessList.innerHTML = '<p class="empty-state">No encontramos fichas con ese filtro.</p>';
    return;
  }

  businessList.innerHTML = '';
  filtered.forEach((b) => {
    const st = statusLabel(b.status);
    const subLabel = b.subcategories ? ' · ' + b.subcategories.label : '';
    const item = document.createElement('div');
    item.className = 'business-item';
    item.innerHTML = `
      <div class="info">
        <div class="name">${escapeHtml(b.name)}</div>
        <div class="meta">${escapeHtml(b.categories ? b.categories.label : '')}${escapeHtml(subLabel)} · <span class="badge ${st.cls}">${st.text}</span></div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-secondary btn-small" data-edit="${b.id}">Editar</button>
        <button class="btn btn-danger btn-small" data-delete="${b.id}">Eliminar</button>
      </div>
    `;
    businessList.appendChild(item);
  });

  businessList.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => openForm(btn.getAttribute('data-edit')));
  });
  businessList.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => deleteBusiness(btn.getAttribute('data-delete')));
  });
}

document.getElementById('searchFichas').addEventListener('input', renderBusinessList);
document.getElementById('filterCategory').addEventListener('change', () => {
  populateFilterSubcategoryOptions();
  renderBusinessList();
});
document.getElementById('filterSubcategory').addEventListener('change', renderBusinessList);

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

async function deleteBusiness(id) {
  if (!confirm('¿Seguro que querés eliminar esta ficha? No se puede deshacer.')) return;
  const { error } = await supabaseClient.from('businesses').delete().eq('id', id);
  if (error) {
    showAlert('No se pudo eliminar: ' + error.message, 'error');
    return;
  }
  showAlert('Ficha eliminada.', 'success');
  loadBusinesses();
}

// ---------- Formulario crear/editar ----------
document.getElementById('newBusinessBtn').addEventListener('click', () => openForm(null));
document.getElementById('cancelBtn').addEventListener('click', () => showListView());

// Cuando un presidente de cámara edita la ficha de un socio (desde
// "Mis socios"), al guardar/cancelar tiene que volver a esa pestaña
// en vez de al listado de "Mis fichas" (que para él está vacío).
// Lo activa openSocioEditForm() en panel-presidente.js.
let returnToSocios = false;

function showListView() {
  formView.classList.add('hidden');
  if (returnToSocios) {
    returnToSocios = false;
    if (typeof switchMainTab === 'function') switchMainTab('socios');
    if (typeof loadSocios === 'function') loadSocios();
    clearAlert();
    return;
  }
  listView.classList.remove('hidden');
  clearAlert();
}

function showFormView() {
  listView.classList.add('hidden');
  formView.classList.remove('hidden');
}

async function openForm(businessId) {
  businessForm.reset();
  document.getElementById('business_id').value = '';
  subcategorySelect.innerHTML = '<option value="">(opcional)</option>';
  document.querySelectorAll('.amenity-check').forEach((cb) => { cb.checked = false; });
  document.querySelectorAll('.gastro-tag-check').forEach((cb) => { cb.checked = false; });
  document.querySelectorAll('.benefit-check').forEach((cb) => { cb.checked = false; });
  updateAmenitiesVisibility();

  if (!businessId) {
    formTitle.textContent = 'Nueva ficha';
    if (typeof refreshPhotoUploadState === 'function') refreshPhotoUploadState(null, null);
    showFormView();
    updatePreview();
    return;
  }

  formTitle.textContent = 'Editar ficha';

  const { data, error } = await supabaseClient
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (error) {
    showAlert('No se pudo cargar la ficha: ' + error.message, 'error');
    return;
  }

  document.getElementById('business_id').value = data.id;
  document.getElementById('name').value = data.name || '';
  document.getElementById('description').value = data.description || '';
  document.getElementById('address').value = data.address || '';
  document.getElementById('phone').value = data.phone || '';
  document.getElementById('whatsapp').value = data.whatsapp || '';
  document.getElementById('instagram').value = data.instagram || '';
  document.getElementById('website').value = data.website || '';
  document.getElementById('maps_link').value = data.maps_link || '';
  categorySelect.value = data.category_id || '';
  refreshSubcategoryOptions(data.category_id, data.subcategory_id);
  updateAmenitiesVisibility();
  const savedAmenities = Array.isArray(data.amenities) ? data.amenities : [];
  document.querySelectorAll('.amenity-check').forEach((cb) => {
    cb.checked = savedAmenities.includes(cb.value);
  });
  document.querySelectorAll('.gastro-tag-check').forEach((cb) => {
    cb.checked = savedAmenities.includes(cb.value);
  });
  document.querySelectorAll('.benefit-check').forEach((cb) => {
    cb.checked = savedAmenities.includes(cb.value);
  });
  if (typeof refreshPhotoUploadState === 'function') {
    const currentPhoto = (Array.isArray(data.images) && data.images[0]) ? data.images[0] : null;
    refreshPhotoUploadState(data.id, currentPhoto);
  }

  showFormView();
  updatePreview();
}

businessForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const id = document.getElementById('business_id').value;
  const payload = {
    name: document.getElementById('name').value.trim(),
    category_id: categorySelect.value,
    subcategory_id: subcategorySelect.value || null,
    description: document.getElementById('description').value.trim(),
    address: document.getElementById('address').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    whatsapp: document.getElementById('whatsapp').value.trim(),
    instagram: document.getElementById('instagram').value.trim(),
    website: document.getElementById('website').value.trim(),
    maps_link: document.getElementById('maps_link').value.trim() || null,
    amenities: Array.from(document.querySelectorAll('.amenity-check:checked, .gastro-tag-check:checked, .benefit-check:checked')).map((cb) => cb.value),
  };

  if (!payload.category_id) {
    showAlert('Elegí una categoría.', 'error');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando...';

  let error;
  let newId = null;
  if (id) {
    ({ error } = await supabaseClient.from('businesses').update(payload).eq('id', id));
  } else {
    payload.owner_id = currentUser.id;
    const insertResult = await supabaseClient.from('businesses').insert(payload).select('id').single();
    error = insertResult.error;
    newId = insertResult.data ? insertResult.data.id : null;
  }

  saveBtn.disabled = false;
  saveBtn.textContent = 'Guardar ficha';

  if (error) {
    showAlert('No se pudo guardar: ' + error.message, 'error');
    return;
  }

  loadBusinesses();

  if (id) {
    showListView();
    showAlert('Ficha actualizada.', 'success');
  } else if (newId) {
    // vuelve a abrir la ficha recién creada para poder agregarle la foto
    await openForm(newId);
    showAlert('Ficha creada. Queda en revisión hasta que la aprobemos. Ya podés agregarle una foto.', 'success');
  } else {
    showListView();
    showAlert('Ficha creada. Queda en revisión hasta que la aprobemos.', 'success');
  }
});

// ---------- Init ----------
(async () => {
  currentUser = await requireSession();
  if (!currentUser) return;
  checkAdminLink(currentUser.id);
  await loadCategories();
  await loadBusinesses();
})();
