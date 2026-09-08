// library-detail.js — pantalla individual de un juego dentro de Biblioteca:
// overview, updates del desarrollador, DLC, logros, requisitos, desarrolladora
// y reseñas. Reutiliza renderReviewsList (components.js) y datos de LowlootData
// para no duplicar información del juego que ya vive en data.js.
// Depende de LowlootData, LibraryData, helpers.js, state.js, navigation.js,
// components.js y library.js (formatPlaytime/formatLastPlayed/libraryActionButtons).

async function openLibraryGameDetail(gameId) {
  const allGames = await loadLibraryGames();
  const game = allGames.find((g) => g.gameId === gameId);
  if (!game) return;

  currentLibraryGameId = gameId;
  await renderLibraryGameDetail(game);
  activateView('library-game', { selectNav: false });
}

function libraryDlcSection(game) {
  const dlcList = game.dlc || [];
  if (!dlcList.length) {
    return `<p class="placeholder-text">Este juego todavía no tiene DLC disponible.</p>`;
  }

  const owned = dlcList.filter((d) => game.dlcOwned.includes(d.name));
  const available = dlcList.filter((d) => !game.dlcOwned.includes(d.name));

  const ownedHtml = owned.length
    ? `<div class="info-card-row">${owned
        .map((d) => `<div class="info-card lib-dlc-owned"><span class="lib-dlc-badge">Ya lo tenés</span><h5>${d.name}</h5></div>`)
        .join('')}</div>`
    : '';

  const availableHtml = available.length
    ? `<div class="info-card-row">${available
        .map(
          (d) => `
      <div class="info-card">
        <h5>${d.name}</h5>
        <span class="info-card-price">${formatPrice(d.price)}</span>
        <button type="button" class="btn-primary lib-dlc-buy" data-buy-toggle="Los pagos todavía no están disponibles">COMPRAR</button>
      </div>`
        )
        .join('')}</div>`
    : '';

  return `
    ${owned.length ? `<h4 class="lib-subsection-title">Ya en tu biblioteca</h4>${ownedHtml}` : ''}
    ${available.length ? `<h4 class="lib-subsection-title">Disponible para comprar</h4>${availableHtml}` : ''}
  `;
}

function libraryAchievementsSection(game) {
  const list = game.achievements || [];
  if (!list.length) return `<p class="placeholder-text">Este juego todavía no tiene logros.</p>`;

  const unlockedCount = list.filter((a) => a.unlocked).length;
  const items = list
    .map(
      (a) => `
    <div class="lib-achievement ${a.unlocked ? 'unlocked' : 'locked'}">
      <span class="lib-achievement-dot"></span>
      <div class="lib-achievement-info">
        <h5>${a.name}</h5>
        <p>${a.description}</p>
        ${a.unlocked ? `<span class="lib-achievement-date">Desbloqueado el ${formatDate(a.unlockedDate)}</span>` : '<span class="lib-achievement-date">Bloqueado</span>'}
      </div>
    </div>
  `
    )
    .join('');

  return `
    <p class="lib-achievements-count">${unlockedCount} de ${list.length} desbloqueados</p>
    <div class="lib-achievements-grid">${items}</div>
  `;
}

function libraryUpdatesSection(game) {
  const updates = [...(game.devUpdates || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!updates.length) return `<p class="placeholder-text">Todavía no hay updates publicados para este juego.</p>`;

  const [latest, ...rest] = updates;
  const latestHtml = `
    <div class="lib-update-highlight">
      <div class="lib-update-highlight-header">
        <span class="lib-update-version">v${latest.version}</span>
        <span class="text-muted">${formatDate(latest.date)}</span>
      </div>
      <h4>${latest.title}</h4>
      <p class="detail-desc">${latest.description}</p>
      <ul class="lib-update-changes">${latest.changes.map((c) => `<li>${c}</li>`).join('')}</ul>
    </div>
  `;

  const historyHtml = rest.length
    ? `
    <h4 class="lib-subsection-title">Historial de actualizaciones</h4>
    <div class="lib-update-history">
      ${rest
        .map(
          (u) => `
        <div class="lib-update-history-item">
          <span class="lib-update-version">v${u.version}</span>
          <span class="text-muted">${formatDate(u.date)}</span>
          <span class="lib-update-history-title">${u.title}</span>
        </div>
      `
        )
        .join('')}
    </div>
  `
    : '';

  return latestHtml + historyHtml;
}

async function renderLibraryGameDetail(game) {
  const container = qs('#library-game-content');
  const devInfos = await Promise.all(game.developers.map((name) => LowlootData.getDeveloperInfo(name)));
  const favorited = isLibraryFavorite(game);

  const galleryThumbs = [0, 1, 2]
    .map((i) => {
      const bg = game.coverImageUrl ? `background-image:url('${game.coverImageUrl}');background-size:cover;background-position:center;` : '';
      return `<button type="button" class="gallery-thumb ${gameCoverClass(game)} ${i === 0 ? 'active' : ''}" data-thumb="${i}" style="${bg}filter:brightness(${1 - i * 0.14})" aria-label="Captura ${i + 1}"></button>`;
    })
    .join('');

  container.innerHTML = `
    <button type="button" class="back-btn" data-lib-back>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      Volver a Biblioteca
    </button>

    <div class="detail-gallery">
      <div class="detail-hero ${gameCoverClass(game)}" ${gameCoverStyle(game)} aria-hidden="true"></div>
      <div class="gallery-thumbs">${galleryThumbs}</div>
    </div>

    <div class="detail-header">
      <span class="game-tag">${game.tags.join(' · ')}</span>
      <h1 class="detail-name">${game.name}</h1>
      <div class="detail-meta-row">
        <span class="game-rating">★ ${game.rating.toFixed(1)}</span>
        <span class="detail-developer">por ${game.developers.join(' y ')}</span>
        ${libraryStatusPill(game)}
      </div>

      <div class="detail-actions">
        ${libraryActionButtons(game)}
        <button type="button" class="btn-secondary ${favorited ? 'wishlisted' : ''}" data-lib-favorite-toggle="${game.gameId}">
          <span class="wishlist-icon">${favorited ? '♥' : '♡'}</span> ${favorited ? 'En favoritos' : 'Agregar a favoritos'}
        </button>
      </div>

      <div class="lib-quick-stats">
        <div><span class="lib-stat-label">Horas jugadas</span><span class="lib-stat-value">${formatPlaytime(game.playtimeHours)}</span></div>
        <div><span class="lib-stat-label">Última vez jugado</span><span class="lib-stat-value">${formatLastPlayed(game.lastPlayed)}</span></div>
        <div><span class="lib-stat-label">Agregado el</span><span class="lib-stat-value">${formatDate(game.addedDate)}</span></div>
        <div><span class="lib-stat-label">Lanzamiento original</span><span class="lib-stat-value">${formatDate(game.releaseDate)}</span></div>
        <div><span class="lib-stat-label">Versión instalada</span><span class="lib-stat-value">${game.installedVersion || '—'}</span></div>
        <div><span class="lib-stat-label">Última versión</span><span class="lib-stat-value">${game.latestVersion}</span></div>
      </div>
    </div>

    <section class="detail-section">
      <h3 class="section-title">DESCRIPCIÓN</h3>
      <p class="detail-desc">${game.description}</p>
    </section>

    <section class="detail-section">
      <h3 class="section-title">UPDATES DEL DESARROLLADOR</h3>
      ${libraryUpdatesSection(game)}
    </section>

    <section class="detail-section">
      <h3 class="section-title">DLC</h3>
      ${libraryDlcSection(game)}
    </section>

    <section class="detail-section">
      <h3 class="section-title">LOGROS</h3>
      ${libraryAchievementsSection(game)}
    </section>

    <section class="detail-section">
      <h3 class="section-title">REQUISITOS</h3>
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

    <section class="detail-section">
      <h3 class="section-title">RESEÑAS</h3>
      <div class="reviews-list">${renderReviewsList(game.reviews)}</div>
    </section>

    <section class="detail-section">
      <h3 class="section-title">COMUNIDAD</h3>
      ${renderCommunitySection(game)}
    </section>
  `;
}

function toggleLibraryFavorite(btn) {
  const gameId = btn.dataset.libFavoriteToggle;
  const current = libraryFavoriteOverrides.has(gameId)
    ? libraryFavoriteOverrides.get(gameId)
    : libraryCache?.find((g) => g.gameId === gameId)?.favorite;
  const next = !current;

  libraryFavoriteOverrides.set(gameId, next);

  btn.classList.toggle('wishlisted', next);
  btn.innerHTML = `<span class="wishlist-icon">${next ? '♥' : '♡'}</span> ${next ? 'En favoritos' : 'Agregar a favoritos'}`;
  showToast(next ? 'Agregado a favoritos' : 'Quitado de favoritos');
}
