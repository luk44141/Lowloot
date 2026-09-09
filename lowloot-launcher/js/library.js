// library.js — vista principal de Biblioteca: lista/cuadrícula/carátulas, orden,
// filtros, buscador propio y las tarjetas de carpetas.
// Depende de LowlootData, LibraryData, helpers.js, state.js y navigation.js.

/* ---------- Datos combinados (juego + entrada de biblioteca) ---------- */

let libraryCache = null;

// Se llama tras comprar, instalar un juego, o iniciar/cerrar sesión, para
// que la Biblioteca vuelva a pedir /library/me en vez de mostrar datos
// obsoletos (por ejemplo, un juego recién comprado que todavía no aparece).
function invalidateLibraryCache() {
  libraryCache = null;
  if (typeof LibraryData !== 'undefined') LibraryData.invalidate();
}

async function loadLibraryGames() {
  if (libraryCache) return libraryCache;
  const entries = await LibraryData.getLibrary();
  const merged = await Promise.all(
    entries.map(async (entry) => {
      const game = await LowlootData.getGameById(entry.gameId);
      return { ...game, ...entry, id: entry.gameId };
    })
  );
  libraryCache = merged;
  return merged;
}

function isLibraryFavorite(game) {
  const key = String(game.gameId);
  return libraryFavoriteOverrides.has(key) ? libraryFavoriteOverrides.get(key) : game.favorite;
}

/* ---------- Formato específico de Biblioteca ---------- */

function formatPlaytime(hours) {
  if (!hours) return 'Sin jugar';
  return `${hours.toLocaleString('es-AR', { maximumFractionDigits: 1 })} h`;
}

function formatLastPlayed(iso) {
  if (!iso) return 'Nunca';
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const timePart = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} · ${timePart}`;
}

/* ---------- Filtro + orden ---------- */

function applyLibraryFilters(games) {
  let list = [...games];

  if (libraryFolder) list = list.filter((g) => g.folder === libraryFolder);

  if (libraryQuery.trim()) {
    const q = libraryQuery.trim().toLowerCase();
    list = list.filter((g) => g.name.toLowerCase().includes(q) || g.genre.toLowerCase().includes(q));
  }

  if (libraryFilter === 'instalados') list = list.filter((g) => g.installed);
  else if (libraryFilter === 'no-instalados') list = list.filter((g) => !g.installed);
  else if (libraryFilter === 'favoritos') list = list.filter(isLibraryFavorite);
  else if (libraryFilter === 'actualizaciones') list = list.filter((g) => g.updateAvailable);

  switch (librarySort) {
    case 'ultimo-jugado':
      list.sort((a, b) => new Date(b.lastPlayed || 0) - new Date(a.lastPlayed || 0));
      break;
    case 'horas':
      list.sort((a, b) => b.playtimeHours - a.playtimeHours);
      break;
    case 'agregado':
      list.sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));
      break;
    case 'actualizacion':
      list.sort((a, b) => Number(b.updateAvailable) - Number(a.updateAvailable));
      break;
    default:
      list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  return list;
}

/* ---------- Piezas compartidas entre lista/cuadrícula/carátulas ---------- */

function libraryStatusPill(game) {
  if (game.updateAvailable) return `<span class="lib-pill lib-pill-update">ACTUALIZACIÓN DISPONIBLE</span>`;
  if (game.installed) return `<span class="lib-pill lib-pill-installed">Instalado</span>`;
  return `<span class="lib-pill lib-pill-not-installed">No instalado</span>`;
}

function libraryActionButtons(game, size) {
  const small = size === 'small' ? ' lib-action-btn-small' : '';
  if (!game.installed) {
    return `<button type="button" class="btn-primary lib-action-btn${small}" data-lib-install="${game.gameId}">INSTALAR</button>`;
  }
  const playBtn = `<button type="button" class="btn-primary lib-action-btn${small}" data-buy-toggle="La ejecución de juegos todavía no está disponible">JUGAR</button>`;
  if (game.updateAvailable && size !== 'small') {
    return `<div class="lib-action-group"><button type="button" class="btn-secondary lib-action-btn${small}" data-buy-toggle="Las actualizaciones automáticas todavía no están disponibles">ACTUALIZAR</button>${playBtn}</div>`;
  }
  return playBtn;
}

/* ---------- Modo Lista ---------- */

function renderLibraryRow(game) {
  return `
    <article class="lib-row" data-lib-game-id="${game.gameId}">
      <div class="lib-row-cover ${gameCoverClass(game)}" ${gameCoverStyle(game)} aria-hidden="true"></div>
      <div class="lib-row-info">
        <h4 class="lib-row-name">${game.name}</h4>
        <span class="lib-row-sub">${game.genre} · ${game.developers.join(', ')}</span>
      </div>
      <div class="lib-row-status">${libraryStatusPill(game)}</div>
      <div class="lib-row-stat">
        <span class="lib-stat-label">Jugadas</span>
        <span class="lib-stat-value">${formatPlaytime(game.playtimeHours)}</span>
      </div>
      <div class="lib-row-stat">
        <span class="lib-stat-label">Última vez</span>
        <span class="lib-stat-value">${formatLastPlayed(game.lastPlayed)}</span>
      </div>
      <div class="lib-row-action">${libraryActionButtons(game)}</div>
    </article>
  `;
}

/* ---------- Modo Cuadrícula ---------- */

function renderLibraryCard(game) {
  return `
    <article class="lib-card" data-lib-game-id="${game.gameId}">
      <div class="lib-card-cover ${gameCoverClass(game)}" ${gameCoverStyle(game)} aria-hidden="true">
        ${game.updateAvailable ? '<span class="lib-update-dot" title="Actualización disponible"></span>' : ''}
      </div>
      <div class="lib-card-info">
        <h4 class="lib-card-name">${game.name}</h4>
        <span class="lib-card-sub">${formatPlaytime(game.playtimeHours)} · ${game.installed ? 'Instalado' : 'No instalado'}</span>
      </div>
      <div class="lib-card-action">${libraryActionButtons(game, 'small')}</div>
    </article>
  `;
}

/* ---------- Modo Carátulas ---------- */

function renderLibraryCover(game) {
  return `
    <article class="lib-cover" data-lib-game-id="${game.gameId}">
      <div class="lib-cover-image ${gameCoverClass(game)}" ${gameCoverStyle(game)} aria-hidden="true">
        ${game.updateAvailable ? '<span class="lib-update-dot" title="Actualización disponible"></span>' : ''}
        ${!game.installed ? '<span class="lib-cover-badge">No instalado</span>' : ''}
      </div>
      <span class="lib-cover-name">${game.name}</span>
    </article>
  `;
}

function renderLibraryGames(list) {
  if (!list.length) {
    return `<p class="placeholder-text">No encontramos juegos con estos filtros.</p>`;
  }
  if (libraryViewMode === 'cuadricula') return list.map(renderLibraryCard).join('');
  if (libraryViewMode === 'caratulas') return list.map(renderLibraryCover).join('');
  return list.map(renderLibraryRow).join('');
}

/* ---------- Carpetas ---------- */

function renderFolderCard(folder, gamesById) {
  const covers = folder.gameIds
    .slice(0, 2)
    .map((id) => {
      const g = gamesById.get(id);
      return `<div class="lib-folder-cover-img ${g ? gameCoverClass(g) : ''}" ${g ? gameCoverStyle(g) : ''} aria-hidden="true"></div>`;
    })
    .join('');
  return `
    <button type="button" class="lib-folder-card" data-lib-folder="${folder.name}">
      <div class="lib-folder-cover">${covers}</div>
      <span class="lib-folder-name">${folder.name}</span>
      <span class="lib-folder-count">${folder.gameIds.length} juego${folder.gameIds.length === 1 ? '' : 's'}</span>
    </button>
  `;
}

async function renderFolderCardsSection(allGames) {
  const folders = await LibraryData.getFolders();
  if (!folders.length) return '';
  const gamesById = new Map(allGames.map((g) => [g.gameId, g]));
  return `
    <section class="lib-folders">
      <h3 class="lib-folders-title">Carpetas</h3>
      <div class="lib-folders-track">${folders.map((f) => renderFolderCard(f, gamesById)).join('')}</div>
    </section>
  `;
}

/* ---------- Render principal ---------- */

async function renderLibraryHome() {
  const container = qs('#library-content');
  if (!container) return;

  const allGames = await loadLibraryGames();
  const filtered = applyLibraryFilters(allGames);
  const folderSection = libraryFolder ? '' : await renderFolderCardsSection(allGames);

  container.innerHTML = `
    <div class="lib-header">
      <h2 class="section-title">BIBLIOTECA</h2>
      <div class="lib-controls">
        <div class="lib-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="lib-search-input" placeholder="Buscar en tu biblioteca..." value="${escapeHtml(libraryQuery)}" autocomplete="off" />
        </div>

        <div class="lib-view-toggle" role="tablist">
          <button type="button" class="lib-view-btn ${libraryViewMode === 'lista' ? 'active' : ''}" data-lib-view="lista">Lista</button>
          <button type="button" class="lib-view-btn ${libraryViewMode === 'cuadricula' ? 'active' : ''}" data-lib-view="cuadricula">Cuadrícula</button>
          <button type="button" class="lib-view-btn ${libraryViewMode === 'caratulas' ? 'active' : ''}" data-lib-view="caratulas">Carátulas</button>
        </div>
      </div>
    </div>

    <div class="lib-toolbar">
      <div class="lib-filter-chips">
        ${[
          ['todos', 'Todos'],
          ['instalados', 'Instalados'],
          ['no-instalados', 'No instalados'],
          ['favoritos', 'Favoritos'],
          ['actualizaciones', 'Actualizaciones'],
        ]
          .map(([value, label]) => `<button type="button" class="lib-filter-chip ${libraryFilter === value ? 'active' : ''}" data-lib-filter="${value}">${label}</button>`)
          .join('')}
      </div>

      <div class="lib-sort">
        <label for="lib-sort-select">Ordenar por</label>
        <select id="lib-sort-select">
          <option value="nombre" ${librarySort === 'nombre' ? 'selected' : ''}>Nombre</option>
          <option value="ultimo-jugado" ${librarySort === 'ultimo-jugado' ? 'selected' : ''}>Última vez jugado</option>
          <option value="horas" ${librarySort === 'horas' ? 'selected' : ''}>Horas jugadas</option>
          <option value="agregado" ${librarySort === 'agregado' ? 'selected' : ''}>Fecha de agregado</option>
          <option value="actualizacion" ${librarySort === 'actualizacion' ? 'selected' : ''}>Última actualización</option>
        </select>
      </div>
    </div>

    ${
      libraryFolder
        ? `<button type="button" class="back-btn" data-lib-folder-back>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Todas las carpetas
          </button>
          <h3 class="lib-folder-heading">${escapeHtml(libraryFolder)}</h3>`
        : folderSection
    }

    <div class="lib-games lib-games-${libraryViewMode}" id="lib-games">
      ${renderLibraryGames(filtered)}
    </div>
  `;
}

/* ---------- Refresco liviano (mantiene el foco del buscador) ---------- */

function refreshLibraryGamesList() {
  qsa('.lib-filter-chip').forEach((b) => b.classList.toggle('active', b.dataset.libFilter === libraryFilter));
  qsa('.lib-view-btn').forEach((b) => b.classList.toggle('active', b.dataset.libView === libraryViewMode));

  const gamesEl = qs('#lib-games');
  if (!gamesEl) return;

  gamesEl.classList.add('lib-games-fading');
  setTimeout(async () => {
    const allGames = await loadLibraryGames();
    const filtered = applyLibraryFilters(allGames);
    gamesEl.className = `lib-games lib-games-${libraryViewMode} lib-games-fading`;
    gamesEl.innerHTML = renderLibraryGames(filtered);
    setTimeout(() => gamesEl.classList.remove('lib-games-fading'), 20);
  }, 120);
}

/* ---------- Inicialización de controles (buscador y orden) ---------- */

function initLibraryControls() {
  document.body.addEventListener('input', (event) => {
    if (event.target.id === 'lib-search-input') {
      libraryQuery = event.target.value;
      refreshLibraryGamesList();
    }
  });

  document.body.addEventListener('change', (event) => {
    if (event.target.id === 'lib-sort-select') {
      librarySort = event.target.value;
      refreshLibraryGamesList();
    }
  });
}
