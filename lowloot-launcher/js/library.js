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
  return Boolean(game.favorite);
}

// Toggle real de favorito: persiste en PostgreSQL (user_games.favorite) y
// actualiza la caché en memoria + vuelve a ordenar/pintar la lista al
// toque, sin recargar toda la Biblioteca ni depender de un estado
// simulado en el cliente.
async function toggleLibraryFavoriteReal(gameId) {
  const entry = libraryCache?.find((g) => String(g.gameId) === String(gameId));
  if (!entry) return;

  const next = !entry.favorite;
  try {
    await LowlootAPI.setLibraryFavorite(gameId, next);
  } catch (err) {
    showToast(err.message || 'No se pudo actualizar el favorito');
    return;
  }

  entry.favorite = next;
  if (typeof LibraryData !== 'undefined') LibraryData.setFavoriteCache(gameId, next);

  showToast(next ? 'Agregado a favoritos' : 'Quitado de favoritos');

  if (qs('.view[data-view="biblioteca"]')?.classList.contains('active')) {
    refreshLibraryGamesList();
  }
  if (currentLibraryGameId != null && String(currentLibraryGameId) === String(gameId)) {
    const favBtn = qs(`[data-lib-favorite-toggle="${gameId}"]`);
    if (favBtn) {
      favBtn.classList.toggle('wishlisted', next);
      favBtn.innerHTML = `<span class="wishlist-icon">${next ? '♥' : '♡'}</span> ${next ? 'En favoritos' : 'Agregar a favoritos'}`;
    }
  }
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

  let comparator;
  switch (librarySort) {
    case 'ultimo-jugado':
      comparator = (a, b) => new Date(b.lastPlayed || 0) - new Date(a.lastPlayed || 0);
      break;
    case 'horas':
      comparator = (a, b) => b.playtimeHours - a.playtimeHours;
      break;
    case 'agregado':
      comparator = (a, b) => new Date(b.addedDate) - new Date(a.addedDate);
      break;
    case 'actualizacion':
      comparator = (a, b) => Number(b.updateAvailable) - Number(a.updateAvailable);
      break;
    default:
      comparator = (a, b) => a.name.localeCompare(b.name, 'es');
  }

  // Los favoritos siempre van primero (y mantienen el mismo orden estable
  // entre ellos, y los no-favoritos entre sí, según el criterio elegido).
  list.sort((a, b) => Number(isLibraryFavorite(b)) - Number(isLibraryFavorite(a)) || comparator(a, b));

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

// Menú de "tres puntos": por ahora solo tiene Desinstalar (simulado, no
// borra archivos reales), y solo aparece si el juego está instalado.
function libraryMenuButton(game) {
  return `
    <div class="lib-menu" data-lib-menu="${game.gameId}">
      <button type="button" class="lib-menu-trigger" data-lib-menu-toggle="${game.gameId}" aria-label="Más opciones">⋮</button>
      <div class="lib-menu-dropdown" id="lib-menu-dropdown-${game.gameId}">
        ${
          game.installed
            ? `<button type="button" class="lib-menu-item" data-lib-uninstall="${game.gameId}">Desinstalar</button>`
            : `<span class="lib-menu-empty">Sin más opciones</span>`
        }
      </div>
    </div>
  `;
}

function closeAllLibraryMenus(exceptGameId) {
  qsa('.lib-menu.open').forEach((menu) => {
    if (String(menu.dataset.libMenu) !== String(exceptGameId)) menu.classList.remove('open');
  });
}

function toggleLibraryMenu(gameId) {
  const menu = qs(`.lib-menu[data-lib-menu="${gameId}"]`);
  if (!menu) return;
  const willOpen = !menu.classList.contains('open');
  closeAllLibraryMenus(willOpen ? gameId : null);
  menu.classList.toggle('open', willOpen);
}

/* ---------- Modo Lista ---------- */

function renderLibraryRow(game) {
  const favorited = isLibraryFavorite(game);
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
      <button type="button" class="lib-favorite-btn ${favorited ? 'active' : ''}" data-lib-favorite-toggle="${game.gameId}" title="${favorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
        ${favorited ? '★' : '☆'}
      </button>
      <div class="lib-row-action">${libraryActionButtons(game)}${libraryMenuButton(game)}</div>
    </article>
  `;
}

/* ---------- Modo Cuadrícula ---------- */

function renderLibraryCard(game) {
  const favorited = isLibraryFavorite(game);
  return `
    <article class="lib-card" data-lib-game-id="${game.gameId}">
      <div class="lib-card-cover ${gameCoverClass(game)}" ${gameCoverStyle(game)} aria-hidden="true">
        ${game.updateAvailable ? '<span class="lib-update-dot" title="Actualización disponible"></span>' : ''}
      </div>
      <button type="button" class="lib-favorite-btn lib-favorite-btn-card ${favorited ? 'active' : ''}" data-lib-favorite-toggle="${game.gameId}" title="${favorited ? 'Quitar de favoritos' : 'Agregar a favoritos'}">
        ${favorited ? '★' : '☆'}
      </button>
      <div class="lib-card-info">
        <h4 class="lib-card-name">${game.name}</h4>
        <span class="lib-card-sub">${formatPlaytime(game.playtimeHours)} · ${game.installed ? 'Instalado' : 'No instalado'}</span>
      </div>
      <div class="lib-card-action">${libraryActionButtons(game, 'small')}${libraryMenuButton(game)}</div>
    </article>
  `;
}

function renderLibraryGames(list, isLibraryEmpty) {
  if (!list.length) {
    return `<p class="placeholder-text">${isLibraryEmpty ? 'No hay juegos' : 'No encontramos juegos con estos filtros'}.</p>`;
  }
  if (libraryViewMode === 'cuadricula') return list.map(renderLibraryCard).join('');
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

function renderCreateFolderCard() {
  return `
    <button type="button" class="lib-folder-card lib-folder-card-create" data-open-folder-modal>
      <div class="lib-folder-cover lib-folder-cover-create">
        <div class="lib-folder-create-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </div>
      </div>
      <span class="lib-folder-name">Crear carpeta</span>
      <span class="lib-folder-count">Nueva</span>
    </button>
  `;
}

async function renderFolderCardsSection(allGames) {
  // Sin juegos en la biblioteca todavía no tiene sentido ofrecer crear
  // carpetas (no habría nada para elegir adentro del modal).
  if (!allGames.length) return '';

  const folders = await LibraryData.getFolders();
  const gamesById = new Map(allGames.map((g) => [g.gameId, g]));
  return `
    <section class="lib-folders">
      <h3 class="lib-folders-title">Carpetas</h3>
      <div class="lib-folders-track">
        ${folders.map((f) => renderFolderCard(f, gamesById)).join('')}
        ${renderCreateFolderCard()}
      </div>
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
          <div class="lib-folder-open-header">
            <h3 class="lib-folder-heading">${escapeHtml(libraryFolder)}</h3>
            <button type="button" class="lib-folder-delete-btn" data-lib-folder-delete="${escapeHtml(libraryFolder)}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Borrar carpeta
            </button>
          </div>`
        : folderSection
    }

    <div class="lib-games lib-games-${libraryViewMode}" id="lib-games">
      ${renderLibraryGames(filtered, allGames.length === 0)}
    </div>
  `;
}

/* ---------- Borrar carpeta (con confirmación liviana en el propio botón) ---------- */

async function handleFolderDeleteClick(name, btn) {
  if (btn.dataset.confirming !== '1') {
    btn.dataset.confirming = '1';
    btn.classList.add('confirming');
    btn.innerHTML = '¿Seguro? Sí, borrar';
    // Si el usuario se arrepiente y no vuelve a tocar el botón, que
    // vuelva solo al estado normal después de un rato en vez de quedar
    // pidiendo confirmación para siempre.
    clearTimeout(btn._confirmResetTimer);
    btn._confirmResetTimer = setTimeout(() => resetFolderDeleteButton(btn, name), 4000);
    return;
  }

  clearTimeout(btn._confirmResetTimer);
  await LibraryData.deleteFolder(name);
  if (typeof invalidateLibraryCache === 'function') invalidateLibraryCache();
  libraryFolder = null;
  showToast(`Carpeta "${name}" borrada`);
  renderLibraryHome();
}

function resetFolderDeleteButton(btn, name) {
  if (!btn || !btn.isConnected) return;
  btn.dataset.confirming = '0';
  btn.classList.remove('confirming');
  btn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
    Borrar carpeta
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
    gamesEl.innerHTML = renderLibraryGames(filtered, allGames.length === 0);
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
