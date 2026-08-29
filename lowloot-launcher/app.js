// app.js
//
// Lógica de interfaz de Lowloot Launcher.
// Todo lo que se ve acá consume LowlootData (data.js) como si fuera un
// cliente de API: se llama con await y devuelve datos ya armados.
// El día que eso pase a pegarle a Spring Boot, esta capa no debería
// necesitar cambios más allá de, eventualmente, mostrar un estado de carga.
//
// No hay pagos, descargas, login ni distribución real todavía: cada acción
// "real" (comprar, obtener, jugar, descargar) muestra un toast aclarando
// que todavía no está disponible.

const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// Fecha de referencia para la maqueta (coherente con los datos de prueba).
const NOW = new Date('2026-08-27T00:00:00');

let lastMainView = 'inicio';

// Wishlist: Map<gameId, fechaAgregadoISO (YYYY-MM-DD)>
const wishlist = new Map();

// Noticias del carrusel de Inicio
let newsList = [];
let newsIndex = 0;

// Notificaciones (mock local, sin backend)
const notifications = [
  { id: 'n1', title: 'Iron Tide ya tiene 35% de descuento', time: 'Hace 2 horas', read: false },
  { id: 'n2', title: 'Se agregó una nueva reseña a Ashen Hollow', time: 'Hace 5 horas', read: false },
  { id: 'n3', title: 'Static Frontier superó las 25 mil horas jugadas', time: 'Ayer', read: false },
  { id: 'n4', title: 'Mantenimiento programado este fin de semana', time: 'Hace 3 días', read: true },
];

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

document.addEventListener('DOMContentLoaded', async () => {
  initSidebarNavigation();
  initProfileMenu();
  initNotifications();
  initSearch();
  initDelegatedHandlers();
  await renderHome();
});

/* ---------- Helpers de formato ---------- */

function formatPrice(n) {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function scrollMainTop() {
  qs('.main').scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Navegación general ---------- */

function activateView(viewName, options = {}) {
  const navItems = qsa('.nav-item[data-view]');
  const views = qsa('.view[data-view]');

  if (options.selectNav !== false) {
    navItems.forEach((n) => n.classList.toggle('active', n.dataset.view === viewName));
  } else {
    navItems.forEach((n) => n.classList.remove('active'));
  }

  views.forEach((v) => v.classList.toggle('active', v.dataset.view === viewName));
  scrollMainTop();
}

function initSidebarNavigation() {
  qsa('.nav-item[data-view]').forEach((item) => {
    item.addEventListener('click', () => {
      activateView(item.dataset.view);
      if (item.dataset.view === 'tienda') renderStoreHome();
      if (item.dataset.view === 'wishlist') renderWishlistView();
    });
  });
}

function handleBack(target) {
  if (target === 'store-home') {
    activateView('tienda');
    renderStoreHome();
  } else if (target === 'main-nav') {
    activateView(lastMainView);
    if (lastMainView === 'tienda') renderStoreHome();
    if (lastMainView === 'wishlist') renderWishlistView();
  }
}

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

/* ---------- Toast simple ---------- */

let toastTimeout = null;

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2200);
}

/* ---------- Tarjetas reutilizables ---------- */

function priceMarkup(game) {
  if (game.isFree) return `<span class="game-price price-free">GRATIS</span>`;
  if (game.discount > 0) {
    const discounted = Math.round(game.price * (1 - game.discount / 100));
    return `<span class="game-price has-discount"><span class="price-old">${formatPrice(game.price)}</span><span class="price-new">${formatPrice(discounted)}</span></span>`;
  }
  return `<span class="game-price">${formatPrice(game.price)}</span>`;
}

function discountBadge(game) {
  return game.discount > 0 ? `<span class="discount-badge">-${game.discount}%</span>` : '';
}

function renderGameCard(game) {
  return `
    <article class="game-card" data-game-id="${game.id}">
      <div class="game-card-media">
        <div class="game-image ${game.gradient}" aria-hidden="true"></div>
        <div class="game-card-preview ${game.gradient}" aria-hidden="true">
          <span class="preview-label">▶ Vista previa</span>
        </div>
        ${discountBadge(game)}
      </div>
      <div class="game-info">
        <h4 class="game-name">${game.name}</h4>
        <span class="game-genre">${game.genre}</span>
        <div class="game-meta-row">
          <span class="game-rating">★ ${game.rating.toFixed(1)}</span>
          ${priceMarkup(game)}
        </div>
      </div>
    </article>
  `;
}

function renderResultRow(game) {
  return `
    <article class="result-row" data-game-id="${game.id}">
      <div class="result-thumb ${game.gradient}" aria-hidden="true"></div>
      <div class="result-info">
        <h4 class="result-name">${game.name}</h4>
        <span class="result-genre">${game.genre}</span>
      </div>
      <span class="result-rating">★ ${game.rating.toFixed(1)}</span>
      <div class="result-price">${discountBadge(game)}${priceMarkup(game)}</div>
    </article>
  `;
}

function packSavings(pack, games) {
  const individualTotal = games.reduce((sum, g) => sum + (g.isFree ? 0 : g.price), 0);
  const savings = individualTotal - pack.packPrice;
  const pct = individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0;
  return { individualTotal, savings, pct };
}

function renderPackCard(pack, games) {
  const { individualTotal, savings, pct } = packSavings(pack, games);
  return `
    <article class="pack-card" data-pack-id="${pack.id}">
      <div class="pack-card-media">
        <div class="pack-thumb ${games[0] ? games[0].gradient : ''}" aria-hidden="true"></div>
        <div class="pack-thumb pack-thumb-secondary ${games[1] ? games[1].gradient : ''}" aria-hidden="true"></div>
        <span class="pack-count-badge">${games.length} juegos</span>
      </div>
      <div class="game-info">
        <h4 class="game-name">${pack.name}</h4>
        <span class="game-genre">${games.map((g) => g.name).join(' + ')}</span>
        <div class="game-meta-row">
          <span class="price-old">${formatPrice(individualTotal)}</span>
          <span class="price-new">${formatPrice(pack.packPrice)}</span>
        </div>
        <span class="pack-savings">Ahorrás ${formatPrice(savings)} (${pct}%)</span>
      </div>
    </article>
  `;
}

/* ---------- Inicio ---------- */

async function renderHome() {
  await renderNewsCarousel();

  const topPlayed = await LowlootData.getMostPlayedGame();
  const trending = await LowlootData.getTrendingGames();

  const topPlayedSlot = qs('#top-played-slot');
  const trendingSlot = qs('#trending-slot');

  if (topPlayed) {
    topPlayedSlot.innerHTML = `
      <div class="featured-card">
        <div class="featured-image ${topPlayed.gradient}" aria-hidden="true"></div>
        <div class="featured-info">
          <h3 class="featured-name">${topPlayed.name}</h3>
          <p class="featured-desc">${topPlayed.shortDesc}</p>
          <span class="top-played-count">${topPlayed.plays.toLocaleString('es-AR')} jugadores ahora</span>
          <button type="button" class="btn-primary" data-game-id="${topPlayed.id}">VER JUEGO</button>
        </div>
      </div>
    `;
  }

  trendingSlot.innerHTML = trending.map(renderGameCard).join('');
}

/* ---------- Carrusel de noticias ---------- */

async function renderNewsCarousel() {
  newsList = await LowlootData.getNews();
  newsIndex = 0;
  updateNewsCarousel();
}

function updateNewsCarousel() {
  const slot = qs('#news-slot');
  if (!slot || !newsList.length) return;

  const len = newsList.length;
  const prev = newsList[(newsIndex - 1 + len) % len];
  const current = newsList[newsIndex];
  const next = newsList[(newsIndex + 1) % len];

  slot.innerHTML = `
    <div class="news-carousel-wrap">
      <div class="news-carousel">
        <button type="button" class="news-arrow" data-news-nav="prev" aria-label="Noticia anterior">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>

        <button type="button" class="news-card news-card-side" data-news-nav="prev">
          <div class="news-thumb ${prev.gradient}" aria-hidden="true"></div>
          <span class="news-side-title">${prev.title}</span>
        </button>

        <div class="news-card news-card-main">
          <div class="news-thumb news-thumb-main ${current.gradient}" aria-hidden="true"></div>
          <div class="news-main-info">
            <span class="news-date">${formatDate(current.date)}</span>
            <h3 class="news-title">${current.title}</h3>
            <p class="news-summary">${current.summary}</p>
          </div>
        </div>

        <button type="button" class="news-card news-card-side" data-news-nav="next">
          <div class="news-thumb ${next.gradient}" aria-hidden="true"></div>
          <span class="news-side-title">${next.title}</span>
        </button>

        <button type="button" class="news-arrow" data-news-nav="next" aria-label="Noticia siguiente">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

      <div class="news-dots">
        ${newsList.map((n, i) => `<span class="news-dot ${i === newsIndex ? 'active' : ''}"></span>`).join('')}
      </div>
    </div>
  `;
}

function navigateNews(direction) {
  if (!newsList.length) return;
  const len = newsList.length;
  newsIndex = direction === 'prev' ? (newsIndex - 1 + len) % len : (newsIndex + 1) % len;
  updateNewsCarousel();
}

/* ---------- Tienda: portada ---------- */

async function renderStoreRow(title, games) {
  if (!games.length) return '';
  const cards = games.slice(0, 8).map(renderGameCard).join('');
  return `
    <section class="store-row">
      <div class="store-row-header">
        <h3 class="store-row-title">${title}</h3>
      </div>
      <div class="store-row-track">${cards}</div>
    </section>
  `;
}

async function renderPacksRow(packs) {
  if (!packs.length) return '';
  const allGames = await LowlootData.getAllGames();
  const cards = packs
    .map((pack) => {
      const games = pack.gameIds.map((id) => allGames.find((g) => g.id === id)).filter(Boolean);
      return renderPackCard(pack, games);
    })
    .join('');

  return `
    <section class="store-row">
      <div class="store-row-header">
        <h3 class="store-row-title">Packs y colecciones</h3>
      </div>
      <div class="store-row-track">${cards}</div>
    </section>
  `;
}

async function renderStoreHome() {
  const container = qs('#store-content');
  if (!container) return;

  const sections = await LowlootData.getStoreSections();

  const parts = [
    `<div class="store-header">
      <h2 class="section-title">TIENDA</h2>
      <button type="button" class="btn-primary" data-explore>EXPLORAR</button>
    </div>`,
    await renderStoreRow('Ofertas', sections.ofertas),
    await renderPacksRow(sections.packs),
    await renderStoreRow('Mejor valorados', sections.mejorValorados),
    await renderStoreRow('Más jugados', sections.masJugados),
    await renderStoreRow('Recién lanzados', sections.recienLanzados),
  ];

  container.innerHTML = parts.join('');
}

async function handleExplore() {
  const all = await LowlootData.getAllGames();
  renderResults(all, { title: 'EXPLORAR JUEGOS', query: '', openFilters: true });
}

/* ---------- Tienda: resultados y filtros ---------- */

async function renderResults(list, { title, query, openFilters }) {
  currentResultsBaseList = list;
  currentResultsTitle = title;
  currentResultsQuery = query || '';
  currentOpenFilters = !!openFilters;
  currentFilters = defaultFilters();

  const filterOptions = await LowlootData.getFilterOptions();
  const container = qs('#store-content');

  container.innerHTML = `
    <div class="results-header">
      <button type="button" class="back-btn" data-back-to="store-home">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Volver a la tienda
      </button>
      <h2 class="section-title">${escapeHtml(title)}</h2>
    </div>

    <div class="results-toolbar">
      <span class="results-count" id="results-count"></span>
      <div class="results-sort">
        <label for="sort-select">Ordenar por</label>
        <select id="sort-select">
          <option value="relevancia">Relevancia</option>
          <option value="vendidos">Más vendidos</option>
          <option value="valorados">Mejor valorados</option>
          <option value="recientes">Más recientes</option>
          <option value="precio-asc">Precio: menor a mayor</option>
          <option value="precio-desc">Precio: mayor a menor</option>
        </select>
      </div>
      <button type="button" class="filters-toggle" id="filters-toggle">Filtros</button>
    </div>

    <div class="results-layout ${openFilters ? 'filters-open' : ''}" id="results-layout">
      <div class="results-list" id="results-list"></div>
      <aside class="filters-panel ${openFilters ? 'open' : ''}" id="filters-panel">
        <div class="filters-panel-header">
          <h3>Filtros</h3>
          <button type="button" class="filters-clear" id="filters-clear">Limpiar</button>
        </div>

        <div class="filter-group">
          <h4>Género</h4>
          ${filterOptions.genres.map((g) => `<label class="filter-checkbox"><input type="checkbox" data-filter="genre" value="${g}"> ${g}</label>`).join('')}
        </div>

        <div class="filter-group">
          <h4>Precio</h4>
          <label class="filter-radio"><input type="radio" name="price-bucket" data-filter="price" value="todos" checked> Todos</label>
          <label class="filter-radio"><input type="radio" name="price-bucket" data-filter="price" value="gratis"> Gratis</label>
          <label class="filter-radio"><input type="radio" name="price-bucket" data-filter="price" value="bajo"> Menos de $10.000</label>
          <label class="filter-radio"><input type="radio" name="price-bucket" data-filter="price" value="medio"> $10.000 - $20.000</label>
          <label class="filter-radio"><input type="radio" name="price-bucket" data-filter="price" value="alto"> Más de $20.000</label>
        </div>

        <div class="filter-group">
          <h4>Valoración mínima</h4>
          <label class="filter-radio"><input type="radio" name="min-rating" data-filter="rating" value="0" checked> Cualquiera</label>
          <label class="filter-radio"><input type="radio" name="min-rating" data-filter="rating" value="4.5"> 4.5 o más</label>
          <label class="filter-radio"><input type="radio" name="min-rating" data-filter="rating" value="4"> 4 o más</label>
          <label class="filter-radio"><input type="radio" name="min-rating" data-filter="rating" value="3"> 3 o más</label>
        </div>

        <div class="filter-group">
          <h4>Fecha de lanzamiento</h4>
          <select id="release-filter" data-filter="release">
            <option value="todos">Todos</option>
            <option value="mes">Último mes</option>
            <option value="anio">Último año</option>
          </select>
        </div>

        <div class="filter-group">
          <h4>Idioma</h4>
          ${filterOptions.languages.map((l) => `<label class="filter-checkbox"><input type="checkbox" data-filter="language" value="${l}"> ${l}</label>`).join('')}
        </div>
      </aside>
    </div>
  `;

  applyFiltersAndRender();
}

function toggleSetFilter(set, value, checked) {
  if (checked) set.add(value);
  else set.delete(value);
}

function applyFiltersAndRender() {
  let list = [...currentResultsBaseList];

  if (currentFilters.genres.size) list = list.filter((g) => currentFilters.genres.has(g.genre));
  if (currentFilters.languages.size) list = list.filter((g) => g.languages.some((l) => currentFilters.languages.has(l)));

  if (currentFilters.priceBucket !== 'todos') {
    list = list.filter((g) => {
      const price = g.isFree ? 0 : g.price;
      switch (currentFilters.priceBucket) {
        case 'gratis':
          return g.isFree;
        case 'bajo':
          return !g.isFree && price < 10000;
        case 'medio':
          return !g.isFree && price >= 10000 && price <= 20000;
        case 'alto':
          return !g.isFree && price > 20000;
        default:
          return true;
      }
    });
  }

  if (currentFilters.minRating) list = list.filter((g) => g.rating >= currentFilters.minRating);

  if (currentFilters.releaseWindow !== 'todos') {
    list = list.filter((g) => {
      const diffDays = (NOW - new Date(g.releaseDate)) / (1000 * 60 * 60 * 24);
      if (currentFilters.releaseWindow === 'mes') return diffDays <= 31;
      if (currentFilters.releaseWindow === 'anio') return diffDays <= 366;
      return true;
    });
  }

  const effectivePrice = (g) => (g.isFree ? 0 : g.price * (1 - g.discount / 100));

  switch (currentFilters.sort) {
    case 'vendidos':
      list.sort((a, b) => b.plays - a.plays);
      break;
    case 'valorados':
      list.sort((a, b) => b.rating - a.rating);
      break;
    case 'recientes':
      list.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
      break;
    case 'precio-asc':
      list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
      break;
    case 'precio-desc':
      list.sort((a, b) => effectivePrice(b) - effectivePrice(a));
      break;
    default:
      break; // relevancia: se mantiene el orden recibido
  }

  const listEl = qs('#results-list');
  const countEl = qs('#results-count');

  if (listEl) {
    listEl.innerHTML = list.length
      ? list.map(renderResultRow).join('')
      : `<p class="empty-state visible">No se encontraron juegos con estos filtros.</p>`;
  }
  if (countEl) countEl.textContent = `${list.length} juego${list.length === 1 ? '' : 's'}`;
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
            <span class="suggestion-thumb ${g.gradient}" aria-hidden="true"></span>
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

/* ---------- Página dedicada de juego ---------- */

async function openGameDetail(id) {
  const game = await LowlootData.getGameById(id);
  if (!game) return;

  const activeNav = qs('.nav-item.active');
  if (activeNav) lastMainView = activeNav.dataset.view;

  await renderGameDetail(game);
  activateView('game', { selectNav: false });
}

function renderReviewsList(reviews) {
  if (!reviews.length) return `<p class="placeholder-text">Todavía no hay reseñas para este juego.</p>`;
  return reviews
    .map(
      (r) => `
    <article class="review-item">
      <div class="review-header">
        <span class="review-avatar" aria-hidden="true"></span>
        <div>
          <span class="review-user">${escapeHtml(r.user)}</span>
          <span class="review-meta">★ ${r.rating} · ${r.language} · ${formatDate(r.date)}</span>
        </div>
      </div>
      <p class="review-text">${escapeHtml(r.text)}</p>
    </article>
  `
    )
    .join('');
}

async function renderGameDetail(game) {
  const container = qs('#game-detail-content');
  const devInfos = await Promise.all(game.developers.map((name) => LowlootData.getDeveloperInfo(name)));
  const otherGames = await LowlootData.getGamesByDeveloper(game.developers[0], game.id);
  const discounted = game.discount > 0 ? Math.round(game.price * (1 - game.discount / 100)) : game.price;
  const isWishlisted = wishlist.has(game.id);

  const galleryThumbs = [0, 1, 2]
    .map(
      (i) =>
        `<button type="button" class="gallery-thumb ${game.gradient} ${i === 0 ? 'active' : ''}" data-thumb="${i}" style="filter:brightness(${1 - i * 0.14})" aria-label="Captura ${i + 1}"></button>`
    )
    .join('');

  let actionButton;
  if (game.owned) {
    actionButton = `<button type="button" class="btn-primary" data-buy-toggle="La ejecución del juego todavía no está disponible">JUGAR</button>`;
  } else if (game.isFree) {
    actionButton = `<button type="button" class="btn-primary" data-buy-toggle="Los pagos y descargas todavía no están disponibles">OBTENER</button>`;
  } else {
    actionButton = `<button type="button" class="btn-primary" data-buy-toggle="Los pagos todavía no están disponibles">COMPRAR · ${formatPrice(discounted)}</button>`;
  }

  const ownedBadge = game.owned ? `<span class="owned-badge">En tu biblioteca</span>` : '';

  const priceRow = game.owned
    ? ''
    : `
    <div class="detail-price-row">
      ${game.discount > 0 ? `<span class="discount-badge">-${game.discount}%</span><span class="price-old">${formatPrice(game.price)}</span>` : ''}
      <span class="detail-price">${game.isFree ? 'GRATIS' : formatPrice(discounted)}</span>
    </div>
  `;

  const editionsHtml = game.editions
    .map(
      (e) => `
    <div class="info-card">
      <h5>${e.name}</h5>
      <p>${e.includes}</p>
      <span class="info-card-price">${e.price === 0 ? 'GRATIS' : formatPrice(e.price)}</span>
    </div>
  `
    )
    .join('');

  const dlcHtml = game.dlc.length
    ? `<div class="info-card-row">${game.dlc
        .map(
          (d) => `
    <div class="info-card">
      <h5>${d.name}</h5>
      <span class="info-card-price">${formatPrice(d.price)}</span>
    </div>
  `
        )
        .join('')}</div>`
    : `<p class="placeholder-text">Este juego todavía no tiene DLC disponible.</p>`;

  const modsHtml = game.mods.length
    ? `<ul class="simple-list">${game.mods.map((m) => `<li>${m.name} <span class="text-muted">— por ${m.author}</span></li>`).join('')}</ul>`
    : `<p class="placeholder-text">Todavía no hay mods disponibles para este juego.</p>`;

  const requirementsHtml = `
    <div class="requirements-grid">
      <div class="requirements-col">
        <h5>Mínimos</h5>
        <ul class="req-list">
          <li><span>SO</span><span>${game.minReq.os}</span></li>
          <li><span>Procesador</span><span>${game.minReq.cpu}</span></li>
          <li><span>Memoria</span><span>${game.minReq.ram}</span></li>
          <li><span>Gráficos</span><span>${game.minReq.gpu}</span></li>
          <li><span>Almacenamiento</span><span>${game.minReq.storage}</span></li>
        </ul>
      </div>
      <div class="requirements-col">
        <h5>Recomendados</h5>
        <ul class="req-list">
          <li><span>SO</span><span>${game.recReq.os}</span></li>
          <li><span>Procesador</span><span>${game.recReq.cpu}</span></li>
          <li><span>Memoria</span><span>${game.recReq.ram}</span></li>
          <li><span>Gráficos</span><span>${game.recReq.gpu}</span></li>
          <li><span>Almacenamiento</span><span>${game.recReq.storage}</span></li>
        </ul>
      </div>
    </div>
  `;

  const ratingBreakdown = [5, 4, 3, 2, 1]
    .map((star) => {
      const count = game.reviews.filter((r) => Math.round(r.rating) === star).length;
      const pct = game.reviews.length ? Math.round((count / game.reviews.length) * 100) : 0;
      return `<div class="rating-bar-row"><span>${star}★</span><div class="rating-bar-track"><div class="rating-bar-fill" style="width:${pct}%"></div></div><span class="rating-bar-count">${count}</span></div>`;
    })
    .join('');

  const reviewLanguages = [...new Set(game.reviews.map((r) => r.language))];

  const reviewsControls = `
    <div class="reviews-controls">
      <select id="review-lang-filter">
        <option value="todos">Todos los idiomas</option>
        ${reviewLanguages.map((l) => `<option value="${l}">${l}</option>`).join('')}
      </select>
      <select id="review-rating-filter">
        <option value="0">Cualquier valoración</option>
        <option value="5">5 estrellas</option>
        <option value="4">4 estrellas o más</option>
        <option value="3">3 estrellas o más</option>
      </select>
      <select id="review-sort">
        <option value="recientes">Más recientes</option>
        <option value="valoracion-alta">Mejor valoradas</option>
        <option value="valoracion-baja">Peor valoradas</option>
      </select>
    </div>
  `;

  const otherGamesHtml = otherGames.length
    ? `<div class="store-row-track">${otherGames.map(renderGameCard).join('')}</div>`
    : `<p class="placeholder-text">No hay más juegos de esta desarrolladora todavía.</p>`;

  container.innerHTML = `
    <button type="button" class="back-btn" data-back-to="main-nav">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      Volver
    </button>

    <div class="detail-gallery">
      <div class="detail-hero ${game.gradient}" id="detail-hero-image" aria-hidden="true">
        <span class="hero-play-icon">▶</span>
        <span class="hero-play-label">Video principal (próximamente)</span>
      </div>
      <div class="gallery-thumbs">${galleryThumbs}</div>
    </div>

    <div class="detail-header">
      <span class="game-tag">${game.tags.join(' · ')}</span>
      <h1 class="detail-name">${game.name}</h1>
      <div class="detail-meta-row">
        <span class="game-rating">★ ${game.rating.toFixed(1)} <span class="text-muted">(${game.reviewsCount} reseñas)</span></span>
        <span class="detail-developer">por ${game.developers.join(' y ')}</span>
      </div>

      ${ownedBadge}
      ${priceRow}

      <div class="detail-actions">
        ${actionButton}
        <button type="button" class="btn-secondary ${isWishlisted ? 'wishlisted' : ''}" data-wishlist-toggle="${game.id}">
          <span class="wishlist-icon">${isWishlisted ? '♥' : '♡'}</span> ${isWishlisted ? 'En tu wishlist' : 'Agregar a wishlist'}
        </button>
      </div>
    </div>

    <section class="detail-section">
      <h3 class="section-title">DESCRIPCIÓN</h3>
      <p class="detail-desc">${game.description}</p>
    </section>

    <section class="detail-section">
      <h3 class="section-title">CARACTERÍSTICAS</h3>
      <ul class="chip-list">${game.features.map((f) => `<li class="chip">${f}</li>`).join('')}</ul>
    </section>

    <section class="detail-section">
      <h3 class="section-title">DESARROLLADORA</h3>
      <div class="developer-list">
        ${game.developers
          .map(
            (name, i) => `
          <div class="developer-item">
            <h4 class="developer-name">${name}${devInfos[i].founded ? ` <span class="text-muted">· desde ${devInfos[i].founded}</span>` : ''}</h4>
            <p class="detail-desc">${devInfos[i].blurb}</p>
          </div>
        `
          )
          .join('')}
      </div>
    </section>

    <section class="detail-section detail-section-inline">
      <div>
        <h3 class="section-title">FECHA DE LANZAMIENTO</h3>
        <p class="detail-desc">${formatDate(game.releaseDate)}</p>
      </div>
      <div>
        <h3 class="section-title">IDIOMAS</h3>
        <p class="detail-desc">${game.languages.join(', ')}</p>
      </div>
    </section>

    <section class="detail-section">
      <h3 class="section-title">VERSIONES DISPONIBLES</h3>
      <div class="info-card-row">${editionsHtml}</div>
    </section>

    <section class="detail-section">
      <h3 class="section-title">DLC</h3>
      ${dlcHtml}
    </section>

    <section class="detail-section">
      <h3 class="section-title">REQUISITOS</h3>
      ${requirementsHtml}
    </section>

    <section class="detail-section">
      <h3 class="section-title">MODS</h3>
      ${modsHtml}
    </section>

    <section class="detail-section">
      <h3 class="section-title">VALORACIONES Y RESEÑAS</h3>
      <div class="reviews-summary">
        <div class="reviews-average">
          <span class="reviews-average-number">${game.rating.toFixed(1)}</span>
          <span class="game-rating">★ de 5</span>
          <span class="text-muted">${game.reviewsCount} reseñas totales</span>
        </div>
        <div class="rating-breakdown">${ratingBreakdown}</div>
      </div>
      ${reviewsControls}
      <div class="reviews-list" id="reviews-list">${renderReviewsList(game.reviews)}</div>
    </section>

    <section class="detail-section">
      <h3 class="section-title">MÁS DE ${game.developers[0].toUpperCase()}</h3>
      ${otherGamesHtml}
    </section>
  `;

  currentDetailReviews = game.reviews;
}

function applyReviewFilters() {
  const langEl = qs('#review-lang-filter');
  const ratingEl = qs('#review-rating-filter');
  const sortEl = qs('#review-sort');
  if (!langEl || !ratingEl || !sortEl) return;

  const lang = langEl.value;
  const minRating = parseFloat(ratingEl.value);
  const sort = sortEl.value;

  let list = [...currentDetailReviews];
  if (lang !== 'todos') list = list.filter((r) => r.language === lang);
  if (minRating) list = list.filter((r) => r.rating >= minRating);

  if (sort === 'valoracion-alta') list.sort((a, b) => b.rating - a.rating);
  else if (sort === 'valoracion-baja') list.sort((a, b) => a.rating - b.rating);
  else list.sort((a, b) => new Date(b.date) - new Date(a.date));

  const listEl = qs('#reviews-list');
  if (listEl) listEl.innerHTML = renderReviewsList(list);
}

function toggleWishlist(btn) {
  const id = btn.dataset.wishlistToggle;
  const added = !wishlist.has(id);

  if (added) wishlist.set(id, new Date().toISOString().slice(0, 10));
  else wishlist.delete(id);

  btn.classList.toggle('wishlisted', added);
  btn.innerHTML = `<span class="wishlist-icon">${added ? '♥' : '♡'}</span> ${added ? 'En tu wishlist' : 'Agregar a wishlist'}`;
  showToast(added ? 'Agregado a tu wishlist' : 'Quitado de tu wishlist');
}

/* ---------- Vista de Wishlist ---------- */

async function renderWishlistView() {
  const container = qs('#wishlist-content');
  if (!container) return;

  if (!wishlist.size) {
    container.innerHTML = `
      <h2 class="section-title">WISHLIST</h2>
      <p class="placeholder-text">Todavía no agregaste juegos a tu wishlist. Entrá a un juego y tocá "Agregar a wishlist".</p>
    `;
    return;
  }

  const allGames = await LowlootData.getAllGames();
  const entries = [...wishlist.entries()]
    .map(([id, addedDate]) => ({ game: allGames.find((g) => g.id === id), addedDate }))
    .filter((e) => e.game)
    .sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));

  const rows = entries
    .map(
      ({ game, addedDate }) => `
    <div class="wishlist-row" data-game-id="${game.id}">
      <div class="result-thumb ${game.gradient}" aria-hidden="true"></div>
      <div class="result-info">
        <h4 class="result-name">${game.name}</h4>
        <span class="result-genre">${game.genre}</span>
      </div>
      <div class="wishlist-meta">
        <span>Agregado el ${formatDate(addedDate)}</span>
        <span>Lanzamiento: ${formatDate(game.releaseDate)}</span>
      </div>
      <div class="result-price">${discountBadge(game)}${priceMarkup(game)}</div>
      <button type="button" class="btn-secondary wishlist-remove-btn" data-wishlist-remove="${game.id}">Quitar</button>
    </div>
  `
    )
    .join('');

  container.innerHTML = `
    <h2 class="section-title">WISHLIST</h2>
    <div class="wishlist-list">${rows}</div>
  `;
}

/* ---------- Página dedicada de pack ---------- */

async function openPackDetail(id) {
  const pack = await LowlootData.getPackById(id);
  if (!pack) return;

  const activeNav = qs('.nav-item.active');
  if (activeNav) lastMainView = activeNav.dataset.view;

  await renderPackDetail(pack);
  activateView('pack', { selectNav: false });
}

async function renderPackDetail(pack) {
  const allGames = await LowlootData.getAllGames();
  const games = pack.gameIds.map((id) => allGames.find((g) => g.id === id)).filter(Boolean);
  const { individualTotal, savings, pct } = packSavings(pack, games);

  const gamesHtml = games
    .map(
      (g) => `
    <div class="pack-game-row" data-game-id="${g.id}">
      <div class="result-thumb ${g.gradient}" aria-hidden="true"></div>
      <div class="result-info">
        <h4 class="result-name">${g.name}</h4>
        <span class="result-genre">${g.genre}</span>
      </div>
      <span class="result-price">${formatPrice(g.isFree ? 0 : g.price)}</span>
    </div>
  `
    )
    .join('');

  const container = qs('#pack-detail-content');
  container.innerHTML = `
    <button type="button" class="back-btn" data-back-to="store-home">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      Volver a la tienda
    </button>

    <span class="game-tag">PACK</span>
    <h1 class="detail-name">${pack.name}</h1>
    <p class="detail-desc">${pack.description}</p>

    <section class="detail-section">
      <h3 class="section-title">JUEGOS INCLUIDOS</h3>
      <div class="pack-games-list">${gamesHtml}</div>
    </section>

    <section class="detail-section pack-summary">
      <div class="pack-summary-row"><span>Precio individual</span><span class="price-old">${formatPrice(individualTotal)}</span></div>
      <div class="pack-summary-row"><span>Precio del pack</span><span class="detail-price">${formatPrice(pack.packPrice)}</span></div>
      <div class="pack-summary-row pack-summary-savings"><span>Ahorrás</span><span>${formatPrice(savings)} (${pct}%)</span></div>
      <button type="button" class="btn-primary" data-buy-toggle="Los pagos todavía no están disponibles">COMPRAR PACK</button>
    </section>
  `;
}

/* ---------- Delegación de eventos (contenido dinámico) ---------- */

function initDelegatedHandlers() {
  document.body.addEventListener('click', (event) => {
    const newsNav = event.target.closest('[data-news-nav]');
    if (newsNav) {
      navigateNews(newsNav.dataset.newsNav);
      return;
    }

    const wishlistRemoveBtn = event.target.closest('[data-wishlist-remove]');
    if (wishlistRemoveBtn) {
      wishlist.delete(wishlistRemoveBtn.dataset.wishlistRemove);
      renderWishlistView();
      showToast('Quitado de tu wishlist');
      return;
    }

    const wishlistBtn = event.target.closest('[data-wishlist-toggle]');
    if (wishlistBtn) {
      toggleWishlist(wishlistBtn);
      return;
    }

    const buyBtn = event.target.closest('[data-buy-toggle]');
    if (buyBtn) {
      showToast(buyBtn.dataset.buyToggle);
      return;
    }

    const galleryThumb = event.target.closest('.gallery-thumb');
    if (galleryThumb) {
      qsa('.gallery-thumb').forEach((t) => t.classList.remove('active'));
      galleryThumb.classList.add('active');
      return;
    }

    if (event.target.closest('#filters-toggle')) {
      qs('#filters-panel')?.classList.toggle('open');
      qs('#results-layout')?.classList.toggle('filters-open');
      currentOpenFilters = qs('#filters-panel')?.classList.contains('open') || false;
      return;
    }

    if (event.target.closest('#filters-clear')) {
      renderResults(currentResultsBaseList, { title: currentResultsTitle, query: currentResultsQuery, openFilters: currentOpenFilters });
      return;
    }

    const backBtn = event.target.closest('[data-back-to]');
    if (backBtn) {
      handleBack(backBtn.dataset.backTo);
      return;
    }

    if (event.target.closest('[data-explore]')) {
      handleExplore();
      return;
    }

    const gameCard = event.target.closest('[data-game-id]');
    if (gameCard) {
      hideSuggestions();
      openGameDetail(gameCard.dataset.gameId);
      return;
    }

    const packCard = event.target.closest('[data-pack-id]');
    if (packCard) {
      hideSuggestions();
      openPackDetail(packCard.dataset.packId);
      return;
    }
  });

  document.body.addEventListener('change', (event) => {
    const target = event.target;

    if (target.id === 'sort-select') {
      currentFilters.sort = target.value;
      applyFiltersAndRender();
      return;
    }
    if (target.dataset.filter === 'genre') {
      toggleSetFilter(currentFilters.genres, target.value, target.checked);
      applyFiltersAndRender();
      return;
    }
    if (target.dataset.filter === 'language') {
      toggleSetFilter(currentFilters.languages, target.value, target.checked);
      applyFiltersAndRender();
      return;
    }
    if (target.dataset.filter === 'price') {
      currentFilters.priceBucket = target.value;
      applyFiltersAndRender();
      return;
    }
    if (target.dataset.filter === 'rating') {
      currentFilters.minRating = parseFloat(target.value);
      applyFiltersAndRender();
      return;
    }
    if (target.id === 'release-filter') {
      currentFilters.releaseWindow = target.value;
      applyFiltersAndRender();
      return;
    }
    if (['review-lang-filter', 'review-rating-filter', 'review-sort'].includes(target.id)) {
      applyReviewFilters();
    }
  });
}