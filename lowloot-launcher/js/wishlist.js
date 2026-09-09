// wishlist.js — vista de Wishlist del usuario (juegos agregados, sin backend todavía).
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

  // Se pide fresco (no el cache liviano de session.js, que solo guarda la
  // fecha) para tener la hora exacta y cuánta gente más lo tiene en su
  // wishlist, tal como se pidió.
  let items;
  try {
    items = await LowlootAPI.getWishlist();
  } catch (err) {
    container.innerHTML = `
      <h2 class="section-title">WISHLIST</h2>
      <p class="placeholder-text">${err.message || 'No se pudo cargar tu wishlist'}</p>
    `;
    return;
  }

  // /wishlist/me manda coverImageUrl "crudo" (ruta relativa); el catálogo
  // normalizado (LowlootData) ya la resuelve a URL absoluta + gradiente de
  // respaldo, así que se pisa acá en vez de duplicar esa lógica.
  const allGames = await LowlootData.getAllGames();
  const byId = new Map(allGames.map((g) => [String(g.id), g]));
  items = items.map((item) => {
    const catalogGame = byId.get(String(item.gameId));
    return catalogGame ? { ...item, coverImageUrl: catalogGame.coverImageUrl, gradient: catalogGame.gradient, isFree: catalogGame.isFree } : item;
  });

  const rows = items
    .map(
      (item) => `
    <div class="wishlist-row" data-game-id="${item.gameId}">
      <div class="result-thumb ${gameCoverClass(item)}" ${gameCoverStyle(item)} aria-hidden="true"></div>
      <div class="result-info">
        <h4 class="result-name">${item.name}</h4>
        <span class="result-genre">${item.genre}</span>
      </div>
      <div class="wishlist-meta">
        <span>Agregado el ${formatDateTime(item.addedAt)}</span>
        <span>${formatWishlistCount(item.wishlistCount)}</span>
      </div>
      <div class="result-price">${discountBadge(item)}${priceMarkup(item)}</div>
      <button type="button" class="btn-secondary wishlist-remove-btn" data-wishlist-remove="${item.gameId}">Quitar</button>
    </div>
  `
    )
    .join('');

  container.innerHTML = `
    <h2 class="section-title">WISHLIST</h2>
    <div class="wishlist-list">${rows}</div>
  `;
}

function formatWishlistCount(count) {
  const n = Number(count) || 0;
  if (n <= 1) return 'Solo vos lo tenés en tu wishlist';
  return `${n.toLocaleString('es-AR')} personas lo tienen en su wishlist`;
}
