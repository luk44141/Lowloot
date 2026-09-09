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
      let message = friendlyStatusMessage(res.status);
      try {
        const data = await res.json();
        // Solo usamos el mensaje del backend si es texto pensado para
        // mostrarse (no una traza ni un mapa de errores de validación).
        if (data && typeof data.message === 'string' && data.message.length < 200) {
          message = data.message;
        }
      } catch (_) {
        // El body no era JSON (o estaba vacío); nos quedamos con el mensaje amigable genérico.
      }
      const err = new Error(message);
      err.code = 'HTTP_' + res.status;
      err.status = res.status;
      throw err;
    }

    if (res.status === 204) return null;
    return res.json();
  }

  // Mensajes genéricos por código de estado para cuando el backend no manda
  // un "message" propio (por ejemplo, la página de error por defecto de
  // Spring en un 500, o un 404 de un endpoint que no existe todavía). Antes
  // esto se mostraba tal cual ("POST /auth/register devolvió 404"), nada
  // amigable para alguien que no lee HTTP.
  function friendlyStatusMessage(status) {
    if (status === 400) return 'Los datos ingresados no son válidos';
    if (status === 403) return 'No tenés permiso para hacer esto';
    if (status === 404) return 'No se pudo encontrar lo que buscabas';
    if (status === 409) return 'Ese dato ya está en uso';
    if (status === 422) return 'Revisá los datos ingresados';
    if (status === 429) return 'Demasiados intentos, esperá un momento y volvé a intentar';
    if (status >= 500) return 'Hubo un problema en el servidor, intentá de nuevo en un rato';
    return 'Ocurrió un error inesperado';
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
    // biblioteca
    getLibrary,
    installGame,
    uninstallGame,
    // wishlist
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    // compra
    purchase,
    // admin
    adminGetUsers,
    adminAdjustBalance,
    adminGetUserLibrary,
    adminRemoveFromLibrary,
  };
})();
