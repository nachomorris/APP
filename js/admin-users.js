// ============================================================
// Admin — sección "Usuarios": listado (solo tabla) de todas las
// cuentas registradas, con su rol y bloquear/desbloquear el acceso.
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
  admin: 'Administrador',
};

const mainTabUsuarios = document.getElementById('mainTabUsuarios');
const usersAdminList = document.getElementById('usersAdminList');
const searchUsersAdmin = document.getElementById('searchUsersAdmin');

mainTabUsuarios.addEventListener('click', () => {
  showAdminSection('usuariosAdminSection');
  if (!usersAdminSectionLoaded) {
    usersAdminSectionLoaded = true;
    loadUsersAdmin();
  }
});

searchUsersAdmin.addEventListener('input', renderUsersAdminList);

async function loadUsersAdmin() {
  usersAdminList.innerHTML = '<p class="empty-state">Cargando...</p>';

  const [{ data: profiles, error: profErr }, { data: businesses, error: bizErr }] = await Promise.all([
    supabaseClient
      .from('profiles')
      .select('id, full_name, phone, email, is_admin, is_blocked, role, created_at')
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

function buildUserActionEl(u) {
  const isSelf = currentAdminUser && u.id === currentAdminUser.id;
  if (u.role === 'admin') {
    const note = document.createElement('span');
    note.style.cssText = 'font-size:12px; color:var(--muted);';
    note.textContent = isSelf ? 'Sos vos' : 'No se bloquea desde acá';
    return note;
  }
  const toggleBtn = document.createElement('button');
  toggleBtn.className = u.is_blocked ? 'btn btn-primary btn-small' : 'btn btn-danger btn-small';
  toggleBtn.textContent = u.is_blocked ? 'Desbloquear' : 'Bloquear';
  toggleBtn.addEventListener('click', () => toggleUserBlocked(u));
  return toggleBtn;
}

function buildRoleSelectEl(u) {
  const isSelf = currentAdminUser && u.id === currentAdminUser.id;

  const select = document.createElement('select');
  select.style.cssText = 'margin:0; padding:6px 8px; font-size:13px;';
  Object.keys(ROLE_LABELS).forEach((roleId) => {
    const opt = document.createElement('option');
    opt.value = roleId;
    opt.textContent = ROLE_LABELS[roleId];
    if (u.role === roleId) opt.selected = true;
    select.appendChild(opt);
  });

  if (isSelf) {
    select.disabled = true;
    select.title = 'No te podés cambiar el rol a vos mismo.';
  } else {
    select.addEventListener('change', () => changeUserRole(u, select.value, select));
  }

  return select;
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
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="wrap"><strong>${escapeHtml(u.full_name) || '(sin nombre)'}</strong></td>
      <td class="wrap">${escapeHtml(u.email) || '—'}</td>
      <td>${escapeHtml(u.phone) || '—'}</td>
      <td>${count}</td>
      <td class="role-cell"></td>
      <td><span class="badge ${u.is_blocked ? 'badge-rejected' : 'badge-published'}">${u.is_blocked ? 'Bloqueado' : 'Activo'}</span></td>
      <td><div class="row-actions"></div></td>
    `;
    tr.querySelector('.role-cell').appendChild(buildRoleSelectEl(u));
    tr.querySelector('.row-actions').appendChild(buildUserActionEl(u));
    tbody.appendChild(tr);
  });

  wrap.appendChild(table);
  usersAdminList.appendChild(wrap);
}

async function changeUserRole(u, newRole, selectEl) {
  if (newRole === u.role) return;

  const label = ROLE_LABELS[newRole];
  const confirmMsg = newRole === 'admin'
    ? `¿Seguro que querés hacer administrador a ${u.full_name || u.email}? Va a tener acceso total al panel de admin.`
    : `¿Cambiar el rol de ${u.full_name || u.email} a "${label}"?`;

  if (!window.confirm(confirmMsg)) {
    selectEl.value = u.role;
    return;
  }

  selectEl.disabled = true;
  const { error } = await supabaseClient
    .from('profiles')
    .update({ role: newRole })
    .eq('id', u.id);
  selectEl.disabled = false;

  if (error) {
    showAlert('No se pudo cambiar el rol: ' + error.message, 'error');
    selectEl.value = u.role;
    return;
  }

  u.role = newRole;
  u.is_admin = newRole === 'admin';
  showAlert('Rol actualizado.', 'success');
  renderUsersAdminList();
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
