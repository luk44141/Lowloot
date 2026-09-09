// store.js — Tienda: portada con filas por categoría, resultados de búsqueda y filtros.
// Depende de LowlootData, helpers.js, state.js, navigation.js y components.js.

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
      const games = pack.gameIds.map((id) => allGames.find((g) => String(g.id) === String(id))).filter(Boolean);
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
