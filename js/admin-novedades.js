// ============================================================
// Panel de administración — sección "Novedades".
// Se carga después de js/admin.js (usa supabaseClient, showAlert(),
// clearAlert(), escapeHtml(), currentAdminUser, showAdminSection()).
// ============================================================

let allNovedades = [];
let novedadesLoaded = false;

const mainTabNovedades = document.getElementById('mainTabNovedades');
const novedadesListView = document.getElementById('novedadesListView');
const novedadFormView = document.getElementById('novedadFormView');
const novedadesListEl = document.getElementById('novedadesList');
const novedadForm = document.getElementById('novedadForm');

mainTabNovedades.addEventListener('click', () => {
  showAdminSection('novedadesAdminSection');
  if (!novedadesLoaded) {
    novedadesLoaded = true;
    loadNovedadesAdmin();
    loadNovedadesPanelSetting();
  }
});

// ---------- Interruptor: habilitar/deshabilitar todo el panel ----------
const novedadesPanelEnabledInput = document.getElementById('novedadesPanelEnabled');

async function loadNovedadesPanelSetting() {
  const { data, error } = await supabaseClient
    .from('app_settings')
    .select('value')
    .eq('key', 'novedades_enabled')
    .maybeSingle();
  if (error) { showAlert('No se pudo leer el estado del panel: ' + error.message, 'error'); return; }
  novedadesPanelEnabledInput.checked = data ? data.value !== false : true;
}

novedadesPanelEnabledInput.addEventListener('change', async () => {
  const enabled = novedadesPanelEnabledInput.checked;
  novedadesPanelEnabledInput.disabled = true;
  const { error } = await supabaseClient
    .from('app_settings')
    .upsert({ key: 'novedades_enabled', value: enabled });
  novedadesPanelEnabledInput.disabled = false;
  if (error) {
    showAlert('No se pudo actualizar: ' + error.message, 'error');
    novedadesPanelEnabledInput.checked = !enabled;
    return;
  }
  showAlert(enabled ? 'Panel de Novedades habilitado: ya se ve en el sitio.' : 'Panel de Novedades deshabilitado: desapareció de la barra inferior del sitio.', 'success');
});

async function loadNovedadesAdmin() {
  novedadesListEl.innerHTML = '<p class="empty-state">Cargando...</p>';
  const { data, error } = await supabaseClient
    .from('novedades')
    .select('*')
    .order('published_at', { ascending: false });

  if (error) {
    novedadesListEl.innerHTML = '';
    showAlert('No se pudieron cargar las novedades: ' + error.message, 'error');
    return;
  }

  allNovedades = data || [];
  renderNovedadesList();
}

function renderNovedadesList() {
  if (allNovedades.length === 0) {
    novedadesListEl.innerHTML = '<p class="empty-state">Todavía no cargaste ninguna novedad. Creá la primera con el botón de arriba.</p>';
    return;
  }

  novedadesListEl.innerHTML = '';
  allNovedades.forEach((n) => {
    const item = document.createElement('div');
    item.className = 'business-item';
    item.innerHTML = `
      <div class="info">
        <div class="name">${escapeHtml(n.title)}</div>
        <div class="meta">${escapeHtml(n.published_at)} · <span class="badge ${n.is_published ? 'badge-published' : 'badge-draft'}">${n.is_published ? 'Publicada' : 'Oculta'}</span></div>
      </div>
      <div style="display:flex; gap:8px;">
        <button class="btn btn-secondary btn-small" data-edit="${n.id}">Editar</button>
        <button class="btn btn-danger btn-small" data-del="${n.id}">Eliminar</button>
      </div>
    `;
    novedadesListEl.appendChild(item);
  });

  novedadesListEl.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openNovedadForm(b.getAttribute('data-edit'))));
  novedadesListEl.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => deleteNovedad(b.getAttribute('data-del'))));
}

async function deleteNovedad(id) {
  if (!confirm('¿Eliminar esta novedad definitivamente?')) return;
  const { error } = await supabaseClient.from('novedades').delete().eq('id', id);
  if (error) {
    showAlert('No se pudo eliminar: ' + error.message, 'error');
    return;
  }
  showAlert('Novedad eliminada.', 'success');
  loadNovedadesAdmin();
}

function showNovedadesListView() {
  novedadFormView.classList.add('hidden');
  novedadesListView.classList.remove('hidden');
  clearAlert();
}
function showNovedadFormView() {
  novedadesListView.classList.add('hidden');
  novedadFormView.classList.remove('hidden');
}

document.getElementById('newNovedadBtn').addEventListener('click', () => openNovedadForm(null));
document.getElementById('novCancelBtn').addEventListener('click', showNovedadesListView);

function todayYMDAdmin() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function openNovedadForm(id) {
  novedadForm.reset();
  document.getElementById('nov_id').value = '';
  document.getElementById('nov_published_at').value = todayYMDAdmin();
  document.getElementById('nov_is_published').checked = true;

  if (!id) {
    document.getElementById('novedadFormTitle').textContent = 'Nueva novedad';
    showNovedadFormView();
    return;
  }

  const n = allNovedades.find((x) => x.id === id);
  if (!n) { showAlert('No se encontró la novedad.', 'error'); return; }

  document.getElementById('novedadFormTitle').textContent = 'Editar novedad';
  document.getElementById('nov_id').value = n.id;
  document.getElementById('nov_title').value = n.title || '';
  document.getElementById('nov_description').value = n.description || '';
  document.getElementById('nov_published_at').value = n.published_at || todayYMDAdmin();
  document.getElementById('nov_is_published').checked = n.is_published !== false;
  showNovedadFormView();
}

novedadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const id = document.getElementById('nov_id').value;
  const title = document.getElementById('nov_title').value.trim();
  const publishedAt = document.getElementById('nov_published_at').value;

  if (!title) { showAlert('El título es obligatorio.', 'error'); return; }
  if (!publishedAt) { showAlert('Elegí una fecha.', 'error'); return; }

  const payload = {
    title,
    description: document.getElementById('nov_description').value.trim(),
    published_at: publishedAt,
    is_published: document.getElementById('nov_is_published').checked,
  };

  const saveBtn = document.getElementById('novSaveBtn');
  saveBtn.disabled = true; saveBtn.textContent = 'Guardando...';

  let error;
  if (id) {
    ({ error } = await supabaseClient.from('novedades').update(payload).eq('id', id));
  } else {
    payload.created_by = currentAdminUser.id;
    ({ error } = await supabaseClient.from('novedades').insert(payload));
  }

  saveBtn.disabled = false; saveBtn.textContent = 'Guardar novedad';

  if (error) {
    showAlert('No se pudo guardar: ' + error.message, 'error');
    return;
  }

  showNovedadesListView();
  showAlert(id ? 'Novedad actualizada.' : 'Novedad creada.', 'success');
  loadNovedadesAdmin();
});
