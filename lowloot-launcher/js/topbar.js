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
  qs('#user-chip-name').textContent = currentUser.displayName;
  qs('#user-menu-name').textContent = currentUser.displayName;
  qs('#user-menu-email').textContent = currentUser.email;

  const chipAvatar = document.getElementById('user-chip-avatar');
  if (chipAvatar) chipAvatar.src = currentUserAvatarSrc();

  const menuAvatar = document.getElementById('user-menu-avatar');
  if (menuAvatar) menuAvatar.src = currentUserAvatarSrc();

  // Si la vista de Perfil está abierta en este momento (por ejemplo,
  // después de guardar cambios en Ajustes), se refresca con los datos
  // nuevos sin que el usuario tenga que volver a entrar.
  if (qs('.view[data-view="perfil"]')?.classList.contains('active') && typeof renderProfileView === 'function') {
    renderProfileView();
  }

  // Panel admin: ícono propio en la topbar (al lado de notificaciones),
  // visible solo para ADMIN. Ya no vive en la barra lateral ni en el
  // perfil (menú de usuario): ahí solo queda "Cerrar sesión".
  const adminTrigger = document.getElementById('admin-panel-trigger');
  if (adminTrigger) adminTrigger.hidden = !isAdmin();
}

function initLoginButton() {
  const trigger = document.getElementById('login-trigger');
  const overlay = document.getElementById('login-modal-overlay');
  const chip = document.getElementById('user-chip');
  const balanceBtn = document.getElementById('user-balance-btn');
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

  // El saldo es un elemento independiente del botón de usuario: no abre el
  // menú de perfil, solo informa el saldo actual (siempre el que vino de
  // PostgreSQL, nunca un valor guardado en el cliente).
  balanceBtn?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (currentUser) showToast(`Tu saldo actual es ${formatPrice(Number(currentUser.balance) || 0)}`);
  });

  chipTrigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    userMenu?.classList.toggle('open');
  });

  document.getElementById('user-menu-profile')?.addEventListener('click', (event) => {
    event.stopPropagation();
    userMenu?.classList.remove('open');
    activateView('perfil');
    if (typeof renderProfileView === 'function') renderProfileView();
  });

  document.getElementById('user-menu-logout')?.addEventListener('click', (event) => {
    event.stopPropagation();
    userMenu?.classList.remove('open');
    logout();
  });

  document.getElementById('admin-panel-trigger')?.addEventListener('click', (event) => {
    event.stopPropagation();
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
// Backend real (/notifications, ver notification/* en el servidor): esto
// reemplaza el array vacío fijo que había antes. friends.js reutiliza este
// mismo sistema para avisar solicitudes de amistad (no crea el suyo).

async function refreshNotifications() {
  if (!currentUser) {
    renderNotifBadge();
    renderNotifList();
    return;
  }
  try {
    notifications = await LowlootAPI.getNotifications();
  } catch (err) {
    console.error('No se pudieron cargar las notificaciones', err);
  }
  renderNotifBadge();
  renderNotifList();
}

function unreadNotifCount() {
  return notifications.filter((n) => !n.read).length;
}

function renderNotifBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
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
  if (!list) return;
  if (!notifications.length) {
    list.innerHTML = `<p class="placeholder-text">No tenés notificaciones todavía.</p>`;
    return;
  }
  list.innerHTML = notifications
    .map(
      (n) => `
    <button type="button" class="notif-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}" data-notif-type="${n.type}">
      <span class="notif-dot"></span>
      <div class="notif-item-text">
        <span class="notif-item-title">${escapeHtml(n.title)}</span>
        <span class="notif-item-time">${formatRelativeTime(n.createdAt)}</span>
      </div>
    </button>
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
    const willOpen = !menu.classList.contains('open');
    menu.classList.toggle('open');
    if (willOpen) refreshNotifications();
  });

  document.getElementById('notif-mark-read').addEventListener('click', async (event) => {
    event.stopPropagation();
    try {
      await LowlootAPI.markAllNotificationsRead();
      notifications.forEach((n) => (n.read = true));
      renderNotifBadge();
      renderNotifList();
    } catch (err) {
      showToast(err.message || 'No se pudieron marcar como leídas');
    }
  });

  menu.addEventListener('click', async (event) => {
    const item = event.target.closest('.notif-item');
    if (!item) return;
    event.stopPropagation();

    const notifId = item.dataset.notifId;
    const notif = notifications.find((n) => String(n.id) === String(notifId));
    if (notif && !notif.read) {
      notif.read = true;
      renderNotifBadge();
      renderNotifList();
      LowlootAPI.markNotificationRead(notifId).catch(() => {
        // Si falla, se corrige solo en el próximo refresh; no bloqueamos la UI por esto.
      });
    }

    // Las notificaciones de Amigos llevan directo a la pestaña correspondiente.
    const type = item.dataset.notifType;
    if ((type === 'FRIEND_REQUEST' || type === 'FRIEND_ACCEPTED') && typeof renderFriendsView === 'function') {
      menu.classList.remove('open');
      friendsActiveTab = type === 'FRIEND_REQUEST' ? 'recibidas' : 'amigos';
      activateView('amigos');
      renderFriendsView();
    }
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
