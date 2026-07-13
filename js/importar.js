const alertBox = document.getElementById('alert');
const summaryEl = document.getElementById('summary');
const importBtn = document.getElementById('importBtn');

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = 'alert show alert-' + type;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

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
    showAlert('Esta sección es solo para administradores.', 'error');
    setTimeout(() => { window.location.href = 'panel.html'; }, 1800);
    return null;
  }
  return user;
}

let adminUser = null;

async function init() {
  adminUser = await requireAdmin();
  if (!adminUser) return;

  const cats = (typeof IMPORT_CATEGORIES !== 'undefined') ? IMPORT_CATEGORIES.length : 0;
  const subcats = (typeof IMPORT_SUBCATEGORIES !== 'undefined') ? IMPORT_SUBCATEGORIES.length : 0;
  const bizs = (typeof IMPORT_BUSINESSES !== 'undefined') ? IMPORT_BUSINESSES.length : 0;

  if (typeof IMPORT_BUSINESSES === 'undefined') {
    summaryEl.innerHTML = '<p class="empty-state">No se encontró import/import-data.js. Corré primero el script de migración.</p>';
    return;
  }

  summaryEl.innerHTML = `
    <p style="margin:0;"><strong>${cats}</strong> categorías, <strong>${subcats}</strong> subcategorías, <strong>${bizs}</strong> comercios listos para importar.</p>
    <p class="field-hint" style="margin-top:10px;">Se van a publicar directo (ya eran públicos en el sitio viejo) y vos vas a quedar como dueño temporal de cada ficha.</p>
  `;
  importBtn.disabled = false;
}

importBtn.addEventListener('click', async () => {
  importBtn.disabled = true;
  importBtn.textContent = 'Importando...';
  alertBox.className = 'alert';

  try {
    const { error: catError } = await supabaseClient
      .from('categories')
      .upsert(IMPORT_CATEGORIES, { onConflict: 'id' });
    if (catError) throw new Error('Categorías: ' + catError.message);

    const { error: subError } = await supabaseClient
      .from('subcategories')
      .upsert(IMPORT_SUBCATEGORIES, { onConflict: 'id' });
    if (subError) throw new Error('Subcategorías: ' + subError.message);

    const businessRows = IMPORT_BUSINESSES.map((b) => ({
      ...b,
      owner_id: adminUser.id,
      status: 'published'
    }));

    const { error: bizError, data: bizData } = await supabaseClient
      .from('businesses')
      .upsert(businessRows, { onConflict: 'legacy_id' })
      .select('id');
    if (bizError) throw new Error('Comercios: ' + bizError.message);

    showAlert(`Listo. Se importaron/actualizaron ${bizData ? bizData.length : businessRows.length} comercios.`, 'success');
    importBtn.textContent = 'Importar de nuevo';
  } catch (err) {
    showAlert('Error durante la importación: ' + err.message, 'error');
    importBtn.textContent = 'Reintentar';
  }

  importBtn.disabled = false;
});

init();
