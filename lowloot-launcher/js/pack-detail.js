// pack-detail.js — página dedicada de un pack (juegos incluidos y ahorro).
// Depende de LowlootData, helpers.js, state.js y navigation.js.

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
      <div class="result-thumb ${gameCoverClass(g)}" ${gameCoverStyle(g)} aria-hidden="true"></div>
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
