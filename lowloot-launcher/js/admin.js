// admin.js — panel de administración: listar usuarios reales y ajustar su
// saldo. El backend ya valida el rol en /admin/**; acá solo se oculta la
// navegación para quien no es ADMIN, pero la seguridad real está en el
// servidor (ver SecurityConfig.java).

async function renderAdminView() {
  const container = qs('#admin-content');
  if (!container) return;

  if (!isAdmin()) {
    container.innerHTML = `<p class="placeholder-text">No tenés permisos para ver esta sección.</p>`;
    return;
  }

  container.innerHTML = `<p class="placeholder-text">Cargando usuarios…</p>`;

  let users;
  try {
    users = await LowlootAPI.adminGetUsers();
  } catch (err) {
    container.innerHTML = `<p class="placeholder-text">${escapeHtml(err.message || 'No se pudo cargar la lista de usuarios')}</p>`;
    return;
  }

  container.innerHTML = `
    <div class="admin-header">
      <h2 class="section-title">PANEL ADMIN</h2>
      <p class="admin-sub">${users.length} usuario${users.length === 1 ? '' : 's'} registrado${users.length === 1 ? '' : 's'}.</p>
    </div>

    <div class="admin-table">
      <div class="admin-row admin-row-head">
        <span>Usuario</span>
        <span>Email</span>
        <span>Rol</span>
        <span>Saldo</span>
        <span>Ajustar saldo</span>
      </div>
      ${users.map(renderAdminUserRow).join('')}
    </div>
  `;
}

function renderAdminUserRow(user) {
  return `
    <div class="admin-row" data-admin-user-row="${user.id}">
      <span class="admin-cell-name">${escapeHtml(user.username)}</span>
      <span class="admin-cell-email">${escapeHtml(user.email)}</span>
      <span class="admin-cell-role admin-role-${user.role.toLowerCase()}">${user.role}</span>
      <span class="admin-cell-balance" data-admin-balance="${user.id}">${formatPrice(Number(user.balance) || 0)}</span>
      <span class="admin-cell-adjust">
        <input type="number" class="admin-delta-input" id="admin-delta-${user.id}" placeholder="+/- monto" step="0.01" />
        <button type="button" class="btn-secondary admin-adjust-btn" data-admin-adjust="${user.id}">APLICAR</button>
        <button type="button" class="btn-secondary admin-library-btn" data-admin-library-toggle="${user.id}">Biblioteca</button>
      </span>
    </div>
    <div class="admin-library-panel" id="admin-library-${user.id}" hidden></div>
  `;
}

async function toggleAdminUserLibrary(userId) {
  const panel = document.getElementById(`admin-library-${userId}`);
  if (!panel) return;

  if (!panel.hidden) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;
  panel.innerHTML = `<p class="placeholder-text">Cargando biblioteca…</p>`;

  let games;
  try {
    games = await LowlootAPI.adminGetUserLibrary(userId);
  } catch (err) {
    panel.innerHTML = `<p class="placeholder-text">${escapeHtml(err.message || 'No se pudo cargar la biblioteca')}</p>`;
    return;
  }

  if (!games.length) {
    panel.innerHTML = `<p class="placeholder-text">Este usuario todavía no compró ningún juego.</p>`;
    return;
  }

  panel.innerHTML = games
    .map(
      (g) => `
    <div class="admin-library-row" data-admin-library-row="${g.gameId}">
      <span class="admin-library-name">${escapeHtml(g.name)}</span>
      <span class="admin-library-meta">${g.installed ? 'Instalado' : 'No instalado'}</span>
      <button type="button" class="btn-secondary admin-library-remove-btn" data-admin-library-remove="${userId}:${g.gameId}">Quitar de la biblioteca</button>
    </div>
  `
    )
    .join('');
}

async function adminRemoveGameFromLibrary(userId, gameId) {
  const confirmed = await showConfirmModal({
    title: 'Quitar juego',
    message: '¿Seguro que querés sacar este juego de la biblioteca de este usuario? No se le devuelve el saldo.',
    confirmLabel: 'Quitar',
  });
  if (!confirmed) return;

  try {
    await LowlootAPI.adminRemoveFromLibrary(userId, gameId);
  } catch (err) {
    showToast(err.message || 'No se pudo quitar el juego');
    return;
  }

  showToast('Juego quitado de la biblioteca');
  const panel = document.getElementById(`admin-library-${userId}`);
  if (panel) panel.hidden = true;
  await toggleAdminUserLibrary(userId);
}

async function adjustUserBalance(userId) {
  const input = document.getElementById(`admin-delta-${userId}`);
  if (!input) return;

  const delta = parseFloat(input.value);
  if (!delta || Number.isNaN(delta)) {
    showToast('Ingresá un monto distinto de cero');
    return;
  }

  try {
    const updated = await LowlootAPI.adminAdjustBalance(userId, delta, 'Ajuste manual desde el panel admin');
    const cell = document.querySelector(`[data-admin-balance="${userId}"]`);
    if (cell) cell.textContent = formatPrice(Number(updated.balance) || 0);
    input.value = '';
    showToast(`Saldo de ${updated.username} actualizado`);
  } catch (err) {
    showToast(err.message || 'No se pudo ajustar el saldo');
  }
}

function initAdminControls() {
  document.body.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-admin-adjust]');
    if (btn) adjustUserBalance(btn.dataset.adminAdjust);

    const libToggleBtn = event.target.closest('[data-admin-library-toggle]');
    if (libToggleBtn) toggleAdminUserLibrary(libToggleBtn.dataset.adminLibraryToggle);

    const libRemoveBtn = event.target.closest('[data-admin-library-remove]');
    if (libRemoveBtn) {
      const [userId, gameId] = libRemoveBtn.dataset.adminLibraryRemove.split(':');
      adminRemoveGameFromLibrary(userId, gameId);
    }
  });
}
