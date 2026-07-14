// ============================================================
// Admin — sección "Usuarios": listado de todas las cuentas
// registradas + bloquear/desbloquear su acceso al panel.
// Se carga después de js/admin.js (reutiliza showAlert, clearAlert,
// escapeHtml, currentAdminUser, showAdminSection).
// ============================================================

let usersAdminSectionLoaded = false;
let allUsersAdmin = [];
let businessCountByOwner = {};

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
      .select('id, full_name, phone, email, is_admin, is_blocked, created_at')
      .order('created_at', { ascending: false }),
    supabaseClient.from('businesses').select('owner_id'),
  ]);

  if (profErr) {
    usersAdminList.innerHTML = '';
    showAlert('No se pudo cargar el listado de usuarios: ' + profErr.message, 'error');
    return;
  }

  businessCountByOwner = {};
  (businesses || []).forEach((b) => {
    if (!b.owner_id) return;
    businessCountByOwner[b.owner_id] = (businessCountByOwner[b.owner_id] || 0) + 1;
  });
  if (bizErr) {
    // no bloquea el listado de usuarios, solo no vamos a poder mostrar el conteo
    businessCountByOwner = {};
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

  if (allUsersAdmin.length === 0) {
    usersAdminList.innerHTML = '<p class="empty-state">Todavía no hay usuarios registrados.</p>';
    return;
  }
  if (filtered.length === 0) {
    usersAdminList.innerHTML = '<p class="empty-state">No encontramos usuarios con ese filtro.</p>';
    return;
  }

  usersAdminList.innerHTML = '';
  filtered.forEach((u) => renderUserRow(u));
}

function renderUserRow(u) {
  const count = businessCountByOwner[u.id] || 0;
  const isSelf = currentAdminUser && u.id === currentAdminUser.id;

  const card = document.createElement('div');
  card.className = 'card admin-card';
  card.innerHTML = `
    <div class="top">
      <div>
        <div class="name">${escapeHtml(u.full_name) || '(sin nombre)'}</div>
        <div class="cat">${escapeHtml(u.email) || '(sin email)'}</div>
      </div>
      <span class="badge ${u.is_blocked ? 'badge-rejected' : 'badge-published'}">${u.is_blocked ? 'Bloqueado' : 'Activo'}</span>
    </div>
    <dl>
      <dt>Teléfono</dt>
      <dd>${escapeHtml(u.phone) || '—'}</dd>
      <dt>Fichas a su nombre</dt>
      <dd>${count}</dd>
      <dt>Tipo de cuenta</dt>
      <dd>${u.is_admin ? 'Administrador' : 'Comercio'}</dd>
    </dl>
    <div class="admin-actions"></div>
  `;

  const actions = card.querySelector('.admin-actions');

  if (u.is_admin) {
    const note = document.createElement('span');
    note.style.cssText = 'font-size:12px; color:var(--muted);';
    note.textContent = isSelf ? 'Sos vos: no te podés bloquear a vos mismo.' : 'Cuenta de administrador: no se bloquea desde acá.';
    actions.appendChild(note);
  } else {
    const toggleBtn = document.createElement('button');
    toggleBtn.className = u.is_blocked ? 'btn btn-primary btn-small' : 'btn btn-danger btn-small';
    toggleBtn.textContent = u.is_blocked ? 'Desbloquear' : 'Bloquear';
    toggleBtn.addEventListener('click', () => toggleUserBlocked(u));
    actions.appendChild(toggleBtn);
  }

  usersAdminList.appendChild(card);
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
