// ============================================================
// Panel de administración — sección "Lugares" (los "Lugares para
// visitar" de la home). Antes era un array fijo en index.html,
// editable solo tocando código; ahora es contenido propio en la
// tabla places, con foto, editable en su totalidad desde acá.
// Se carga después de js/admin.js (reutiliza supabaseClient,
// showAlert, clearAlert, escapeHtml, showAdminSection).
// ============================================================

let placesData = [];
let placesSectionLoaded = false;

const mainTabPlaces = document.getElementById('mainTabPlaces');
const placesListView = document.getElementById('placesListView');
const placesFormView = document.getElementById('placesFormView');
const placesList = document.getElementById('placesList');
const placeForm = document.getElementById('placeForm');
const placeIdInput = document.getElementById('place_id');
const placeNameInput = document.getElementById('place_name');
const placeTypeInput = document.getElementById('place_type');
const placeEmojiInput = document.getElementById('place_emoji');
const placeDescriptionInput = document.getElementById('place_description');
const placeLatInput = document.getElementById('place_lat');
const placeLngInput = document.getElementById('place_lng');
const placeIsActiveInput = document.getElementById('place_is_active');

mainTabPlaces.addEventListener('click', () => {
  showAdminSection('placesAdminSection');
  if (!placesSectionLoaded) {
    placesSectionLoaded = true;
    loadPlacesList();
  }
});

async function loadPlacesList() {
  placesList.innerHTML = '<p class="empty-state">Cargando...</p>';
  const { data, error } = await supabaseClient
    .from('places')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) { placesList.innerHTML = ''; showAlert('No se pudo cargar el listado: ' + error.message, 'error'); return; }
  placesData = data || [];
  renderPlacesList();
}

function renderPlacesList() {
  if (!placesData.length) {
    placesList.innerHTML = '<p class="empty-state">Todavía no hay lugares cargados.</p>';
    return;
  }
  placesList.innerHTML = '';
  placesData.forEach((p, i) => renderPlaceCardAdmin(p, i));
}

function renderPlaceCardAdmin(p, i) {
  const card = document.createElement('div');
  card.className = 'card admin-card';
  card.innerHTML = `
    <div class="top">
      <div style="display:flex; gap:12px; align-items:center;">
        <div style="width:64px; height:44px; border-radius:8px; overflow:hidden; background:var(--ink); flex:none; display:flex; align-items:center; justify-content:center; color:#fff; font-size:18px;">
          ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" style="width:100%; height:100%; object-fit:cover;">` : catIcon(escapeHtml(p.emoji || '📍'), { size: 18, color: '#fff' })}
        </div>
        <div>
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="cat">${escapeHtml(p.type || '')}</div>
        </div>
      </div>
      <span class="badge ${p.is_active ? 'badge-published' : 'badge-draft'}">${p.is_active ? 'Activo' : 'Inactivo'}</span>
    </div>
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

  btn('Editar', 'btn-secondary', () => openPlaceEditForm(p));
  btn(p.is_active ? 'Desactivar' : 'Activar', 'btn-secondary', () => togglePlaceActive(p));
  if (i > 0) btn(ICON('chevron-up', { size: 13 }) + ' Subir', 'btn-secondary', () => reorderPlace(p, -1));
  if (i < placesData.length - 1) btn(ICON('chevron-down', { size: 13 }) + ' Bajar', 'btn-secondary', () => reorderPlace(p, 1));
  btn('Eliminar', 'btn-danger', () => deletePlace(p.id));

  placesList.appendChild(card);
}

async function togglePlaceActive(p) {
  const { error } = await supabaseClient.from('places').update({ is_active: !p.is_active }).eq('id', p.id);
  if (error) { showAlert('No se pudo actualizar: ' + error.message, 'error'); return; }
  loadPlacesList();
}

async function reorderPlace(p, delta) {
  const { error } = await supabaseClient.from('places').update({ sort_order: (p.sort_order || 0) + delta }).eq('id', p.id);
  if (error) { showAlert('No se pudo reordenar: ' + error.message, 'error'); return; }
  loadPlacesList();
}

async function deletePlace(id) {
  if (!confirm('¿Eliminar este lugar definitivamente? Va a dejar de mostrarse en la home.')) return;
  const { error } = await supabaseClient.from('places').delete().eq('id', id);
  if (error) { showAlert('No se pudo eliminar: ' + error.message, 'error'); return; }
  showAlert('Lugar eliminado.', 'success');
  loadPlacesList();
}

// ---------- Formulario (crear / editar) ----------
function placeShowList() { placesFormView.classList.add('hidden'); placesListView.classList.remove('hidden'); clearAlert(); }
function placeShowForm() { placesListView.classList.add('hidden'); placesFormView.classList.remove('hidden'); }
document.getElementById('placeCancelBtn').addEventListener('click', placeShowList);

function placeResetForm() {
  placeForm.reset();
  placeIdInput.value = '';
  placeIsActiveInput.checked = true;
  refreshPlacePhotoUploadState(null, null);
}

document.getElementById('newPlaceBtn').addEventListener('click', () => {
  placeResetForm();
  document.getElementById('placeFormTitle').textContent = 'Nuevo lugar';
  placeShowForm();
});

function openPlaceEditForm(p) {
  placeResetForm();
  document.getElementById('placeFormTitle').textContent = 'Editar lugar';
  placeIdInput.value = p.id;
  placeNameInput.value = p.name || '';
  placeTypeInput.value = p.type || '';
  placeEmojiInput.value = p.emoji || '';
  placeDescriptionInput.value = p.description || '';
  placeLatInput.value = p.lat != null ? p.lat : '';
  placeLngInput.value = p.lng != null ? p.lng : '';
  placeIsActiveInput.checked = !!p.is_active;
  refreshPlacePhotoUploadState(p.id, p.image_url);
  placeShowForm();
}

function slugifyPlaceName(name) {
  return (name || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'lugar';
}

placeForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const name = placeNameInput.value.trim();
  if (!name) { showAlert('El nombre es obligatorio.', 'error'); return; }

  const id = placeIdInput.value;
  const payload = {
    name,
    type: placeTypeInput.value.trim() || null,
    emoji: placeEmojiInput.value.trim() || '📍',
    description: placeDescriptionInput.value.trim() || null,
    lat: placeLatInput.value.trim() ? parseFloat(placeLatInput.value.trim()) : null,
    lng: placeLngInput.value.trim() ? parseFloat(placeLngInput.value.trim()) : null,
    is_active: placeIsActiveInput.checked,
  };

  const saveBtn = document.getElementById('placeSaveBtn');
  saveBtn.disabled = true; saveBtn.textContent = 'Guardando...';

  try {
    if (id) {
      const { error } = await supabaseClient.from('places').update(payload).eq('id', id);
      if (error) throw error;
      showAlert('Lugar guardado.', 'success');
      await loadPlacesList();
      placeShowList();
    } else {
      payload.slug = slugifyPlaceName(name) + '-' + Date.now().toString(36);
      payload.sort_order = placesData.length;
      const { data, error } = await supabaseClient.from('places').insert(payload).select('*').single();
      if (error) throw error;
      showAlert('Lugar creado. Ahora podés subirle una foto.', 'success');
      await loadPlacesList();
      openPlaceEditForm(data);
    }
  } catch (err) {
    showAlert('No se pudo guardar: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false; saveBtn.textContent = 'Guardar lugar';
  }
});

// ---------- Foto (subir + recortar), bucket "place-images" ----------
let currentPlaceId = null;
let placeCropperInstance = null;

const placePhotoInput = document.getElementById('placePhotoInput');
const placeChoosePhotoBtn = document.getElementById('placeChoosePhotoBtn');
const placePhotoPreviewImg = document.getElementById('placePhotoPreviewImg');
const placePhotoPreviewEmpty = document.getElementById('placePhotoPreviewEmpty');

const placeCropperModal = document.getElementById('placeCropperModal');
const placeCropperImage = document.getElementById('placeCropperImage');
const placeCropperCancelBtn = document.getElementById('placeCropperCancelBtn');
const placeCropperConfirmBtn = document.getElementById('placeCropperConfirmBtn');
const placeCropperZoomInBtn = document.getElementById('placeCropperZoomInBtn');
const placeCropperZoomOutBtn = document.getElementById('placeCropperZoomOutBtn');

function refreshPlacePhotoUploadState(placeId, currentPhotoUrl) {
  currentPlaceId = placeId;
  if (currentPhotoUrl) {
    placePhotoPreviewImg.src = currentPhotoUrl;
    placePhotoPreviewImg.style.display = 'block';
    placePhotoPreviewEmpty.style.display = 'none';
  } else {
    placePhotoPreviewImg.style.display = 'none';
    placePhotoPreviewEmpty.style.display = 'block';
  }
}

placeChoosePhotoBtn.addEventListener('click', () => {
  if (!currentPlaceId) {
    showAlert('Primero guardá el nombre del lugar; después le podés subir la foto.', 'error');
    return;
  }
  placePhotoInput.value = '';
  placePhotoInput.click();
});

placePhotoInput.addEventListener('change', () => {
  const file = placePhotoInput.files && placePhotoInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    placeCropperImage.src = reader.result;
    placeCropperModal.classList.remove('hidden');
    lockBodyScroll();

    if (placeCropperInstance) placeCropperInstance.destroy();
    placeCropperInstance = new Cropper(placeCropperImage, {
      aspectRatio: 16 / 9,
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

function closePlaceCropperModal() {
  if (placeCropperInstance) {
    placeCropperInstance.destroy();
    placeCropperInstance = null;
  }
  placeCropperModal.classList.add('hidden');
  placePhotoInput.value = '';
  unlockBodyScroll();
}

placeCropperCancelBtn.addEventListener('click', closePlaceCropperModal);
if (placeCropperZoomInBtn) placeCropperZoomInBtn.addEventListener('click', () => placeCropperInstance && placeCropperInstance.zoom(0.1));
if (placeCropperZoomOutBtn) placeCropperZoomOutBtn.addEventListener('click', () => placeCropperInstance && placeCropperInstance.zoom(-0.1));

placeCropperConfirmBtn.addEventListener('click', () => {
  if (!placeCropperInstance || !currentPlaceId) return;

  placeCropperConfirmBtn.disabled = true;
  placeCropperConfirmBtn.textContent = 'Subiendo...';

  const canvas = placeCropperInstance.getCroppedCanvas({ width: 1200, height: 675 });
  canvas.toBlob(async (blob) => {
    if (!blob) {
      placeCropperConfirmBtn.disabled = false;
      placeCropperConfirmBtn.textContent = 'Guardar foto';
      showAlert('No se pudo procesar la imagen.', 'error');
      return;
    }

    const path = `${currentPlaceId}/cover-${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseClient.storage
      .from('place-images')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) {
      placeCropperConfirmBtn.disabled = false;
      placeCropperConfirmBtn.textContent = 'Guardar foto';
      showAlert('No se pudo subir la foto: ' + uploadError.message, 'error');
      return;
    }

    const { data: pub } = supabaseClient.storage.from('place-images').getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { error: updateError } = await supabaseClient
      .from('places')
      .update({ image_url: publicUrl })
      .eq('id', currentPlaceId);

    placeCropperConfirmBtn.disabled = false;
    placeCropperConfirmBtn.textContent = 'Guardar foto';

    if (updateError) {
      showAlert('La foto se subió pero no se pudo guardar en el lugar: ' + updateError.message, 'error');
      return;
    }

    placePhotoPreviewImg.src = publicUrl;
    placePhotoPreviewImg.style.display = 'block';
    placePhotoPreviewEmpty.style.display = 'none';
    closePlaceCropperModal();
    showAlert('Foto actualizada.', 'success');
    loadPlacesList();
  }, 'image/jpeg', 0.85);
});
