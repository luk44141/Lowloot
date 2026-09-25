// friends.js — pestaña Amigos completa: código propio, búsqueda por nombre
// visible o código, solicitudes (recibidas/enviadas/aceptar/rechazar/
// cancelar), lista de amigos con estado Online/Offline y el modal de
// perfil público. Todo contra el backend real (/friends/**, /notifications
// para el aviso -- ver notification/* en el servidor).
//
// Depende de api-client.js, state.js, helpers.js, session.js
// (DEFAULT_AVATAR_SRC) y topbar.js (refreshNotifications, para refrescar la
// campanita después de aceptar/rechazar).

/* ---------- Helpers de datos ---------- */

function friendAvatarSrc(entity) {
  if (entity && entity.avatarUrl) {
    const url = LowlootAPI.resolveAvatarUrl(entity.avatarUrl);
    if (url) return url;
  }
  return typeof DEFAULT_AVATAR_SRC !== 'undefined' ? DEFAULT_AVATAR_SRC : 'assets/profile/default-profile.png';
}

function lastSeenLabel(lastActiveAt) {
  if (!lastActiveAt) return 'Desconectado';
  return `Desconectado · Últ. vez ${formatRelativeTime(lastActiveAt)}`;
}

/* ---------- Badge de la barra lateral (contador persistido) ---------- */

async function refreshFriendsBadge() {
  if (!currentUser) {
    pendingFriendRequestCount = 0;
    renderFriendsNavBadge();
    return;
  }
  try {
    const res = await LowlootAPI.getPendingFriendRequestCount();
    pendingFriendRequestCount = res.count;
  } catch (err) {
    // Si falla, se deja el último valor conocido; el próximo refresh (o
    // abrir la pestaña Amigos) lo corrige.
  }
  renderFriendsNavBadge();
}

function renderFriendsNavBadge() {
  const badge = document.getElementById('friends-nav-badge');
  if (!badge) return;
  if (pendingFriendRequestCount > 0) {
    badge.textContent = pendingFriendRequestCount > 9 ? '9+' : String(pendingFriendRequestCount);
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

/* ---------- Carga de datos según la pestaña/búsqueda activa ---------- */

async function refreshActiveFriendsTabData() {
  try {
    if (friendsSearchQuery.trim()) {
      friendsSearchLoading = true;
      friendsSearchResults = await LowlootAPI.searchFriends(friendsSearchQuery.trim());
    } else if (friendsActiveTab === 'recibidas') {
      receivedFriendRequests = await LowlootAPI.getReceivedFriendRequests();
      pendingFriendRequestCount = receivedFriendRequests.length;
      renderFriendsNavBadge();
    } else if (friendsActiveTab === 'enviadas') {
      sentFriendRequests = await LowlootAPI.getSentFriendRequests();
    } else {
      friendsList = await LowlootAPI.getFriends();
    }
  } catch (err) {
    showToast(err.message || 'No se pudo cargar Amigos');
  } finally {
    friendsSearchLoading = false;
  }
}

/* ---------- Render ---------- */

async function renderFriendsView() {
  const container = qs('#friends-content');
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `
      <div class="friends-page">
        <h2 class="section-title">AMIGOS</h2>
        <p class="placeholder-text">Iniciá sesión para ver tu código de amigo, buscar usuarios y administrar tus solicitudes.</p>
        <button type="button" class="btn-primary" data-friends-login>INICIAR SESIÓN</button>
      </div>
    `;
    return;
  }

  if (!myFriendCode) {
    try {
      const res = await LowlootAPI.getMyFriendCode();
      myFriendCode = res.friendCode;
    } catch (err) {
      showToast(err.message || 'No se pudo obtener tu código de amigo');
    }
  }

  await refreshActiveFriendsTabData();
  container.innerHTML = friendsPageHtml();
}

// Refresco liviano tras una acción (aceptar, rechazar, eliminar, etc.):
// vuelve a pedir los datos de la pestaña activa y reemplaza solo el
// contenido + los contadores de las pestañas, sin tocar el buscador (para
// no perder el foco mientras el usuario está escribiendo).
async function renderFriendsTabsAndContent() {
  const tabsBox = qs('#friends-tabs');
  const contentBox = qs('#friends-tab-content');
  if (!contentBox) return;
  if (tabsBox) tabsBox.innerHTML = friendsTabsHtml();
  contentBox.innerHTML = friendsTabContentHtml();
}

function friendsPageHtml() {
  return `
    <div class="friends-page">
      <div class="friends-header">
        <h2 class="section-title">AMIGOS</h2>
        <div class="friend-code-box">
          <span class="friend-code-label">Tu código de amigo</span>
          <div class="friend-code-value-row">
            <span class="friend-code-value" id="friends-my-code">${escapeHtml(myFriendCode || '—')}</span>
            <button type="button" class="btn-secondary friends-btn-sm" data-friend-code-copy>Copiar</button>
          </div>
        </div>
      </div>

      <div class="friends-search-bar">
        <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input type="text" id="friends-search-input" placeholder="Buscar por nombre visible o código de amigo..." autocomplete="off" value="${escapeHtml(friendsSearchQuery)}" />
      </div>

      <div class="friends-tabs" id="friends-tabs">
        ${friendsTabsHtml()}
      </div>

      <div class="friends-tab-content" id="friends-tab-content">
        ${friendsTabContentHtml()}
      </div>
    </div>
  `;
}

function friendsTabsHtml() {
  const searching = Boolean(friendsSearchQuery.trim());
  const tab = (name) => `friends-tab${friendsActiveTab === name && !searching ? ' active' : ''}`;
  return `
    <button type="button" class="${tab('amigos')}" data-friends-tab="amigos">
      Amigos <span class="friends-tab-count">${friendsList.length}</span>
    </button>
    <button type="button" class="${tab('recibidas')}" data-friends-tab="recibidas">
      Recibidas ${pendingFriendRequestCount > 0 ? `<span class="friends-tab-badge">${pendingFriendRequestCount > 9 ? '9+' : pendingFriendRequestCount}</span>` : ''}
    </button>
    <button type="button" class="${tab('enviadas')}" data-friends-tab="enviadas">
      Enviadas
    </button>
  `;
}

function friendsTabContentHtml() {
  if (friendsSearchQuery.trim()) return friendsSearchResultsHtml();
  if (friendsActiveTab === 'recibidas') return friendsReceivedHtml();
  if (friendsActiveTab === 'enviadas') return friendsSentHtml();
  return friendsListHtml();
}

function friendsListHtml() {
  if (!friendsList.length) {
    return `<p class="placeholder-text">Todavía no tenés amigos agregados. Buscá a alguien arriba por su nombre visible o su código para empezar.</p>`;
  }
  return `<div class="friends-list">${friendsList.map(friendRowHtml).join('')}</div>`;
}

function friendsReceivedHtml() {
  if (!receivedFriendRequests.length) {
    return `<p class="placeholder-text">No tenés solicitudes de amistad pendientes.</p>`;
  }
  return `<div class="friends-list">${receivedFriendRequests.map(receivedRequestRowHtml).join('')}</div>`;
}

function friendsSentHtml() {
  if (!sentFriendRequests.length) {
    return `<p class="placeholder-text">No enviaste ninguna solicitud de amistad todavía.</p>`;
  }
  return `<div class="friends-list">${sentFriendRequests.map(sentRequestRowHtml).join('')}</div>`;
}

function friendsSearchResultsHtml() {
  const query = friendsSearchQuery.trim();
  if (!friendsSearchResults.length) {
    return `<p class="placeholder-text">No se encontraron usuarios para "${escapeHtml(query)}".</p>`;
  }
  return `<div class="friends-list">${friendsSearchResults.map(searchResultRowHtml).join('')}</div>`;
}

function friendRowHtml(f) {
  return `
    <div class="friend-row">
      <button type="button" class="friend-row-main" data-friend-open-profile="${f.id}">
        <span class="friend-avatar-wrap">
          <img class="friend-avatar" src="${friendAvatarSrc(f)}" alt="" />
          <span class="friend-status-dot ${f.online ? 'online' : 'offline'}"></span>
        </span>
        <span class="friend-row-info">
          <span class="friend-row-name">${escapeHtml(f.displayName)}</span>
          <span class="friend-row-sub">${f.online ? 'En línea' : lastSeenLabel(f.lastActiveAt)}</span>
        </span>
      </button>
      <button type="button" class="icon-btn friend-row-remove" data-friend-remove="${f.id}" title="Eliminar amigo" aria-label="Eliminar amigo">✕</button>
    </div>
  `;
}

function receivedRequestRowHtml(r) {
  return `
    <div class="friend-row">
      <button type="button" class="friend-row-main" data-friend-open-profile="${r.userId}">
        <span class="friend-avatar-wrap"><img class="friend-avatar" src="${friendAvatarSrc(r)}" alt="" /></span>
        <span class="friend-row-info">
          <span class="friend-row-name">${escapeHtml(r.displayName)}</span>
          <span class="friend-row-sub">${formatRelativeTime(r.createdAt)}</span>
        </span>
      </button>
      <div class="friend-row-actions">
        <button type="button" class="btn-primary friends-btn-sm" data-friend-request-accept="${r.id}">Aceptar</button>
        <button type="button" class="btn-secondary friends-btn-sm" data-friend-request-reject="${r.id}">Rechazar</button>
      </div>
    </div>
  `;
}

function sentRequestRowHtml(r) {
  return `
    <div class="friend-row">
      <button type="button" class="friend-row-main" data-friend-open-profile="${r.userId}">
        <span class="friend-avatar-wrap"><img class="friend-avatar" src="${friendAvatarSrc(r)}" alt="" /></span>
        <span class="friend-row-info">
          <span class="friend-row-name">${escapeHtml(r.displayName)}</span>
          <span class="friend-row-sub">Enviada ${formatRelativeTime(r.createdAt)}</span>
        </span>
      </button>
      <div class="friend-row-actions">
        <button type="button" class="btn-secondary friends-btn-sm" data-friend-request-cancel="${r.id}">Cancelar</button>
      </div>
    </div>
  `;
}

function searchResultRowHtml(u) {
  let actionHtml;
  if (u.status === 'FRIENDS') {
    actionHtml = `<span class="friend-row-tag">Ya son amigos</span>`;
  } else if (u.status === 'REQUEST_SENT') {
    actionHtml = `<span class="friend-row-tag">Solicitud enviada</span>`;
  } else if (u.status === 'REQUEST_RECEIVED') {
    actionHtml = `<span class="friend-row-tag">Te envió una solicitud</span>`;
  } else {
    actionHtml = `<button type="button" class="btn-primary friends-btn-sm" data-friend-send-request="${u.id}">Agregar</button>`;
  }

  return `
    <div class="friend-row">
      <button type="button" class="friend-row-main" data-friend-open-profile="${u.id}">
        <span class="friend-avatar-wrap">
          <img class="friend-avatar" src="${friendAvatarSrc(u)}" alt="" />
          <span class="friend-status-dot ${u.online ? 'online' : 'offline'}"></span>
        </span>
        <span class="friend-row-info">
          <span class="friend-row-name">${escapeHtml(u.displayName)}</span>
          <span class="friend-row-sub">Código: ${escapeHtml(u.friendCode)}</span>
        </span>
      </button>
      <div class="friend-row-actions">${actionHtml}</div>
    </div>
  `;
}

/* ---------- Modal de perfil público ---------- */

async function openFriendProfileModal(userId) {
  friendProfileModalUserId = userId;
  const overlay = qs('#friend-profile-modal-overlay');
  const content = qs('#friend-profile-modal-content');
  if (!overlay || !content) return;

  content.innerHTML = `<p class="placeholder-text">Cargando perfil...</p>`;
  overlay.classList.add('open');

  try {
    const profile = await LowlootAPI.getFriendProfile(userId);
    friendProfileModalData = profile;
    content.innerHTML = friendProfileModalHtml(profile);
  } catch (err) {
    content.innerHTML = `<p class="placeholder-text">${escapeHtml(err.message || 'No se pudo cargar este perfil')}</p>`;
  }
}

function closeFriendProfileModal() {
  qs('#friend-profile-modal-overlay')?.classList.remove('open');
  friendProfileModalUserId = null;
  friendProfileModalData = null;
}

function friendProfileModalHtml(profile) {
  const actionHtml = profile.isFriend
    ? `<button type="button" class="btn-secondary" data-friend-remove-confirm="${profile.id}">Eliminar amigo</button>`
    : `<button type="button" class="btn-primary" data-friend-send-request="${profile.id}">Enviar solicitud</button>`;

  return `
    <div class="friend-profile-card">
      <span class="friend-avatar-wrap friend-profile-avatar-wrap">
        <img class="friend-avatar friend-profile-avatar" src="${friendAvatarSrc(profile)}" alt="" />
        <span class="friend-status-dot ${profile.online ? 'online' : 'offline'}"></span>
      </span>
      <h3 class="friend-profile-name">${escapeHtml(profile.displayName)}</h3>
      <p class="friend-profile-username">@${escapeHtml(profile.username)}</p>
      <p class="friend-profile-status">${profile.online ? 'En línea' : lastSeenLabel(profile.lastActiveAt)}</p>
      <div class="friend-profile-actions">${actionHtml}</div>
    </div>
  `;
}

/* ---------- Botón "armado" de dos pasos para eliminar (el proyecto evita
   window.confirm, ver cart.js) ---------- */

function armConfirmButton(btn, armedLabel) {
  if (btn.dataset.armed === '1') return true; // ya estaba armado: se ejecuta la acción real
  btn.dataset.armed = '1';
  btn.dataset.originalLabel = btn.textContent;
  btn.textContent = armedLabel;
  btn.classList.add('confirm-armed');
  btn._armTimeout = setTimeout(() => {
    if (btn.isConnected) {
      btn.dataset.armed = '0';
      btn.textContent = btn.dataset.originalLabel;
      btn.classList.remove('confirm-armed');
    }
  }, 3000);
  return false;
}

/* ---------- Eventos ---------- */

function initFriendsControls() {
  let searchDebounce = null;

  document.body.addEventListener('input', (event) => {
    if (event.target.id !== 'friends-search-input') return;
    friendsSearchQuery = event.target.value;
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(async () => {
      await refreshActiveFriendsTabData();
      renderFriendsTabsAndContent();
    }, 300);
  });

  document.body.addEventListener('click', async (event) => {
    if (event.target.closest('[data-friends-login]')) {
      openLoginModal('login');
      return;
    }

    if (event.target.closest('[data-friend-code-copy]')) {
      if (!myFriendCode) return;
      try {
        await navigator.clipboard.writeText(myFriendCode);
        showToast('Código copiado al portapapeles');
      } catch (err) {
        showToast('No se pudo copiar el código');
      }
      return;
    }

    const tabBtn = event.target.closest('[data-friends-tab]');
    if (tabBtn) {
      friendsActiveTab = tabBtn.dataset.friendsTab;
      friendsSearchQuery = '';
      await refreshActiveFriendsTabData();
      const container = qs('#friends-content');
      if (container) container.innerHTML = friendsPageHtml();
      return;
    }

    const openProfileBtn = event.target.closest('[data-friend-open-profile]');
    if (openProfileBtn) {
      openFriendProfileModal(openProfileBtn.dataset.friendOpenProfile);
      return;
    }

    if (event.target.closest('#friend-profile-modal-close') || event.target.id === 'friend-profile-modal-overlay') {
      closeFriendProfileModal();
      return;
    }

    const sendReqBtn = event.target.closest('[data-friend-send-request]');
    if (sendReqBtn) {
      const userId = sendReqBtn.dataset.friendSendRequest;
      sendReqBtn.disabled = true;
      try {
        await LowlootAPI.sendFriendRequest(Number(userId));
        showToast('Solicitud de amistad enviada');
        closeFriendProfileModal();
        await refreshActiveFriendsTabData();
        renderFriendsTabsAndContent();
      } catch (err) {
        showToast(err.message || 'No se pudo enviar la solicitud');
        sendReqBtn.disabled = false;
      }
      return;
    }

    const acceptBtn = event.target.closest('[data-friend-request-accept]');
    if (acceptBtn) {
      const id = acceptBtn.dataset.friendRequestAccept;
      acceptBtn.disabled = true;
      try {
        await LowlootAPI.acceptFriendRequest(id);
        showToast('¡Ahora son amigos!');
        await refreshActiveFriendsTabData();
        renderFriendsTabsAndContent();
        refreshNotifications();
      } catch (err) {
        showToast(err.message || 'No se pudo aceptar la solicitud');
        acceptBtn.disabled = false;
      }
      return;
    }

    const rejectBtn = event.target.closest('[data-friend-request-reject]');
    if (rejectBtn) {
      const id = rejectBtn.dataset.friendRequestReject;
      rejectBtn.disabled = true;
      try {
        await LowlootAPI.rejectFriendRequest(id);
        showToast('Solicitud rechazada');
        await refreshActiveFriendsTabData();
        renderFriendsTabsAndContent();
        refreshNotifications();
      } catch (err) {
        showToast(err.message || 'No se pudo rechazar la solicitud');
        rejectBtn.disabled = false;
      }
      return;
    }

    const cancelBtn = event.target.closest('[data-friend-request-cancel]');
    if (cancelBtn) {
      const id = cancelBtn.dataset.friendRequestCancel;
      cancelBtn.disabled = true;
      try {
        await LowlootAPI.cancelFriendRequest(id);
        showToast('Solicitud cancelada');
        await refreshActiveFriendsTabData();
        renderFriendsTabsAndContent();
      } catch (err) {
        showToast(err.message || 'No se pudo cancelar la solicitud');
        cancelBtn.disabled = false;
      }
      return;
    }

    const removeBtn = event.target.closest('[data-friend-remove]');
    if (removeBtn) {
      if (!armConfirmButton(removeBtn, '¿Seguro?')) return;
      const id = removeBtn.dataset.friendRemove;
      try {
        await LowlootAPI.removeFriend(id);
        showToast('Amigo eliminado');
        await refreshActiveFriendsTabData();
        renderFriendsTabsAndContent();
      } catch (err) {
        showToast(err.message || 'No se pudo eliminar al amigo');
      }
      return;
    }

    const modalRemoveBtn = event.target.closest('[data-friend-remove-confirm]');
    if (modalRemoveBtn) {
      if (!armConfirmButton(modalRemoveBtn, '¿Seguro?')) return;
      const id = modalRemoveBtn.dataset.friendRemoveConfirm;
      try {
        await LowlootAPI.removeFriend(id);
        showToast('Amigo eliminado');
        closeFriendProfileModal();
        await refreshActiveFriendsTabData();
        renderFriendsTabsAndContent();
      } catch (err) {
        showToast(err.message || 'No se pudo eliminar al amigo');
      }
      return;
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeFriendProfileModal();
  });
}
