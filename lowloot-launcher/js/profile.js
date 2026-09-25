// profile.js — vista de Perfil (foto grande, nombre visible, username,
// secciones extensibles), su panel de Ajustes colapsable, y el editor de
// recorte circular de foto (estilo Discord, con <canvas>).
// Depende de helpers.js, state.js, session.js y api-client.js.

/* ---------- Secciones del perfil (arquitectura extensible) ---------- */
// Cada sección es una tarjeta en la grilla de abajo del header. Agregar
// una sección nueva a futuro (Juegos, Biblioteca, Horas jugadas, Logros,
// Actividad reciente, Favoritos, Estadísticas, Insignias, DLC, info
// adicional, etc.) es sumar un objeto más acá: el layout, el hover y la
// animación de entrada ya están preparados para eso. A propósito no hay
// ninguna sección con datos falsos: solo "Amigos", preparada pero vacía.
const PROFILE_SECTIONS = [
  {
    id: 'friends',
    title: 'AMIGOS',
    render: () => `<p class="placeholder-text">Esta sección todavía no está disponible.</p>`,
  },
];

/* ---------- Vista: Perfil ---------- */

// Si el panel de Ajustes está desplegado dentro de la vista de Perfil.
let profileAjustesOpen = false;

function renderProfileView() {
  const container = qs('#profile-content');
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `<p class="placeholder-text">Iniciá sesión para ver tu perfil.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="profile-page">
      <section class="profile-hero" style="animation-delay:0ms">
        <div class="profile-hero-avatar-wrap">
          <img class="profile-hero-avatar" id="profile-hero-avatar" src="${currentUserAvatarSrc()}" alt="" />
        </div>
        <div class="profile-hero-info">
          <h1 class="profile-hero-name">${escapeHtml(currentUser.displayName)}</h1>
          <p class="profile-hero-username">@${escapeHtml(currentUser.username)}</p>
        </div>
        <div class="profile-hero-actions">
          <button type="button" class="btn-secondary profile-ajustes-toggle${profileAjustesOpen ? ' active' : ''}" id="profile-ajustes-toggle">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            AJUSTES
          </button>
        </div>
      </section>

      <div class="profile-ajustes-collapse${profileAjustesOpen ? ' open' : ''}" id="profile-ajustes-collapse">
        <div class="profile-ajustes-collapse-inner" id="profile-ajustes-collapse-inner">
          ${renderAjustesPanel()}
        </div>
      </div>

      <div class="profile-sections-grid">
        ${PROFILE_SECTIONS.map((section, i) => `
          <section class="profile-card" style="animation-delay:${80 + i * 70}ms" data-section="${section.id}">
            <h3 class="profile-card-title">${escapeHtml(section.title)}</h3>
            ${section.render()}
          </section>
        `).join('')}
      </div>
    </div>
  `;
}

function renderAjustesPanel() {
  const hasAvatar = Boolean(currentUser.avatarUrl);
  return `
    <div class="profile-ajustes-panel" id="profile-ajustes-panel">
      <div class="install-field">
        <label>Foto de perfil</label>
        <div class="profile-ajustes-avatar-row">
          <div class="profile-ajustes-avatar-preview-wrap" id="profile-change-avatar-btn" title="Cambiar foto">
            <img class="profile-ajustes-avatar-preview" src="${currentUserAvatarSrc()}" alt="" />
            <div class="profile-ajustes-avatar-overlay">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
            </div>
          </div>
          <div class="profile-ajustes-avatar-actions">
            <button type="button" class="btn-secondary" id="profile-change-avatar-text-btn">CAMBIAR FOTO</button>
            ${hasAvatar ? `<button type="button" class="btn-secondary" id="profile-remove-avatar-btn">QUITAR FOTO</button>` : ''}
          </div>
        </div>
      </div>

      <div class="install-field">
        <label for="profile-display-name-input">Nombre visible</label>
        <input type="text" id="profile-display-name-input" value="${escapeHtml(currentUser.displayName)}" maxlength="50" />
      </div>

      <div class="install-field">
        <label>Nombre de usuario</label>
        <input type="text" value="${escapeHtml(currentUser.username)}" disabled />
      </div>

      <div class="install-modal-footer profile-ajustes-footer">
        <button type="button" class="btn-secondary" id="profile-ajustes-cancel">CANCELAR</button>
        <button type="button" class="btn-primary" id="profile-ajustes-save">GUARDAR</button>
      </div>
    </div>
  `;
}

// Abre/cierra el panel sin volver a renderizar toda la vista: solo así la
// transición de grid-template-rows (ver profile.css) llega a animarse. Un
// innerHTML nuevo de golpe la saltearía.
function toggleAjustesPanel() {
  profileAjustesOpen = !profileAjustesOpen;
  document.getElementById('profile-ajustes-collapse')?.classList.toggle('open', profileAjustesOpen);
  document.getElementById('profile-ajustes-toggle')?.classList.toggle('active', profileAjustesOpen);
}

// Vuelve a pintar solo el contenido de Ajustes (foto/nombre) sin tocar el
// resto de la página. La usa saveDisplayName() cuando NO cierra el panel
// (no debería pasar hoy, pero queda como utilidad si a futuro se decide
// no auto-cerrar Ajustes al guardar el nombre).
function refreshAjustesPanelContent() {
  const inner = document.getElementById('profile-ajustes-collapse-inner');
  if (inner) inner.innerHTML = renderAjustesPanel();
}

async function saveDisplayName() {
  const input = document.getElementById('profile-display-name-input');
  if (!input) return;

  const displayName = input.value.trim();
  if (!displayName) {
    showToast('El nombre visible no puede quedar vacío');
    return;
  }

  const saveBtn = document.getElementById('profile-ajustes-save');
  if (saveBtn) saveBtn.disabled = true;

  try {
    await LowlootAPI.updateDisplayName(displayName);
    await refreshProfile();
    profileAjustesOpen = false;
    renderProfileView();
    showToast('Nombre visible actualizado');
  } catch (err) {
    showToast(err.message || 'No se pudo actualizar el nombre visible');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function removeCustomAvatar() {
  const btn = document.getElementById('profile-remove-avatar-btn');
  if (btn) btn.disabled = true;

  try {
    await LowlootAPI.deleteAvatar();
    await refreshProfile();
    playAvatarChangeAnimation();
    showToast('Volviste a la foto de perfil por defecto');
  } catch (err) {
    showToast(err.message || 'No se pudo quitar la foto');
    if (btn) btn.disabled = false;
  }
}

// Nota: no hace falta volver a pintar el panel de Ajustes a mano acá: el
// refreshProfile() de arriba ya dispara (vía renderTopbarSession) un
// renderProfileView() completo cuando la vista de Perfil está activa, así
// que el nuevo avatar y el botón "QUITAR FOTO" quedan al día solos. Esta
// función solo se ocupa de la animación, que ese re-render no agrega.
function playAvatarChangeAnimation() {
  const heroAvatar = document.getElementById('profile-hero-avatar');
  if (!heroAvatar) return;
  heroAvatar.src = currentUserAvatarSrc();
  heroAvatar.classList.remove('pop');
  // Forzar reflow para poder re-disparar la animación si ya se había
  // disparado antes en esta misma vista.
  void heroAvatar.offsetWidth;
  heroAvatar.classList.add('pop');
}

function initProfileControls() {
  document.body.addEventListener('click', (event) => {
    if (event.target.closest('#profile-ajustes-toggle')) {
      toggleAjustesPanel();
      return;
    }

    if (event.target.closest('#profile-ajustes-cancel')) {
      const input = document.getElementById('profile-display-name-input');
      if (input && currentUser) input.value = currentUser.displayName;
      if (profileAjustesOpen) toggleAjustesPanel();
      return;
    }

    if (event.target.closest('#profile-ajustes-save')) {
      saveDisplayName();
      return;
    }

    if (event.target.closest('#profile-remove-avatar-btn')) {
      removeCustomAvatar();
      return;
    }

    if (event.target.closest('#profile-change-avatar-btn') || event.target.closest('#profile-change-avatar-text-btn')) {
      document.getElementById('avatar-file-input')?.click();
      return;
    }
  });

  document.getElementById('avatar-file-input')?.addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) openAvatarCropEditor(file);
    // Se limpia el value para que elegir el mismo archivo dos veces
    // seguidas también dispare el evento "change".
    event.target.value = '';
  });
}

/* ---------- Editor de recorte circular (canvas) ---------- */
// Igual que el selector de foto de perfil de Discord: círculo fijo, la
// imagen se arrastra y se hace zoom detrás/dentro de ese círculo, y lo que
// se ve en la previsualización es exactamente lo que se guarda.

const AVATAR_CANVAS_SIZE = 320; // debe coincidir con el <canvas> del modal
const AVATAR_OUTPUT_SIZE = 480; // resolución final guardada/servida

let avatarCrop = null; // { image, minScale, zoomFactor, offsetX, offsetY }
let avatarCropDrag = null; // { startX, startY, startOffsetX, startOffsetY } mientras se arrastra

function openAvatarCropEditor(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const minScale = Math.max(AVATAR_CANVAS_SIZE / img.naturalWidth, AVATAR_CANVAS_SIZE / img.naturalHeight);
      avatarCrop = { image: img, minScale, zoomFactor: 1, offsetX: 0, offsetY: 0 };

      const zoomSlider = document.getElementById('avatar-crop-zoom');
      if (zoomSlider) zoomSlider.value = '1';

      qs('#avatar-crop-modal-overlay')?.classList.add('open');
      drawAvatarCrop();
    };
    img.onerror = () => showToast('No se pudo leer esa imagen');
    img.src = reader.result;
  };
  reader.onerror = () => showToast('No se pudo leer ese archivo');
  reader.readAsDataURL(file);
}

function closeAvatarCropEditor() {
  qs('#avatar-crop-modal-overlay')?.classList.remove('open');
  avatarCrop = null;
  avatarCropDrag = null;
}

// Límite de desplazamiento para que la imagen (a la escala actual) siga
// cubriendo todo el círculo, sin dejar bordes vacíos.
function clampAvatarOffsets() {
  if (!avatarCrop) return;
  const { image, minScale, zoomFactor } = avatarCrop;
  const scale = minScale * zoomFactor;
  const drawnWidth = image.naturalWidth * scale;
  const drawnHeight = image.naturalHeight * scale;

  const maxOffsetX = Math.max(0, (drawnWidth - AVATAR_CANVAS_SIZE) / 2);
  const maxOffsetY = Math.max(0, (drawnHeight - AVATAR_CANVAS_SIZE) / 2);

  avatarCrop.offsetX = Math.min(maxOffsetX, Math.max(-maxOffsetX, avatarCrop.offsetX));
  avatarCrop.offsetY = Math.min(maxOffsetY, Math.max(-maxOffsetY, avatarCrop.offsetY));
}

function drawAvatarCrop() {
  const canvas = document.getElementById('avatar-crop-canvas');
  if (!canvas || !avatarCrop) return;
  const ctx = canvas.getContext('2d');
  const { image, minScale, zoomFactor, offsetX, offsetY } = avatarCrop;
  const scale = minScale * zoomFactor;
  const drawnWidth = image.naturalWidth * scale;
  const drawnHeight = image.naturalHeight * scale;

  ctx.clearRect(0, 0, AVATAR_CANVAS_SIZE, AVATAR_CANVAS_SIZE);
  ctx.drawImage(
    image,
    AVATAR_CANVAS_SIZE / 2 - drawnWidth / 2 + offsetX,
    AVATAR_CANVAS_SIZE / 2 - drawnHeight / 2 + offsetY,
    drawnWidth,
    drawnHeight
  );
}

// Genera el PNG final recortado a AVATAR_OUTPUT_SIZE x AVATAR_OUTPUT_SIZE,
// con el mismo encuadre que se ve en la previsualización circular.
function renderAvatarCropOutput() {
  const { image, minScale, zoomFactor, offsetX, offsetY } = avatarCrop;
  const outputScale = AVATAR_OUTPUT_SIZE / AVATAR_CANVAS_SIZE;
  const scale = minScale * zoomFactor * outputScale;
  const drawnWidth = image.naturalWidth * scale;
  const drawnHeight = image.naturalHeight * scale;

  const output = document.createElement('canvas');
  output.width = AVATAR_OUTPUT_SIZE;
  output.height = AVATAR_OUTPUT_SIZE;
  const ctx = output.getContext('2d');

  ctx.save();
  ctx.beginPath();
  ctx.arc(AVATAR_OUTPUT_SIZE / 2, AVATAR_OUTPUT_SIZE / 2, AVATAR_OUTPUT_SIZE / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    image,
    AVATAR_OUTPUT_SIZE / 2 - drawnWidth / 2 + offsetX * outputScale,
    AVATAR_OUTPUT_SIZE / 2 - drawnHeight / 2 + offsetY * outputScale,
    drawnWidth,
    drawnHeight
  );
  ctx.restore();

  return output.toDataURL('image/png');
}

async function saveAvatarCrop() {
  if (!avatarCrop) return;
  const saveBtn = document.getElementById('avatar-crop-save');
  if (saveBtn) saveBtn.disabled = true;

  try {
    const dataUrl = renderAvatarCropOutput();
    await LowlootAPI.updateAvatar(dataUrl);
    await refreshProfile();
    closeAvatarCropEditor();
    if (qs('.view[data-view="perfil"]')?.classList.contains('active')) {
      playAvatarChangeAnimation();
    }
    showToast('Foto de perfil actualizada');
  } catch (err) {
    showToast(err.message || 'No se pudo guardar la foto de perfil');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

function initAvatarCropEditor() {
  const overlay = document.getElementById('avatar-crop-modal-overlay');
  const canvas = document.getElementById('avatar-crop-canvas');
  const zoomSlider = document.getElementById('avatar-crop-zoom');
  if (!overlay || !canvas) return;

  document.getElementById('avatar-crop-modal-close')?.addEventListener('click', closeAvatarCropEditor);
  document.getElementById('avatar-crop-cancel')?.addEventListener('click', closeAvatarCropEditor);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeAvatarCropEditor();
  });
  document.getElementById('avatar-crop-save')?.addEventListener('click', saveAvatarCrop);

  zoomSlider?.addEventListener('input', () => {
    if (!avatarCrop) return;
    avatarCrop.zoomFactor = parseFloat(zoomSlider.value) || 1;
    clampAvatarOffsets();
    drawAvatarCrop();
  });

  // Arrastrar la imagen dentro del círculo con el mouse.
  canvas.addEventListener('pointerdown', (event) => {
    if (!avatarCrop) return;
    avatarCropDrag = {
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: avatarCrop.offsetX,
      startOffsetY: avatarCrop.offsetY,
    };
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!avatarCrop || !avatarCropDrag) return;
    avatarCrop.offsetX = avatarCropDrag.startOffsetX + (event.clientX - avatarCropDrag.startX);
    avatarCrop.offsetY = avatarCropDrag.startOffsetY + (event.clientY - avatarCropDrag.startY);
    clampAvatarOffsets();
    drawAvatarCrop();
  });

  const endDrag = () => {
    avatarCropDrag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointerleave', endDrag);

  // Zoom con la rueda del mouse, además del slider.
  canvas.addEventListener(
    'wheel',
    (event) => {
      if (!avatarCrop || !zoomSlider) return;
      event.preventDefault();
      const step = event.deltaY < 0 ? 0.05 : -0.05;
      const min = parseFloat(zoomSlider.min);
      const max = parseFloat(zoomSlider.max);
      const next = Math.min(max, Math.max(min, avatarCrop.zoomFactor + step));
      avatarCrop.zoomFactor = next;
      zoomSlider.value = String(next);
      clampAvatarOffsets();
      drawAvatarCrop();
    },
    { passive: false }
  );

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.classList.contains('open')) closeAvatarCropEditor();
  });
}

function initProfileView() {
  initProfileControls();
  initAvatarCropEditor();
}
