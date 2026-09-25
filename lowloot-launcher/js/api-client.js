// api-client.js
//
// Único lugar del frontend que sabe cómo pedirle datos a la API real
// (lowloot-server + PostgreSQL). No hay lógica de negocio acá, solo el
// fetch, el token de sesión y el manejo de errores de red/HTTP.

const LowlootAPI = (() => {
  const BASE_URL = 'http://localhost:8080';

  const TOKEN_KEY = 'lowloot:token';
  const REMEMBER_KEY = 'lowloot:remember';

  /* ---------- Sesión / token ---------- */

  // "Recordarme" (activado por defecto): el token va a localStorage y
  // sobrevive a cerrar el launcher. Si el usuario lo desactiva, el token
  // vive solo en sessionStorage (se pierde al cerrar la ventana).
  function saveToken(token, remember) {
    clearToken();
    if (remember) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REMEMBER_KEY, '1');
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REMEMBER_KEY, '0');
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  }

  function getRememberPreference() {
    // Por defecto activado, tal como se pidió, hasta que el usuario elija
    // explícitamente lo contrario alguna vez.
    const stored = localStorage.getItem(REMEMBER_KEY);
    return stored === null ? true : stored === '1';
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  /* ---------- fetch helper con manejo de errores uniforme ---------- */

  async function request(path, { method = 'GET', body, auth = false } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    if (auth) {
      const token = getToken();
      if (!token) {
        const err = new Error('No hay sesión iniciada');
        err.code = 'NO_SESSION';
        throw err;
      }
      headers['Authorization'] = `Bearer ${token}`;
    }

    let res;
    try {
      res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      const err = new Error('No se pudo conectar con el servidor de Lowloot');
      err.code = 'NETWORK';
      throw err;
    }

    if (res.status === 401) {
      // El token venció o es inválido: se cierra la sesión local para que
      // la UI vuelva a pedir login en vez de quedar en un estado raro.
      clearToken();
      const err = new Error('Tu sesión expiró, iniciá sesión de nuevo');
      err.code = 'UNAUTHORIZED';
      throw err;
    }

    if (!res.ok) {
      let message = friendlyStatusMessage(res.status, method, path);
      try {
        const data = await res.json();
        if (data && data.message) message = data.message;
      } catch (_) {
        // El body no era JSON (o estaba vacío); nos quedamos con el mensaje amigable genérico.
      }
      const err = new Error(message);
      err.code = 'HTTP_' + res.status;
      err.status = res.status;
      throw err;
    }

    // Éxito: puede venir sin body (204 No Content, o un 200/201 con .build()
    // como el alta de wishlist). Antes esto tiraba "Unexpected end of JSON
    // input" y la UI mostraba error aunque la escritura en PostgreSQL ya
    // había funcionado. Leemos como texto primero y solo parseamos si hay
    // algo para parsear.
    if (res.status === 204) return null;
    const text = await res.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  }

  // Mensaje genérico y entendible cuando el backend no devuelve uno propio
  // (por ejemplo, errores de validación de Spring que no traen "message").
  // Nunca se muestra JSON crudo ni texto técnico al usuario.
  function friendlyStatusMessage(status, method, path) {
    if (status === 400) return 'Los datos enviados no son válidos';
    if (status === 401) return 'Tenés que iniciar sesión para continuar';
    if (status === 403) return 'No tenés permisos para hacer esto';
    if (status === 404) return 'No encontramos lo que buscabas';
    if (status === 409) return 'Ese cambio entra en conflicto con algo que ya existe';
    if (status === 402) return 'Saldo insuficiente';
    if (status >= 500) return 'Hubo un problema en el servidor, intentá de nuevo en un momento';
    return 'No se pudo completar la operación';
  }

  /* ---------- Catálogo (público) ---------- */

  function getGames() {
    return request('/games');
  }

  /* ---------- Autenticación ---------- */

  function register(username, email, password) {
    return request('/auth/register', { method: 'POST', body: { username, email, password } });
  }

  function login(email, password) {
    return request('/auth/login', { method: 'POST', body: { email, password } });
  }

  function changePassword(email, newPassword) {
    return request('/auth/change-password', { method: 'POST', body: { email, newPassword } });
  }

  function getMe() {
    return request('/users/me', { auth: true });
  }

  /* ---------- Perfil ---------- */

  // Solo el nombre visible: el username (identificador de cuenta) no se
  // puede tocar desde acá, ni el backend acepta ese campo en este endpoint.
  function updateDisplayName(displayName) {
    return request('/users/me', { method: 'PATCH', auth: true, body: { displayName } });
  }

  // imageBase64 ya viene recortada/ajustada por el editor circular
  // (canvas.toDataURL('image/png')), lista para guardarse tal cual.
  function updateAvatar(imageBase64) {
    return request('/users/me/avatar', { method: 'PUT', auth: true, body: { imageBase64 } });
  }

  function deleteAvatar() {
    return request('/users/me/avatar', { method: 'DELETE', auth: true });
  }

  // Arma la URL absoluta de la foto de un usuario. avatarUrl viene relativo
  // desde el backend (ej. "/users/7/avatar") o null si no tiene foto
  // personalizada, en cuyo caso el llamador debe usar la imagen default
  // local en vez de pedir esto.
  function resolveAvatarUrl(avatarUrl) {
    if (!avatarUrl) return null;
    return `${BASE_URL}${avatarUrl}`;
  }

  /* ---------- Biblioteca ---------- */

  function getLibrary() {
    return request('/library/me', { auth: true });
  }

  function installGame(gameId) {
    return request(`/library/${gameId}/install`, { method: 'PATCH', auth: true });
  }

  function uninstallGame(gameId) {
    return request(`/library/${gameId}/uninstall`, { method: 'PATCH', auth: true });
  }

  function setLibraryFavorite(gameId, favorite) {
    return request(`/library/${gameId}/favorite`, { method: 'PATCH', auth: true, body: { favorite } });
  }

  /* ---------- Wishlist ---------- */

  function getWishlist() {
    return request('/wishlist/me', { auth: true });
  }

  function addToWishlist(gameId) {
    return request(`/wishlist/${gameId}`, { method: 'POST', auth: true });
  }

  function removeFromWishlist(gameId) {
    return request(`/wishlist/${gameId}`, { method: 'DELETE', auth: true });
  }

  /* ---------- Compra ---------- */

  function purchase(gameIds) {
    return request('/purchases', { method: 'POST', auth: true, body: { gameIds } });
  }

  /* ---------- Amigos ---------- */

  function getMyFriendCode() {
    return request('/friends/me/code', { auth: true });
  }

  function searchFriends(query) {
    return request(`/friends/search?q=${encodeURIComponent(query)}`, { auth: true });
  }

  function sendFriendRequest(userId) {
    return request('/friends/requests', { method: 'POST', auth: true, body: { userId } });
  }

  function getReceivedFriendRequests() {
    return request('/friends/requests/received', { auth: true });
  }

  function getSentFriendRequests() {
    return request('/friends/requests/sent', { auth: true });
  }

  function getPendingFriendRequestCount() {
    return request('/friends/requests/pending-count', { auth: true });
  }

  function acceptFriendRequest(requestId) {
    return request(`/friends/requests/${requestId}/accept`, { method: 'POST', auth: true });
  }

  function rejectFriendRequest(requestId) {
    return request(`/friends/requests/${requestId}/reject`, { method: 'POST', auth: true });
  }

  function cancelFriendRequest(requestId) {
    return request(`/friends/requests/${requestId}`, { method: 'DELETE', auth: true });
  }

  function getFriends() {
    return request('/friends', { auth: true });
  }

  function getFriendProfile(userId) {
    return request(`/friends/${userId}`, { auth: true });
  }

  function removeFriend(userId) {
    return request(`/friends/${userId}`, { method: 'DELETE', auth: true });
  }

  /* ---------- Notificaciones ---------- */

  function getNotifications() {
    return request('/notifications', { auth: true });
  }

  function getUnreadNotifCount() {
    return request('/notifications/unread-count', { auth: true });
  }

  function markNotificationRead(notifId) {
    return request(`/notifications/${notifId}/read`, { method: 'POST', auth: true });
  }

  function markAllNotificationsRead() {
    return request('/notifications/read-all', { method: 'POST', auth: true });
  }

  /* ---------- Admin ---------- */

  function adminGetUsers() {
    return request('/admin/users', { auth: true });
  }

  function adminAdjustBalance(userId, delta, reason) {
    return request(`/admin/users/${userId}/balance`, {
      method: 'PATCH',
      auth: true,
      body: { delta, reason },
    });
  }

  function adminGetUserLibrary(userId) {
    return request(`/admin/users/${userId}/library`, { auth: true });
  }

  function adminRemoveFromLibrary(userId, gameId) {
    return request(`/admin/users/${userId}/library/${gameId}`, { method: 'DELETE', auth: true });
  }

  return {
    // sesión
    saveToken,
    getToken,
    getRememberPreference,
    clearToken,
    isLoggedIn,
    // catálogo
    getGames,
    // auth
    register,
    login,
    changePassword,
    getMe,
    // perfil
    updateDisplayName,
    updateAvatar,
    deleteAvatar,
    resolveAvatarUrl,
    // biblioteca
    getLibrary,
    installGame,
    uninstallGame,
    setLibraryFavorite,
    // wishlist
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    // compra
    purchase,
    // amigos
    getMyFriendCode,
    searchFriends,
    sendFriendRequest,
    getReceivedFriendRequests,
    getSentFriendRequests,
    getPendingFriendRequestCount,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    getFriends,
    getFriendProfile,
    removeFriend,
    // notificaciones
    getNotifications,
    getUnreadNotifCount,
    markNotificationRead,
    markAllNotificationsRead,
    // admin
    adminGetUsers,
    adminAdjustBalance,
    adminGetUserLibrary,
    adminRemoveFromLibrary,
  };
})();
