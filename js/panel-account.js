// ============================================================
// Panel de comercio — sección "Mi cuenta".
// Se carga después de js/panel.js y reutiliza sus globals:
// currentUser, showAlert(), clearAlert().
// ============================================================

let accountLoaded = false;

const accountForm = document.getElementById('accountForm');
const accEmail = document.getElementById('acc_email');
const accFullName = document.getElementById('acc_full_name');
const accPhone = document.getElementById('acc_phone');
const saveAccountBtn = document.getElementById('saveAccountBtn');

const passwordForm = document.getElementById('passwordForm');
const accNewPassword = document.getElementById('acc_new_password');
const accConfirmPassword = document.getElementById('acc_confirm_password');
const savePasswordBtn = document.getElementById('savePasswordBtn');

async function initAccountSection() {
  if (accountLoaded || !currentUser) return;
  accountLoaded = true;

  accEmail.value = currentUser.email || '';

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .select('full_name, phone')
    .eq('id', currentUser.id)
    .single();

  if (!error && profile) {
    accFullName.value = profile.full_name || '';
    accPhone.value = profile.phone || '';
  }
}

accountForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();
  saveAccountBtn.disabled = true;
  saveAccountBtn.textContent = 'Guardando...';

  const { error } = await supabaseClient
    .from('profiles')
    .update({
      full_name: accFullName.value.trim() || null,
      phone: accPhone.value.trim() || null,
    })
    .eq('id', currentUser.id);

  saveAccountBtn.disabled = false;
  saveAccountBtn.textContent = 'Guardar datos';

  if (error) {
    showAlert('No se pudieron guardar tus datos: ' + error.message, 'error');
    return;
  }
  showAlert('Tus datos se guardaron correctamente.', 'success');
});

passwordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAlert();

  const newPass = accNewPassword.value;
  const confirmPass = accConfirmPassword.value;

  if (newPass.length < 6) {
    showAlert('La contraseña tiene que tener al menos 6 caracteres.', 'error');
    return;
  }
  if (newPass !== confirmPass) {
    showAlert('Las dos contraseñas no coinciden.', 'error');
    return;
  }

  savePasswordBtn.disabled = true;
  savePasswordBtn.textContent = 'Actualizando...';

  const { error } = await supabaseClient.auth.updateUser({ password: newPass });

  savePasswordBtn.disabled = false;
  savePasswordBtn.textContent = 'Actualizar contraseña';

  if (error) {
    showAlert('No se pudo actualizar la contraseña: ' + error.message, 'error');
    return;
  }

  passwordForm.reset();
  showAlert('Contraseña actualizada correctamente.', 'success');
});
