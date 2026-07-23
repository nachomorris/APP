// ============================================================
// Panel de administración — sección "Destacado" (antes las
// tarjetas de "Descuentos imperdibles" se armaban solas a partir
// de businesses.featured/top; ahora son contenido propio, con
// foto, título y subtítulo editables, y un vínculo opcional a
// una ficha de comercio o a una URL externa).
// Se carga después de js/admin.js (reutiliza supabaseClient,
// showAlert, clearAlert, escapeHtml, showAdminSection).
// ============================================================

let featCards = [];
let featBusinesses = [];
let featSectionLoaded = false;

const mainTabFeatured = document.getElementById('mainTabFeatured');
const featuredListView = document.getElementById('featuredListView');
const featuredFormView = document.getElementById('featuredFormView');
const featuredList = document.getElementById('featuredList');
const featForm = document.getElementById('featForm');
const featIdInput = document.getElementById('feat_id');
const featTitleInput = document.getElementById('feat_title');
const featSubtitleInput = document.getElementById('feat_subtitle');
const featBusinessSearch = document.getElementById('feat_business_search');
const featBusinessIdInput = document.getElementById('feat_business_id');
const featBusinessResults = document.getElementById('feat_business_results');
const featExternalUrlInput = document.getElementById('feat_external_url');
const featIsActiveInput = document.getElementById('feat_is_active');

mainTabFeatured.addEventListener('click', () => {
  showAdminSection('featuredAdminSection');
  if (!featSectionLoaded) {
    featSectionLoaded = true;
    initFeaturedSection();
  }
});

async function initFeaturedSection() {
  await loadFeaturedBusinesses();
  await loadFeaturedList();
}

async function loadFeaturedBusinesses() {
  const { data, error } = await supabaseClient
    .from('businesses')
    .select('id, name')
    .order('name', { ascending: true });
  if (error) { showAlert('No se pudieron cargar los comercios: ' + error.message, 'error'); return; }
  featBusinesses = data || [];
}

async function loadFeaturedList() {
  featuredList.innerHTML = '<p class="empty-state">Cargando...</p>';
  const { data, error } = await supabaseClient
    .from('featured_cards')
    .select('*, businesses(id, legacy_id, name)')
    .order('sort_order', { ascending: true });
  if (error) { featuredList.innerHTML = ''; showAlert('No se pudo cargar el listado: ' + error.message, 'error'); return; }
  featCards = data || [];
  renderFeaturedList();
}

function renderFeaturedList() {
  if (!featCards.length) {
    featuredList.innerHTML = '<p class="empty-state">Todavía no hay tarjetas cargadas.</p>';
    return;
  }
  featuredList.innerHTML = '';
  featCards.forEach((f, i) => renderFeaturedCard(f, i));
}

function renderFeaturedCard(f, i) {
  const biz = f.businesses;
  const linkLabel = biz ? biz.name : (f.external_url ? f.external_url : '(sin vínculo)');

  const card = document.createElement('div');
  card.className = 'card admin-card';
  card.innerHTML = `
    <div class="top">
      <div style="display:flex; gap:12px; align-items:center;">
        <div style="width:64px; height:44px; border-radius:8px; overflow:hidden; background:var(--ink); flex:none; display:flex; align-items:center; justify-content:center; color:#fff; font-size:18px;">
          ${f.image_url ? `<img src="${escapeHtml(f.image_url)}" style="width:100%; height:100%; object-fit:cover;">` : ICON('star-filled', { size: 18, color: '#fff' })}
        </div>
        <div>
          <div class="name">${escapeHtml(f.title)}</div>
          <div class="cat">${escapeHtml(f.subtitle || '')}</div>
        </div>
      </div>
      <span class="badge ${f.is_active ? 'badge-published' : 'badge-draft'}">${f.is_active ? 'Activa' : 'Inactiva'}</span>
    </div>
    <dl>
      <dt>Vínculo</dt>
      <dd>${escapeHtml(linkLabel)}</dd>
    </dl>
    <div class="admin-actions"></div>
  `;

  const actions = card.querySelector('.admin-actions');
  const btn = (label, cls, fn) => {
    const b = document.createElement('button');
    b.className = 'btn ' + cls + ' btn-small';
    b.innerHTML = label;
    b.addEventListener('click', fn);
    actions.appendChild(b);
  };

  btn('Editar', 'btn-secondary', () => openFeatEditForm(f));
  btn(f.is_active ? 'Desactivar' : 'Activar', 'btn-secondary', () => toggleFeaturedActive(f));
  if (i > 0) btn(ICON('chevron-up', { size: 13 }) + ' Subir', 'btn-secondary', () => reorderFeaturedCard(f, -1));
  if (i < featCards.length - 1) btn(ICON('chevron-down', { size: 13 }) + ' Bajar', 'btn-secondary', () => reorderFeaturedCard(f, 1));
  btn('Eliminar', 'btn-danger', () => deleteFeaturedCard(f.id));

  featuredList.appendChild(card);
}

async function toggleFeaturedActive(f) {
  const { error } = await supabaseClient.from('featured_cards').update({ is_active: !f.is_active }).eq('id', f.id);
  if (error) { showAlert('No se pudo actualizar: ' + error.message, 'error'); return; }
  loadFeaturedList();
}

async function reorderFeaturedCard(f, delta) {
  const { error } = await supabaseClient.from('featured_cards').update({ sort_order: (f.sort_order || 0) + delta }).eq('id', f.id);
  if (error) { showAlert('No se pudo reordenar: ' + error.message, 'error'); return; }
  loadFeaturedList();
}

async function deleteFeaturedCard(id) {
  if (!confirm('¿Eliminar esta tarjeta definitivamente?')) return;
  const { error } = await supabaseClient.from('featured_cards').delete().eq('id', id);
  if (error) { showAlert('No se pudo eliminar: ' + error.message, 'error'); return; }
  showAlert('Tarjeta eliminada.', 'success');
  loadFeaturedList();
}

// ---------- Buscador de comercio a vincular (filtra localmente) ----------
function featSetBusinessSelection(id, name) {
  featBusinessIdInput.value = id || '';
  featBusinessSearch.value = name || '';
  hideFeatBusinessResults();
}
function hideFeatBusinessResults() {
  featBusinessResults.classList.add('hidden');
}
function renderFeatBusinessResults(query) {
  const q = query.trim().toLowerCase();
  if (q.length < 1) {
    featBusinessResults.innerHTML = '<div class="autocomplete-empty">Escribí para buscar un comercio.</div>';
    featBusinessResults.classList.remove('hidden');
    return;
  }
  const items = featBusinesses.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 15);
  if (!items.length) {
    featBusinessResults.innerHTML = '<div class="autocomplete-empty">No encontramos comercios con ese nombre.</div>';
  } else {
    featBusinessResults.innerHTML = items.map((b) =>
      `<div class="autocomplete-item" data-business="${b.id}" data-name="${escapeHtml(b.name)}">${escapeHtml(b.name)}</div>`
    ).join('');
    featBusinessResults.querySelectorAll('[data-business]').forEach((el) => {
      el.addEventListener('click', () => featSetBusinessSelection(el.getAttribute('data-business'), el.getAttribute('data-name')));
    });
  }
  featBusinessResults.classList.remove('hidden');
}
featBusinessSearch.addEventListener('input', () => {
  featBusinessIdInput.value = '';
  renderFeatBusinessResults(featBusinessSearch.value);
});
featBusinessSearch.addEventListener('focus', () => {
  renderFeatBusinessResults(featBusinessSearch.value);
});
featBusinessSearch.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideFeatBusinessResults();
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#feat_business_search') && !e.target.closest('#feat_business_results')) {
    hideFeatBusinessResults();
  }
});

// ---------- Formulario (crear / editar) ----------
function featShowList() { featuredFormView.classList.add('hidden'); featuredListView.classList.remove('hidden'); clearAlert(); }
function featShowForm() { featuredListView.classList.add('hidden'); featuredFormView.classList.remove('hidden'); }
document.getElementById('featCancelBtn').addEventListener('click', featShowList);

function featResetForm() {
  featForm.reset();
  featIdInput.value = '';
  featIsActiveInput.checked = true;
  featSetBusinessSelection('', '');
  refreshFeatPhotoUploadState(null, null);
}

document.getElementById('newFeaturedBtn').addEventListener('click', () => {
  featResetForm();
  document.getElementById('featFormTitle').textContent = 'Nueva tarjeta';
  featShowForm();
});

function openFeatEditForm(f) {
  featResetForm();
  document.getElementById('featFormTitle').textContent = 'Editar tarjeta';
  featIdInput.value = f.id;
  featTitleInput.value = f.title || '';
  featSubtitleInput.value = f.subtitle || '';
  const biz = f.businesses;
  featSetBusinessSelection(f.business_id || '', biz ? biz.name : '');
  featExternalUrlInput.value = f.external_url || '';
  featIsActiveInput.checked = !!f.is_active;
  refreshFeatPhotoUploadState(f.id, f.image_url);
  featShowForm();
}

featForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const title = featTitleInput.value.trim();
  if (!title) { showAlert('El título es obligatorio.', 'error'); return; }

  const id = featIdInput.value;
  const payload = {
    title,
    subtitle: featSubtitleInput.value.trim() || null,
    business_id: featBusinessIdInput.value || null,
    external_url: featBusinessIdInput.value ? null : (featExternalUrlInput.value.trim() || null),
    is_active: featIsActiveInput.checked,
  };

  const saveBtn = document.getElementById('featSaveBtn');
  saveBtn.disabled = true; saveBtn.textContent = 'Guardando...';

  try {
    if (id) {
      const { error } = await supabaseClient.from('featured_cards').update(payload).eq('id', id);
      if (error) throw error;
      showAlert('Tarjeta guardada.', 'success');
      await loadFeaturedList();
      featShowList();
    } else {
      payload.sort_order = featCards.length;
      const { data, error } = await supabaseClient.from('featured_cards').insert(payload).select('*, businesses(id, legacy_id, name)').single();
      if (error) throw error;
      showAlert('Tarjeta creada. Ahora podés subirle una foto.', 'success');
      await loadFeaturedList();
      openFeatEditForm(data);
    }
  } catch (err) {
    showAlert('No se pudo guardar: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = 'Guardar tarjeta';
  }
});

// ---------- Foto (subir + recortar), bucket "featured-images" ----------
let currentFeatCardId = null;
let featCropperInstance = null;

const featPhotoInput = document.getElementById('featPhotoInput');
const featChoosePhotoBtn = document.getElementById('featChoosePhotoBtn');
const featPhotoPreviewImg = document.getElementById('featPhotoPreviewImg');
const featPhotoPreviewEmpty = document.getElementById('featPhotoPreviewEmpty');

const featCropperModal = document.getElementById('featCropperModal');
const featCropperImage = document.getElementById('featCropperImage');
const featCropperCancelBtn = document.getElementById('featCropperCancelBtn');
const featCropperConfirmBtn = document.getElementById('featCropperConfirmBtn');
const featCropperZoomInBtn = document.getElementById('featCropperZoomInBtn');
const featCropperZoomOutBtn = document.getElementById('featCropperZoomOutBtn');

function refreshFeatPhotoUploadState(cardId, currentPhotoUrl) {
  currentFeatCardId = cardId;
  if (currentPhotoUrl) {
    featPhotoPreviewImg.src = currentPhotoUrl;
    featPhotoPreviewImg.style.display = 'block';
    featPhotoPreviewEmpty.style.display = 'none';
  } else {
    featPhotoPreviewImg.style.display = 'none';
    featPhotoPreviewEmpty.style.display = 'block';
  }
}

featChoosePhotoBtn.addEventListener('click', () => {
  if (!currentFeatCardId) {
    showAlert('Primero guardá el título de la tarjeta; después le podés subir la foto.', 'error');
    return;
  }
  featPhotoInput.value = '';
  featPhotoInput.click();
});

featPhotoInput.addEventListener('change', () => {
  const file = featPhotoInput.files && featPhotoInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    featCropperImage.src = reader.result;
    featCropperModal.classList.remove('hidden');
    lockBodyScroll();

    if (featCropperInstance) featCropperInstance.destroy();
    featCropperInstance = new Cropper(featCropperImage, {
      aspectRatio: 12 / 5,
      viewMode: 1,
      autoCropArea: 1,
      background: false,
      responsive: true,
      dragMode: 'move',
      cropBoxMovable: false,
      cropBoxResizable: false,
      toggleDragModeOnDblclick: false,
    });
  };
  reader.readAsDataURL(file);
});

function closeFeatCropperModal() {
  if (featCropperInstance) {
    featCropperInstance.destroy();
    featCropperInstance = null;
  }
  featCropperModal.classList.add('hidden');
  featPhotoInput.value = '';
  unlockBodyScroll();
}

featCropperCancelBtn.addEventListener('click', closeFeatCropperModal);
if (featCropperZoomInBtn) featCropperZoomInBtn.addEventListener('click', () => featCropperInstance && featCropperInstance.zoom(0.1));
if (featCropperZoomOutBtn) featCropperZoomOutBtn.addEventListener('click', () => featCropperInstance && featCropperInstance.zoom(-0.1));

featCropperConfirmBtn.addEventListener('click', () => {
  if (!featCropperInstance || !currentFeatCardId) return;

  featCropperConfirmBtn.disabled = true;
  featCropperConfirmBtn.textContent = 'Subiendo...';

  const canvas = featCropperInstance.getCroppedCanvas({ width: 1200, height: 500 });
  canvas.toBlob(async (blob) => {
    if (!blob) {
      featCropperConfirmBtn.disabled = false;
      featCropperConfirmBtn.textContent = 'Guardar foto';
      showAlert('No se pudo procesar la imagen.', 'error');
      return;
    }

    const path = `${currentFeatCardId}/cover-${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseClient.storage
      .from('featured-images')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) {
      featCropperConfirmBtn.disabled = false;
      featCropperConfirmBtn.textContent = 'Guardar foto';
      showAlert('No se pudo subir la foto: ' + uploadError.message, 'error');
      return;
    }

    const { data: pub } = supabaseClient.storage.from('featured-images').getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { error: updateError } = await supabaseClient
      .from('featured_cards')
      .update({ image_url: publicUrl })
      .eq('id', currentFeatCardId);

    featCropperConfirmBtn.disabled = false;
    featCropperConfirmBtn.textContent = 'Guardar foto';

    if (updateError) {
      showAlert('La foto se subió pero no se pudo guardar en la tarjeta: ' + updateError.message, 'error');
      return;
    }

    featPhotoPreviewImg.src = publicUrl;
    featPhotoPreviewImg.style.display = 'block';
    featPhotoPreviewEmpty.style.display = 'none';
    closeFeatCropperModal();
    showAlert('Foto actualizada.', 'success');
    loadFeaturedList();
  }, 'image/jpeg', 0.85);
});
