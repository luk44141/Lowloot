// state.js — estado compartido en memoria de toda la app (navegación, wishlist, carrito,
// noticias, notificaciones, filtros de resultados). Ningún dato viene de un backend todavía.

let lastMainView = 'inicio';

// Sesión real contra el backend: null si no hay usuario logueado, o
// { id, username, email, role, balance } si lo hay. La maneja session.js.
let currentUser = null;

// Wishlist: Map<gameId, fechaAgregadoISO>. Se llena desde el backend real
// (ver session.js: refreshWishlistCache) en vez de vivir solo en memoria.
const wishlist = new Map();

// Carrito: Map<gameId, cantidad>
const cart = new Map();

// Noticias del carrusel de Inicio
let newsList = [];
let newsIndex = 0;

// Notificaciones: ahora sí hay backend real (/notifications, ver
// notification/* en el servidor — no existía nada antes de Amigos, era
// un array vacío fijo). session.js las carga al iniciar sesión y
// app.js las refresca periódicamente junto con el contador de Amigos;
// topbar.js solo lee de acá para pintar la campanita.
let notifications = [];

/* ---------- Amigos ---------- */
// Todo esto viene de /friends/** (lowloot-server + PostgreSQL). Se carga
// la primera vez que se abre la pestaña Amigos y se refresca después de
// cada acción (enviar, aceptar, rechazar, eliminar) para que el contador
// y las listas nunca queden desactualizados frente a lo persistido.
let myFriendCode = '';
let friendsList = [];
let receivedFriendRequests = [];
let sentFriendRequests = [];
let pendingFriendRequestCount = 0;
let friendsActiveTab = 'amigos'; // 'amigos' | 'recibidas' | 'enviadas' | 'buscar'
let friendsSearchQuery = '';
let friendsSearchResults = [];
let friendsSearchLoading = false;

// Perfil público de un amigo (o resultado de búsqueda) abierto en el
// modal; null si no hay ninguno abierto. Ver friends.js.
let friendProfileModalUserId = null;
let friendProfileModalData = null;

let currentDetailReviews = [];
let currentResultsBaseList = [];
let currentOpenFilters = false;
let currentResultsTitle = '';
let currentResultsQuery = '';
let currentFilters = defaultFilters();

function defaultFilters() {
  return {
    genres: new Set(),
    languages: new Set(),
    priceBucket: 'todos',
    minRating: 0,
    releaseWindow: 'todos',
    sort: 'relevancia',
  };
}

/* ---------- Biblioteca ---------- */

let libraryViewMode = 'lista'; // 'lista' | 'cuadricula'
let librarySort = 'nombre'; // 'nombre' | 'ultimo-jugado' | 'horas' | 'agregado' | 'actualizacion'
let libraryFilter = 'todos'; // 'todos' | 'instalados' | 'no-instalados' | 'favoritos' | 'actualizaciones'
let libraryQuery = '';
let libraryFolder = null; // nombre de carpeta activa, o null si se ve la Biblioteca completa

// Juego cuya ficha de Biblioteca está abierta / juego para el que está
// abierto el modal de instalación (null si no hay nada abierto).
let currentLibraryGameId = null;
let installModalGameId = null;

// Comunidad de Biblioteca (simulado en memoria, sin backend):
// likes propios del usuario y comentarios agregados por el usuario.
const communityLikedPosts = new Set(); // ids de posts que el usuario likeó
const communityUserComments = new Map(); // Map<postId, array de comentarios agregados>