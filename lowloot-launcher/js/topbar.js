// topbar.js — menú de perfil, notificaciones y buscador con sugerencias.
// Depende de helpers.js, state.js y navigation.js (el buscador navega a Tienda).

/* ---------- Menú de perfil ---------- */

function initProfileMenu() {
  const trigger = document.getElementById('profile-trigger');
  const menu = document.getElementById('profile-menu');

  trigger.addEventListener('click', (event) => {
    event.stopPropagation();
    qs('#notif-menu')?.classList.remove('open');
    menu.classList.toggle('open');
  });

  menu.querySelectorAll('.profile-menu-item').forEach((item) => {
    item.addEventListener('click', (event) => {
      event.stopPropagation();
      showToast(item.dataset.toast || 'Próximamente');
      menu.classList.remove('open');
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('#profile-trigger')) menu.classList.remove('open');
    if (!event.target.closest('.search')) hideSuggestions();
    if (!event.target.closest('#notifications-trigger')) qs('#notif-menu')?.classList.remove('open');
  });
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
    qs('#profile-menu')?.classList.remove('open');
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
