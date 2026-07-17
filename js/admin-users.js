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
let userLoginInfoById = {};

function fmtUserDateTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const ROLE_LABELS = {
  comercio: 'Comercio',
  comercio_pro: 'Comercio Pro',
  eventos: 'Eventos',
  presidente: 'Presidente de cámara',
  master_eventos: 'Master Eventos',
  admin: 'Administrador',
};

const mainTabUsuarios = document.getElementById('mainTabUsuarios');
const usersAdminList = document.getElementById('usersAdminList');
const searchUsersAdmin = document.getElementById('searchUsersAdmin');

const usuariosListView = document.getElementById('usuariosListView');
const usuariosFormView = document.getElementById('usuariosFormView');
const usuariosNewFormView = document.getElementById('usuariosNewFormView');
const userForm = document.getElementById('userForm');
const userIdInput = document.getElementById('user_id');
const userEmailInput = document.getElementById('user_email');
const userNewPasswordInput = document.getElementById('user_new_password');
const userFullNameInput = document.getElementById('user_full_name');
const userPhoneInput = document.getElementById('user_phone');
const userRoleSelect = document.getElementById('user_role');
const userChamberWrap = document.getElementById('user_chamber_wrap');
const userChamberSelect = document.getElementById('user_chamber');
const userBusinessesList = document.getElementById('userBusinessesList');
const saveUserBtn = document.getElementById('saveUserBtn');

const assignBusinessSearch = document.getElementById('assign_business_search');
const assignBusinessResults = document.getElementById('assign_business_results');

const newUserBtn = document.getElementById('newUserBtn');
const newUserForm = document.getElementById('newUserForm');
const newUserEmailInput = document.getElementById('newuser_email');
const newUserPasswordInput = document.getElementById('newuser_password');
const newUserFullNameInput = document.getElementById('newuser_full_name');
const newUserPhoneInput = document.getElementById('newuser_phone');
const newUserRoleSelect = document.getElementById('newuser_role');
const newUserChamberWrap = document.getElementById('newuser_chamber_wrap');
const newUserChamberSelect = document.getElementById('newuser_chamber');
const createUserBtn = document.getElementById('createUserBtn');

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
  usuariosNewFormView.classList.add('hidden');
  usuariosListView.classList.remove('hidden');
}
function showUsersFormView() {
  usuariosListView.classList.add('hidden');
  usuariosNewFormView.classList.add('hidden');
  usuariosFormView.classList.remove('hidden');
}
function showUsersNewFormView() {
  usuariosListView.classList.add('hidden');
  usuariosFormView.classList.add('hidden');
  usuariosNewFormView.classList.remove('hidden');
}

async function loadUsersAdmin() {
  usersAdminList.innerHTML = '<p class="empty-state">Cargando...</p>';

  const [{ data: profiles, error: profErr }, { data: businesses, error: bizErr }, { data: logins, error: loginErr }] = await Promise.all([
    supabaseClient
      .from('profiles')
      .select('id, full_name, phone, email, is_admin, is_blocked, role, chamber, created_at')
      .order('created_at', { ascending: false }),
    supabaseClient.from('businesses').select('owner_id'),
    supabaseClient.rpc('admin_list_user_logins'),
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

  // No es crítico: si falla (ej. función todavía no migrada en la base),
  // simplemente no se muestra el bloque de último login.
  userLoginInfoById = {};
  if (!loginErr) {
    (logins || []).forEach((l) => { userLoginInfoById[l.id] = l; });
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

  const loginInfo = userLoginInfoById[u.id];
  const loginInfoBox = document.getElementById('userLoginInfo');
  if (loginInfo) {
    const lastLogin = fmtUserDateTime(loginInfo.last_sign_in_at);
    const createdAt = fmtUserDateTime(loginInfo.auth_created_at || u.created_at);
    loginInfoBox.innerHTML = `
      <span>🕐 Último inicio de sesión: <strong>${lastLogin || 'Nunca inició sesión'}</strong></span>
      ${createdAt ? `<span>📅 Cuenta creada el: <strong>${createdAt}</strong></span>` : ''}
    `;
  } else {
    loginInfoBox.innerHTML = '';
  }

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

  const newEmail = userEmailInput.value.trim();
  const newPassword = userNewPasswordInput.value;

  if (!newEmail) {
    showAlert('El email no puede quedar vacío.', 'error');
    return;
  }
  if (newPassword && newPassword.length < 6) {
    showAlert('La contraseña nueva tiene que tener al menos 6 caracteres.', 'error');
    return;
  }

  const emailChanged = u && newEmail !== u.email;
  if (emailChanged || newPassword) {
    const parts = [];
    if (emailChanged) parts.push(`el email a "${newEmail}"`);
    if (newPassword) parts.push('la contraseña');
    if (!window.confirm(`¿Confirmás cambiar ${parts.join(' y ')} de ${u.full_name || u.email}?`)) return;
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

  if (error) {
    saveUserBtn.disabled = false;
    saveUserBtn.textContent = 'Guardar cambios';
    showAlert('No se pudo guardar: ' + error.message, 'error');
    return;
  }

  if (emailChanged || newPassword) {
    const { error: credError } = await supabaseClient.rpc('admin_update_user_credentials', {
      target_user_id: id,
      new_email: emailChanged ? newEmail : null,
      new_password: newPassword || null,
    });

    saveUserBtn.disabled = false;
    saveUserBtn.textContent = 'Guardar cambios';

    if (credError) {
      showAlert('Se guardaron nombre/teléfono/rol, pero no se pudo cambiar el email/contraseña: ' + credError.message, 'error');
      loadUsersAdmin();
      return;
    }
  } else {
    saveUserBtn.disabled = false;
    saveUserBtn.textContent = 'Guardar cambios';
  }

  showUsersListView();
  showAlert('Usuario actualizado.', 'success');
  loadUsersAdmin();
});

// ---------- Nuevo usuario ----------
newUserBtn.addEventListener('click', () => {
  newUserForm.reset();
  updateNewUserChamberVisibility();
  clearAlert();
  showUsersNewFormView();
});
document.getElementById('cancelNewUserBtn').addEventListener('click', showUsersListView);

function updateNewUserChamberVisibility() {
  newUserChamberWrap.classList.toggle('hidden', newUserRoleSelect.value !== 'presidente');
}
newUserRoleSelect.addEventListener('change', updateNewUserChamberVisibility);

newUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const email = newUserEmailInput.value.trim();
  const password = newUserPasswordInput.value;
  const role = newUserRoleSelect.value;
  const chamber = newUserChamberSelect.value;

  if (!email) {
    showAlert('El email es obligatorio.', 'error');
    return;
  }
  if (!password || password.length < 6) {
    showAlert('La contraseña tiene que tener al menos 6 caracteres.', 'error');
    return;
  }
  if (role === 'presidente' && !chamber) {
    showAlert('Elegí qué cámara preside este usuario.', 'error');
    return;
  }

  createUserBtn.disabled = true;
  createUserBtn.textContent = 'Creando...';

  const { error } = await supabaseClient.rpc('admin_create_user', {
    new_email: email,
    new_password: password,
    new_full_name: newUserFullNameInput.value.trim() || null,
    new_phone: newUserPhoneInput.value.trim() || null,
    new_role: role,
    new_chamber: role === 'presidente' ? chamber : null,
  });

  createUserBtn.disabled = false;
  createUserBtn.textContent = 'Crear usuario';

  if (error) {
    showAlert('No se pudo crear el usuario: ' + error.message, 'error');
    return;
  }

  showUsersListView();
  showAlert('Usuario creado correctamente.', 'success');
  loadUsersAdmin();
});

// ---------- Asignar una ficha existente al usuario que se edita ----------
let assignBusinessSearchTimeout = null;

function hideAssignBusinessResults() {
  assignBusinessResults.classList.add('hidden');
}

async function searchBusinessesToAssign(query) {
  const q = query.trim();
  if (q.length < 2) {
    assignBusinessResults.innerHTML = '<div class="autocomplete-empty">Escribí al menos 2 letras para buscar.</div>';
    assignBusinessResults.classList.remove('hidden');
    return;
  }

  const { data, error } = await supabaseClient
    .from('businesses')
    .select('id, name, address, owner_id, profiles(full_name)')
    .ilike('name', `%${q}%`)
    .order('name', { ascending: true })
    .limit(15);

  if (error) {
    assignBusinessResults.innerHTML = `<div class="autocomplete-empty">Error buscando comercios: ${escapeHtml(error.message)}</div>`;
    assignBusinessResults.classList.remove('hidden');
    return;
  }

  const items = data || [];
  if (!items.length) {
    assignBusinessResults.innerHTML = '<div class="autocomplete-empty">No encontramos comercios con ese nombre.</div>';
  } else {
    assignBusinessResults.innerHTML = items.map((b) => {
      const ownerName = b.profiles ? b.profiles.full_name : null;
      const sub = ownerName ? `Dueño actual: ${escapeHtml(ownerName)}` : 'Sin dueño asignado';
      return `<div class="autocomplete-item" data-business="${b.id}" data-name="${escapeHtml(b.name)}">
        <div>${escapeHtml(b.name)}</div>
        <div style="font-size:12px; color:var(--muted);">${sub}</div>
      </div>`;
    }).join('');
    assignBusinessResults.querySelectorAll('[data-business]').forEach((el) => {
      el.addEventListener('click', () => assignBusinessToCurrentUser(el.getAttribute('data-business'), el.getAttribute('data-name')));
    });
  }
  assignBusinessResults.classList.remove('hidden');
}

assignBusinessSearch.addEventListener('input', () => {
  clearTimeout(assignBusinessSearchTimeout);
  const q = assignBusinessSearch.value;
  assignBusinessSearchTimeout = setTimeout(() => searchBusinessesToAssign(q), 250);
});
assignBusinessSearch.addEventListener('focus', () => {
  if (assignBusinessSearch.value.trim().length >= 2) searchBusinessesToAssign(assignBusinessSearch.value);
});
assignBusinessSearch.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideAssignBusinessResults();
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('#assign_business_search') && !e.target.closest('#assign_business_results')) {
    hideAssignBusinessResults();
  }
});

async function assignBusinessToCurrentUser(businessId, businessName) {
  const u = allUsersAdmin.find((x) => x.id === userIdInput.value);
  if (!u) return;

  if (!window.confirm(`¿Asignar "${businessName}" a ${u.full_name || u.email}? Esto reemplaza al dueño anterior de esa ficha.`)) {
    return;
  }

  const { error } = await supabaseClient
    .from('businesses')
    .update({ owner_id: u.id })
    .eq('id', businessId);

  if (error) {
    showAlert('No se pudo asignar la ficha: ' + error.message, 'error');
    return;
  }

  assignBusinessSearch.value = '';
  hideAssignBusinessResults();
  showAlert(`"${businessName}" ahora pertenece a ${u.full_name || u.email}.`, 'success');
  openUserEditForm(u);
  loadUsersAdmin();
}

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
