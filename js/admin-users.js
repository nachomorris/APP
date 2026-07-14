// ============================================================
// Admin — sección "Usuarios": listado (tabla) de todas las cuentas
// registradas, bloquear/desbloquear, y un botón "Editar" que abre
// un formulario para nombre/teléfono/rol/cámara + ver sus fichas.
// Se carga después de js/admin.js (reutiliza showAlert, clearAlert,
// escapeHtml, currentAdminUser, showAdminSection).
// ============================================================

let usersAdminSectionLoaded = false;
let allUsersAdmin = [];
let businessCountByOwner = {};

const ROLE_LABELS = {
  comercio: 'Comercio',
  comercio_pro: 'Comercio Pro',
  eventos: 'Eventos',
  presidente: 'Presidente de cámara',
  admin: 'Administrador',
};

const mainTabUsuarios = document.getElementById('mainTabUsuarios');
const usersAdminList = document.getElementById('usersAdminList');
const searchUsersAdmin = document.getElementById('searchUsersAdmin');

const usuariosListView = document.getElementById('usuariosListView');
const usuariosFormView = document.getElementById('usuariosFormView');
const userForm = document.getElementById('userForm');
const userIdInput = document.getElementById('user_id');
const userEmailInput = document.getElementById('user_email');
const userFullNameInput = document.getElementById('user_full_name');
const userPhoneInput = document.getElementById('user_phone');
const userRoleSelect = document.getElementById('user_role');
const userChamberWrap = document.getElementById('user_chamber_wrap');
const userChamberSelect = document.getElementById('user_chamber');
const userBusinessesList = document.getElementById('userBusinessesList');
const saveUserBtn = document.getElementById('saveUserBtn');

mainTabUsuarios.addEventListener('click', () => {
  showAdminSection('usuariosAdminSection');
  showUsersListView();
  if (!usersAdminSectionLoaded) {
    usersAdminSectionLoaded = true;
    loadUsersAdmin();
  }
});

searchUsersAdmin.addEventListener('input', renderUsersAdminList);

function showUsersListView() {
  usuariosFormView.classList.add('hidden');
  usuariosListView.classList.remove('hidden');
}
function showUsersFormView() {
  usuariosListView.classList.add('hidden');
  usuariosFormView.classList.remove('hidden');
}

async function loadUsersAdmin() {
  usersAdminList.innerHTML = '<p class="empty-state">Cargando...</p>';

  const [{ data: profiles, error: profErr }, { data: businesses, error: bizErr }] = await Promise.all([
    supabaseClient
      .from('profiles')
      .select('id, full_name, phone, email, is_admin, is_blocked, role, chamber, created_at')
      .order('created_at', { ascending: false }),
    supabaseClient.from('businesses').select('owner_id'),
  ]);

  if (profErr) {
    usersAdminList.innerHTML = '';
    showAlert('No se pudo cargar el listado de usuarios: ' + profErr.message, 'error');
    return;
  }

  businessCountByOwner = {};
  if (!bizErr) {
    (businesses || []).forEach((b) => {
      if (!b.owner_id) return;
      businessCountByOwner[b.owner_id] = (businessCountByOwner[b.owner_id] || 0) + 1;
    });
  }

  allUsersAdmin = profiles || [];
  renderUsersAdminList();
}

function renderUsersAdminList() {
  const term = searchUsersAdmin.value.trim().toLowerCase();

  const filtered = allUsersAdmin.filter((u) => {
    if (!term) return true;
    const haystack = ((u.full_name || '') + ' ' + (u.email || '') + ' ' + (u.phone || '')).toLowerCase();
    return haystack.includes(term);
  });

  usersAdminList.innerHTML = '';

  if (allUsersAdmin.length === 0) {
    usersAdminList.innerHTML = '<p class="empty-state">Todavía no hay usuarios registrados.</p>';
    return;
  }
  if (filtered.length === 0) {
    usersAdminList.innerHTML = '<p class="empty-state">No encontramos usuarios con ese filtro.</p>';
    return;
  }

  renderUsersTable(filtered);
}

function renderUsersTable(list) {
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';

  const table = document.createElement('table');
  table.className = 'admin-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>Nombre</th>
        <th>Email</th>
        <th>Teléfono</th>
        <th>Fichas</th>
        <th>Rol</th>
        <th>Estado</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector('tbody');

  list.forEach((u) => {
    const count = businessCountByOwner[u.id] || 0;
    const roleText = ROLE_LABELS[u.role] || u.role || '—';
    const roleExtra = u.role === 'presidente' && u.chamber ? ` (${escapeHtml(u.chamber)})` : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="wrap"><strong>${escapeHtml(u.full_name) || '(sin nombre)'}</strong></td>
      <td class="wrap">${escapeHtml(u.email) || '—'}</td>
      <td>${escapeHtml(u.phone) || '—'}</td>
      <td>${count}</td>
      <td>${escapeHtml(roleText)}${roleExtra}</td>
      <td><span class="badge ${u.is_blocked ? 'badge-rejected' : 'badge-published'}">${u.is_blocked ? 'Bloqueado' : 'Activo'}</span></td>
      <td><div class="row-actions"></div></td>
    `;
    const actions = tr.querySelector('.row-actions');

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-small';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => openUserEditForm(u));
    actions.appendChild(editBtn);

    actions.appendChild(buildUserActionEl(u));

    tbody.appendChild(tr);
  });

  wrap.appendChild(table);
  usersAdminList.appendChild(wrap);
}

function buildUserActionEl(u) {
  const isSelf = currentAdminUser && u.id === currentAdminUser.id;
  if (u.role === 'admin') {
    const note = document.createElement('span');
    note.style.cssText = 'font-size:12px; color:var(--muted);';
    note.textContent = isSelf ? 'Sos vos' : 'No se bloquea';
    return note;
  }
  const toggleBtn = document.createElement('button');
  toggleBtn.className = u.is_blocked ? 'btn btn-primary btn-small' : 'btn btn-danger btn-small';
  toggleBtn.textContent = u.is_blocked ? 'Desbloquear' : 'Bloquear';
  toggleBtn.addEventListener('click', () => toggleUserBlocked(u));
  return toggleBtn;
}

// ---------- Formulario de edición ----------
function updateChamberVisibility() {
  userChamberWrap.classList.toggle('hidden', userRoleSelect.value !== 'presidente');
}
userRoleSelect.addEventListener('change', updateChamberVisibility);

document.getElementById('cancelUserBtn').addEventListener('click', showUsersListView);

async function openUserEditForm(u) {
  userForm.reset();
  userIdInput.value = u.id;
  userEmailInput.value = u.email || '';
  userFullNameInput.value = u.full_name || '';
  userPhoneInput.value = u.phone || '';
  userRoleSelect.value = u.role || 'comercio';
  userChamberSelect.value = u.chamber || '';
  updateChamberVisibility();

  const isSelf = currentAdminUser && u.id === currentAdminUser.id;
  userRoleSelect.disabled = isSelf;

  showUsersFormView();

  userBusinessesList.innerHTML = '<p class="empty-state">Cargando...</p>';
  const { data: bizList, error } = await supabaseClient
    .from('businesses')
    .select('id, name, status, categories(label)')
    .eq('owner_id', u.id)
    .order('name', { ascending: true });

  if (error) {
    userBusinessesList.innerHTML = '';
    showAlert('No se pudieron cargar las fichas de este usuario: ' + error.message, 'error');
    return;
  }

  if (!bizList || bizList.length === 0) {
    userBusinessesList.innerHTML = '<p class="empty-state">No tiene ninguna ficha a su nombre.</p>';
    return;
  }

  userBusinessesList.innerHTML = bizList.map((b) => {
    const st = statusLabel(b.status);
    return `
      <div class="business-item">
        <div class="info">
          <div class="name">${escapeHtml(b.name)}</div>
          <div class="meta">${escapeHtml(b.categories ? b.categories.label : '')} · <span class="badge ${st.cls}">${st.text}</span></div>
        </div>
      </div>
    `;
  }).join('');
}

userForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const id = userIdInput.value;
  const newRole = userRoleSelect.value;
  const u = allUsersAdmin.find((x) => x.id === id);

  if (newRole === 'presidente' && !userChamberSelect.value) {
    showAlert('Elegí qué cámara preside este usuario.', 'error');
    return;
  }

  if (u && newRole !== u.role) {
    const label = ROLE_LABELS[newRole];
    const confirmMsg = newRole === 'admin'
      ? `¿Seguro que querés hacer administrador a ${u.full_name || u.email}? Va a tener acceso total al panel de admin.`
      : `¿Cambiar el rol de ${u.full_name || u.email} a "${label}"?`;
    if (!window.confirm(confirmMsg)) return;
  }

  const payload = {
    full_name: userFullNameInput.value.trim() || null,
    phone: userPhoneInput.value.trim() || null,
    role: newRole,
    chamber: newRole === 'presidente' ? userChamberSelect.value : null,
  };

  saveUserBtn.disabled = true;
  saveUserBtn.textContent = 'Guardando...';

  const { error } = await supabaseClient.from('profiles').update(payload).eq('id', id);

  saveUserBtn.disabled = false;
  saveUserBtn.textContent = 'Guardar cambios';

  if (error) {
    showAlert('No se pudo guardar: ' + error.message, 'error');
    return;
  }

  showUsersListView();
  showAlert('Usuario actualizado.', 'success');
  loadUsersAdmin();
});

async function toggleUserBlocked(u) {
  const newValue = !u.is_blocked;
  const confirmMsg = newValue
    ? `¿Bloquear a ${u.full_name || u.email}? No va a poder entrar a su panel ni editar sus fichas hasta que lo desbloquees.`
    : `¿Desbloquear a ${u.full_name || u.email}?`;
  if (!window.confirm(confirmMsg)) return;

  const { error } = await supabaseClient
    .from('profiles')
    .update({ is_blocked: newValue })
    .eq('id', u.id);

  if (error) {
    showAlert('No se pudo actualizar: ' + error.message, 'error');
    return;
  }

  u.is_blocked = newValue;
  showAlert(newValue ? 'Usuario bloqueado.' : 'Usuario desbloqueado.', 'success');
  renderUsersAdminList();
}
