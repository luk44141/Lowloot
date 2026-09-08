// cart.js — Carrito de compras del usuario (frontend-only, sin backend de pagos
// todavía). Agregar/quitar/ajustar cantidades es completamente funcional en
// memoria (Map en state.js), igual que wishlist.js. "Finalizar compra"
// reutiliza el mismo patrón de toast que ya usan los botones COMPRAR/JUGAR
// en el resto de la app (data-buy-toggle), ya que no hay pagos reales todavía.
// Depende de LowlootData, helpers.js, state.js y components.js.

function cartTotalCount() {
  let total = 0;
  cart.forEach((qty) => (total += qty));
  return total;
}

function cartLineTotal(game, qty) {
  const unit = game.isFree
    ? 0
    : game.discount > 0
      ? Math.round(game.price * (1 - game.discount / 100))
      : game.price;
  return unit * qty;
}

function renderCartBadge() {
  const badge = document.getElementById('cart-nav-badge');
  if (!badge) return;

  const count = cartTotalCount();
  if (count > 0) {
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

// Botón "Agregar al carrito" de la ficha de juego (game-detail.js).
function toggleCartFromDetail(btn) {
  const id = btn.dataset.cartToggle;
  const added = !cart.has(id);

  if (added) cart.set(id, 1);
  else cart.delete(id);

  btn.classList.toggle('wishlisted', added);
  btn.innerHTML = `<span class="wishlist-icon">${added ? '✓' : '🛒'}</span> ${added ? 'En el carrito' : 'Agregar al carrito'}`;

  showToast(added ? 'Agregado al carrito' : 'Quitado del carrito');
  renderCartBadge();

  if (qs('.view[data-view="carrito"]')?.classList.contains('active')) renderCartView();
}

function changeCartQty(gameId, delta) {
  const current = cart.get(gameId) || 0;
  const next = current + delta;

  if (next <= 0) cart.delete(gameId);
  else cart.set(gameId, next);

  renderCartBadge();
  renderCartView();
}

function removeFromCart(gameId) {
  cart.delete(gameId);
  renderCartBadge();
  renderCartView();
  showToast('Quitado del carrito');
}

async function renderCartView() {
  const container = qs('#cart-content');
  if (!container) return;

  if (!cart.size) {
    container.innerHTML = `
      <h2 class="section-title">CARRITO</h2>
      <p class="placeholder-text">Todavía no agregaste juegos al carrito. Entrá a un juego y tocá "Agregar al carrito".</p>
    `;
    return;
  }

  const allGames = await LowlootData.getAllGames();
  const entries = [...cart.entries()]
    .map(([id, qty]) => ({ game: allGames.find((g) => g.id === id), qty }))
    .filter((e) => e.game);

  const subtotal = entries.reduce((sum, e) => sum + cartLineTotal(e.game, e.qty), 0);
  const totalCount = cartTotalCount();

  const rows = entries
    .map(
      ({ game, qty }) => `
    <div class="cart-row" data-game-id="${game.id}">
      <div class="result-thumb ${gameCoverClass(game)}" ${gameCoverStyle(game)} aria-hidden="true"></div>
      <div class="result-info">
        <h4 class="result-name">${game.name}</h4>
        <span class="result-genre">${game.genre}</span>
      </div>
      <div class="cart-qty">
        <button type="button" class="cart-qty-btn" data-cart-qty-decrease="${game.id}" aria-label="Restar">−</button>
        <span class="cart-qty-value">${qty}</span>
        <button type="button" class="cart-qty-btn" data-cart-qty-increase="${game.id}" aria-label="Sumar">+</button>
      </div>
      <div class="result-price">${formatPrice(cartLineTotal(game, qty))}</div>
      <button type="button" class="btn-secondary cart-remove-btn" data-cart-remove="${game.id}">Quitar</button>
    </div>
  `
    )
    .join('');

  container.innerHTML = `
    <h2 class="section-title">CARRITO</h2>
    <div class="cart-list">${rows}</div>
    <div class="cart-summary">
      <div class="cart-summary-row"><span>Subtotal (${totalCount} juego${totalCount === 1 ? '' : 's'})</span><span class="detail-price">${formatPrice(subtotal)}</span></div>
      <button type="button" class="btn-primary cart-checkout-btn" data-buy-toggle="Los pagos todavía no están disponibles">FINALIZAR COMPRA</button>
    </div>
  `;
}