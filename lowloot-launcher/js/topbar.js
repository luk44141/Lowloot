// topbar.js — menú de perfil, notificaciones y buscador con sugerencias.
// Depende de helpers.js, state.js y navigation.js (el buscador navega a Tienda).

/* ---------- Botón de inicio de sesión / chip de usuario ---------- */
// Sin sesión: se ve el botón "INICIAR SESIÓN" que abre el modal (login.js
// maneja el submit real). Con sesión: se ve el saldo + nombre de usuario,
// con un menú para cerrar sesión y (si el rol es ADMIN) ir al panel admin.

function openLoginModal(view) {
  qs('#login-modal-overlay')?.classList.add('open');
  if (typeof setLoginView === 'function') setLoginView(view || 'login');
  qs('#login-email')?.focus();
}

function closeLoginModal() {
  qs('#login-modal-overlay')?.classList.remove('open');
}

function renderTopbarSession() {
  const loginBtn = document.getElementById('login-trigger');
  const chip = document.getElementById('user-chip');
  if (!loginBtn || !chip) return;

  if (!currentUser) {
    loginBtn.hidden = false;
    chip.hidden = true;
    qs('#user-menu')?.classList.remove('open');
    return;
  }

  loginBtn.hidden = true;
  chip.hidden = false;

  qs('#user-chip-balance').textContent = formatPrice(Number(currentUser.balance) || 0);
  qs('#user-chip-name').textContent = currentUser.username;
  qs('#user-menu-name').textContent = currentUser.username;
  qs('#user-menu-email').textContent = currentUser.email;

  const adminItem = document.getElementById('user-menu-admin');
  if (adminItem) adminItem.hidden = !isAdmin();
  const adminNav = document.getElementById('admin-nav-list');
  if (adminNav) adminNav.hidden = !isAdmin();
}

function initLoginButton() {
  const trigger = document.getElementById('login-trigger');
  const overlay = document.getElementById('login-modal-overlay');
  const chip = document.getElementById('user-chip');
  const chipTrigger = document.getElementById('user-chip-trigger');
  const userMenu = document.getElementById('user-menu');

  trigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    openLoginModal('login');
  });

  document.getElementById('login-modal-close')?.addEventListener('click', closeLoginModal);

  overlay?.addEventListener('click', (event) => {
    if (event.target === overlay) closeLoginModal();
  });

  chipTrigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    userMenu?.classList.toggle('open');
  });

  document.getElementById('user-menu-logout')?.addEventListener('click', (event) => {
    event.stopPropagation();
    userMenu?.classList.remove('open');
    logout();
  });

  document.getElementById('user-menu-admin')?.addEventListener('click', (event) => {
    event.stopPropagation();
    userMenu?.classList.remove('open');
    activateView('admin');
    if (typeof renderAdminView === 'function') renderAdminView();
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.search')) hideSuggestions();
    if (!event.target.closest('#notifications-trigger')) qs('#notif-menu')?.classList.remove('open');
    if (!event.target.closest('#user-chip')) userMenu?.classList.remove('open');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLoginModal();
  });

  renderTopbarSession();
}

/* ---------- Notificaciones ---------- */

function unreadNotifCount() {
  return notifications.filter((n) => !n.read).length;
}

function renderNotifBadge() {
  const badge = document.getElementById('notif-badge');
  const count = unreadNotifCount();
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

function renderNotifList() {
  const list = document.getElementById('notif-list');
  if (!notifications.length) {
    list.innerHTML = `<p class="placeholder-text">No tenés notificaciones todavía.</p>`;
    return;
  }
  list.innerHTML = notifications
    .map(
      (n) => `
    <div class="notif-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}">
      <span class="notif-dot"></span>
      <div class="notif-item-text">
        <span class="notif-item-title">${n.title}</span>
        <span class="notif-item-time">${n.time}</span>
      </div>
    </div>
  `
    )
    .join('');
}

function initNotifications() {
  const trigger = qs('#notifications-trigger .icon-btn');
  const menu = document.getElementById('notif-menu');

  renderNotifBadge();
  renderNotifList();

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    menu.classList.toggle('open');
  });

  document.getElementById('notif-mark-read').addEventListener('click', (event) => {
    event.stopPropagation();
    notifications.forEach((n) => (n.read = true));
    renderNotifBadge();
    renderNotifList();
  });

  menu.addEventListener('click', (event) => {
    const item = event.target.closest('.notif-item');
    if (!item) return;
    event.stopPropagation();
    const notif = notifications.find((n) => n.id === item.dataset.notifId);
    if (notif) notif.read = true;
    renderNotifBadge();
    renderNotifList();
  });
}

/* ---------- Buscador con sugerencias ---------- */

function hideSuggestions() {
  const box = document.getElementById('search-suggestions');
  if (box) box.classList.remove('open');
}

function initSearch() {
  const input = document.getElementById('search-input');
  const box = document.getElementById('search-suggestions');

  input.addEventListener('input', async () => {
    const query = input.value;
    if (!query.trim()) {
      hideSuggestions();
      return;
    }
    const results = await LowlootData.searchGames(query);
    renderSuggestions(results.slice(0, 6), query, box);
  });

  input.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') return;
    const query = input.value.trim();
    if (!query) return;

    hideSuggestions();
    activateView('tienda');
    const results = await LowlootData.searchGames(query);
    renderResults(results, { title: `RESULTADOS PARA "${query}"`, query });
  });
}

function renderSuggestions(games, query, box) {
  if (!games.length) {
    box.innerHTML = `<div class="suggestion-empty">No se encontraron juegos para "${escapeHtml(query)}".</div>`;
  } else {
    box.innerHTML = games
      .map((g) => {
        const price = g.isFree ? 'GRATIS' : formatPrice(g.discount > 0 ? Math.round(g.price * (1 - g.discount / 100)) : g.price);
        return `
          <button type="button" class="suggestion-item" data-game-id="${g.id}">
            <span class="suggestion-thumb ${gameCoverClass(g)}" ${gameCoverStyle(g)} aria-hidden="true"></span>
            <span class="suggestion-text">
              <span class="suggestion-name">${g.name}</span>
              <span class="suggestion-genre">${g.genre}</span>
            </span>
            <span class="suggestion-price">${price}</span>
          </button>
        `;
      })
      .join('');
  }
  box.classList.add('open');
}
