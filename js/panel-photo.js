// ============================================================
// Panel de comercio — foto de portada de la ficha.
// Se carga después de js/panel.js (reutiliza currentUser, showAlert,
// clearAlert) y de Cropper.js (CDN).
// ============================================================

let currentPhotoBusinessId = null;
let cropperInstance = null;

const photoInput = document.getElementById('photoInput');
const choosePhotoBtn = document.getElementById('choosePhotoBtn');
const photoHint = document.getElementById('photoHint');
const photoPreviewImg = document.getElementById('photoPreviewImg');
const photoPreviewEmpty = document.getElementById('photoPreviewEmpty');

const cropperModal = document.getElementById('cropperModal');
const cropperImage = document.getElementById('cropperImage');
const cropperCancelBtn = document.getElementById('cropperCancelBtn');
const cropperConfirmBtn = document.getElementById('cropperConfirmBtn');

function refreshPhotoUploadState(businessId, currentPhotoUrl) {
  currentPhotoBusinessId = businessId;

  if (currentPhotoUrl) {
    photoPreviewImg.src = currentPhotoUrl;
    photoPreviewImg.classList.remove('photo-preview-placeholder');
    photoPreviewImg.style.display = 'block';
    photoPreviewEmpty.style.display = 'none';
  } else {
    // Sin foto propia todavía: se muestra el logo como placeholder
    // (igual que en la carga de eventos), en vez de una cover vacía.
    photoPreviewImg.src = 'images/logo-markk.png';
    photoPreviewImg.classList.add('photo-preview-placeholder');
    photoPreviewImg.style.display = 'block';
    photoPreviewEmpty.style.display = 'none';
  }

  if (businessId) {
    choosePhotoBtn.disabled = false;
    photoHint.textContent = 'Formato horizontal (4:3). Después de elegirla vas a poder ajustar el recorte.';
  } else {
    choosePhotoBtn.disabled = true;
    photoHint.textContent = 'Guardá la ficha primero; después vas a poder subirle una foto.';
  }
}

choosePhotoBtn.addEventListener('click', () => {
  if (!currentPhotoBusinessId) return;
  photoInput.value = '';
  photoInput.click();
});

photoInput.addEventListener('change', () => {
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    cropperImage.src = reader.result;
    cropperModal.classList.remove('hidden');

    if (cropperInstance) cropperInstance.destroy();
    cropperInstance = new Cropper(cropperImage, {
      aspectRatio: 4 / 3,
      viewMode: 1,
      autoCropArea: 1,
      background: false,
      responsive: true,
    });
  };
  reader.readAsDataURL(file);
});

function closeCropperModal() {
  if (cropperInstance) {
    cropperInstance.destroy();
    cropperInstance = null;
  }
  cropperModal.classList.add('hidden');
  photoInput.value = '';
}

cropperCancelBtn.addEventListener('click', closeCropperModal);

cropperConfirmBtn.addEventListener('click', () => {
  if (!cropperInstance || !currentPhotoBusinessId) return;

  cropperConfirmBtn.disabled = true;
  cropperConfirmBtn.textContent = 'Subiendo...';

  const canvas = cropperInstance.getCroppedCanvas({ width: 1200, height: 900 });
  canvas.toBlob(async (blob) => {
    if (!blob) {
      cropperConfirmBtn.disabled = false;
      cropperConfirmBtn.textContent = 'Guardar foto';
      showAlert('No se pudo procesar la imagen.', 'error');
      return;
    }

    const path = `${currentPhotoBusinessId}/cover-${Date.now()}.jpg`;

    const { error: uploadError } = await supabaseClient.storage
      .from('business-images')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) {
      cropperConfirmBtn.disabled = false;
      cropperConfirmBtn.textContent = 'Guardar foto';
      showAlert('No se pudo subir la foto: ' + uploadError.message, 'error');
      return;
    }

    const { data: pub } = supabaseClient.storage.from('business-images').getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { error: updateError } = await supabaseClient
      .from('businesses')
      .update({ images: [publicUrl] })
      .eq('id', currentPhotoBusinessId);

    cropperConfirmBtn.disabled = false;
    cropperConfirmBtn.textContent = 'Guardar foto';

    if (updateError) {
      showAlert('La foto se subió pero no se pudo guardar en la ficha: ' + updateError.message, 'error');
      return;
    }

    photoPreviewImg.src = publicUrl;
    photoPreviewImg.classList.remove('photo-preview-placeholder');
    photoPreviewImg.style.display = 'block';
    photoPreviewEmpty.style.display = 'none';
    closeCropperModal();
    showAlert('Foto actualizada.', 'success');
  }, 'image/jpeg', 0.85);
});
