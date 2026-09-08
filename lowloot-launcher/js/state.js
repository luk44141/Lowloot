// state.js — estado compartido en memoria de toda la app (navegación, wishlist, carrito,
// noticias, notificaciones, filtros de resultados). Ningún dato viene de un backend todavía.

let lastMainView = 'inicio';

// Wishlist: Map<gameId, fechaAgregadoISO (YYYY-MM-DD)>
const wishlist = new Map();

// Carrito: Map<gameId, cantidad>
const cart = new Map();

// Noticias del carrusel de Inicio
let newsList = [];
let newsIndex = 0;

// Notificaciones: todavía no existe un endpoint real (/notifications), así
// que arranca vacío en vez de mostrar datos simulados. topbar.js ya maneja
// el estado vacío ("No tenés notificaciones todavía."), y cuando exista el
// backend esto se reemplaza por un fetch sin tocar el resto de topbar.js.
const notifications = [];

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

let libraryViewMode = 'lista'; // 'lista' | 'cuadricula' | 'caratulas'
let librarySort = 'nombre'; // 'nombre' | 'ultimo-jugado' | 'horas' | 'agregado' | 'actualizacion'
let libraryFilter = 'todos'; // 'todos' | 'instalados' | 'no-instalados' | 'favoritos' | 'actualizaciones'
let libraryQuery = '';
let libraryFolder = null; // nombre de carpeta activa, o null si se ve la Biblioteca completa

// Favoritos de Biblioteca: Map<gameId, bool>. Si un juego no está acá se usa
// el valor por defecto que trae LibraryData (mock "de backend").
const libraryFavoriteOverrides = new Map();

// Juego cuya ficha de Biblioteca está abierta / juego para el que está
// abierto el modal de instalación (null si no hay nada abierto).
let currentLibraryGameId = null;
let installModalGameId = null;

// Comunidad de Biblioteca (simulado en memoria, sin backend):
// likes propios del usuario y comentarios agregados por el usuario.
const communityLikedPosts = new Set(); // ids de posts que el usuario likeó
const communityUserComments = new Map(); // Map<postId, array de comentarios agregados>