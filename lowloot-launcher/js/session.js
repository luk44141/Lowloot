// session.js — sesión de usuario real contra lowloot-server (JWT).
// Depende de api-client.js, state.js (currentUser, wishlist) y se apoya en
// funciones de topbar.js / library.js / library-data.js para refrescar la UI.
//
// `currentUser` vive en state.js: null si no hay sesión, o
// { id, username, email, role, balance } si la hay. El saldo mostrado
// siempre sale de PostgreSQL (vía /users/me o la respuesta de login), no
// se guarda ni se inventa en el cliente.

function setCurrentUser(me) {
  currentUser = {
    // AuthResponse (login/register) manda el campo como "userId";
    // MeResponse (/users/me) lo manda como "id". Sin este fallback,
    // currentUser.id quedaba undefined justo después de loguearte/crear
    // la cuenta (solo se corregía recién al refrescar con /users/me).
    id: me.id ?? me.userId,
    username: me.username,
    email: me.email,
    role: me.role,
    balance: me.balance,
  };
}

function isAdmin() {
  return Boolean(currentUser && currentUser.role === 'ADMIN');
}

// Refresca solo el número de saldo desde el servidor (por ejemplo después
// de una compra), sin tocar el resto de la sesión.
async function refreshBalance() {
  if (!currentUser) return;
  try {
    const me = await LowlootAPI.getMe();
    currentUser.balance = me.balance;
    if (typeof renderTopbarSession === 'function') renderTopbarSession();
  } catch (err) {
    // Si falla (por ejemplo token vencido), initSession ya se encarga de
    // limpiar la sesión la próxima vez que haga falta un endpoint protegido.
  }
}

async function refreshWishlistCache() {
  wishlist.clear();
  if (!currentUser) return;
  try {
    const items = await LowlootAPI.getWishlist();
    items.forEach((item) => wishlist.set(String(item.gameId), item.addedAt));
  } catch (err) {
    // Sin conexión / error: la wishlist queda vacía en memoria; el usuario
    // puede reintentar navegando de nuevo a la sección.
  }
}

// Arranque: si hay un token guardado (por "Recordarme"), intenta validar la
// sesión contra el servidor antes de mostrar nada como logueado.
async function initSession() {
  if (!LowlootAPI.isLoggedIn()) {
    currentUser = null;
    updateSessionUI();
    return;
  }

  try {
    const me = await LowlootAPI.getMe();
    setCurrentUser(me);
    await refreshWishlistCache();
    if (typeof invalidateLibraryCache === 'function') invalidateLibraryCache();
  } catch (err) {
    LowlootAPI.clearToken();
    currentUser = null;
  }

  updateSessionUI();
}

// Se llama después de un login/registro exitoso.
async function onAuthSuccess(authResponse, remember) {
  LowlootAPI.saveToken(authResponse.token, remember);
  setCurrentUser(authResponse);
  await refreshWishlistCache();
  if (typeof invalidateLibraryCache === 'function') invalidateLibraryCache();
  updateSessionUI();
}

function logout() {
  LowlootAPI.clearToken();
  currentUser = null;
  wishlist.clear();
  if (typeof invalidateLibraryCache === 'function') invalidateLibraryCache();
  updateSessionUI();
  activateView('inicio');
  showToast('Sesión cerrada');
}

// Gate reutilizable para acciones que necesitan sesión (comprar, agregar a
// wishlist, instalar). Si no hay sesión, abre el modal de login y avisa.
function requireLogin(message) {
  if (currentUser) return true;
  showToast(message || 'Iniciá sesión para continuar');
  openLoginModal();
  return false;
}

function updateSessionUI() {
  if (typeof renderTopbarSession === 'function') renderTopbarSession();
  if (typeof renderCartBadge === 'function') renderCartBadge();

  // Si la Biblioteca o la Wishlist están abiertas justo cuando cambia la
  // sesión (login/logout), se refrescan en el momento.
  if (qs('.view[data-view="biblioteca"]')?.classList.contains('active') && typeof renderLibraryHome === 'function') {
    renderLibraryHome();
  }
  if (qs('.view[data-view="wishlist"]')?.classList.contains('active') && typeof renderWishlistView === 'function') {
    renderWishlistView();
  }
}
