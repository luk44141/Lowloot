// wishlist.js — vista de Wishlist del usuario, contra /wishlist/me real
// (PostgreSQL). El Map `wishlist` en memoria (state.js) es una caché
// sincronizada por session.js/game-detail.js, no la fuente de verdad.
// Depende de LowlootData, helpers.js, state.js y components.js.

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
    .map(([id, addedDate]) => ({ game: allGames.find((g) => String(g.id) === String(id)), addedDate }))
    .filter((e) => e.game)
    .sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));

  const rows = entries
    .map(
      ({ game, addedDate }) => `
    <div class="wishlist-row" data-game-id="${game.id}">
      <div class="result-thumb ${gameCoverClass(game)}" ${gameCoverStyle(game)} aria-hidden="true"></div>
      <div class="result-info">
        <h4 class="result-name">${game.name}</h4>
        <span class="result-genre">${game.genre}</span>
      </div>
      <div class="wishlist-meta">
        <span>Agregado el ${formatDate(String(addedDate).slice(0, 10))}</span>
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
