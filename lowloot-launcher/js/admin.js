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
        <span>Biblioteca</span>
      </div>
      ${users.map(renderAdminUserRow).join('')}
    </div>
  `;
}

// Id del usuario cuya biblioteca está desplegada en este momento (null si
// ninguna), para poder expandir/colapsar sin perder el resto del panel.
let adminExpandedUserId = null;

function renderAdminUserRow(user) {
  const expanded = String(adminExpandedUserId) === String(user.id);
  return `
    <div class="admin-row" data-admin-user-row="${user.id}">
      <span class="admin-cell-name">${escapeHtml(user.username)}</span>
      <span class="admin-cell-email">${escapeHtml(user.email)}</span>
      <span class="admin-cell-role admin-role-${user.role.toLowerCase()}">${user.role}</span>
      <span class="admin-cell-balance" data-admin-balance="${user.id}">${formatPrice(Number(user.balance) || 0)}</span>
      <span class="admin-cell-adjust">
        <input type="number" class="admin-delta-input" id="admin-delta-${user.id}" placeholder="+/- monto" step="0.01" />
        <button type="button" class="btn-secondary admin-adjust-btn" data-admin-adjust="${user.id}">APLICAR</button>
      </span>
      <span class="admin-cell-library">
        <button type="button" class="btn-secondary admin-library-toggle-btn" data-admin-toggle-library="${user.id}">${expanded ? 'Ocultar' : 'Ver biblioteca'}</button>
      </span>
    </div>
    ${expanded ? `<div class="admin-library-panel" id="admin-library-panel-${user.id}"><p class="placeholder-text">Cargando biblioteca…</p></div>` : ''}
  `;
}

async function toggleUserLibraryPanel(userId) {
  adminExpandedUserId = String(adminExpandedUserId) === String(userId) ? null : userId;
  await renderAdminView();
  if (adminExpandedUserId === null) return;

  const panel = document.getElementById(`admin-library-panel-${userId}`);
  if (!panel) return;

  try {
    const games = await LowlootAPI.adminGetUserLibrary(userId);
    panel.innerHTML = games.length
      ? games.map((g) => renderAdminLibraryRow(userId, g)).join('')
      : `<p class="placeholder-text">Este usuario todavía no tiene juegos en su biblioteca.</p>`;
  } catch (err) {
    panel.innerHTML = `<p class="placeholder-text">${escapeHtml(err.message || 'No se pudo cargar la biblioteca de este usuario')}</p>`;
  }
}

function renderAdminLibraryRow(userId, game) {
  return `
    <div class="admin-library-row" data-admin-library-game="${game.gameId}">
      <span class="admin-library-name">${escapeHtml(game.name)}</span>
      <span class="admin-library-genre">${escapeHtml(game.genre || '')}</span>
      <span class="admin-library-status">${game.installed ? 'Instalado' : 'No instalado'}</span>
      <button type="button" class="btn-secondary admin-library-remove-btn" data-admin-remove-game="${userId}:${game.gameId}">Quitar de la biblioteca</button>
    </div>
  `;
}

async function removeGameFromUserLibrary(userId, gameId) {
  const row = document.querySelector(`[data-admin-library-game="${gameId}"]`);
  const btn = row?.querySelector('[data-admin-remove-game]');
  if (btn) btn.disabled = true;

  try {
    await LowlootAPI.adminRemoveFromLibrary(userId, gameId);
    row?.remove();
    showToast('Juego quitado de la biblioteca del usuario');
    const panel = document.getElementById(`admin-library-panel-${userId}`);
    if (panel && !panel.querySelector('[data-admin-library-game]')) {
      panel.innerHTML = `<p class="placeholder-text">Este usuario todavía no tiene juegos en su biblioteca.</p>`;
    }
  } catch (err) {
    showToast(err.message || 'No se pudo quitar el juego');
    if (btn) btn.disabled = false;
  }
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
    const adjustBtn = event.target.closest('[data-admin-adjust]');
    if (adjustBtn) {
      adjustUserBalance(adjustBtn.dataset.adminAdjust);
      return;
    }

    const toggleBtn = event.target.closest('[data-admin-toggle-library]');
    if (toggleBtn) {
      toggleUserLibraryPanel(toggleBtn.dataset.adminToggleLibrary);
      return;
    }

    const removeBtn = event.target.closest('[data-admin-remove-game]');
    if (removeBtn) {
      const [userId, gameId] = removeBtn.dataset.adminRemoveGame.split(':');
      removeGameFromUserLibrary(userId, gameId);
      return;
    }
  });
}
