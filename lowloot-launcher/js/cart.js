// cart.js — Carrito de compras del usuario. Agregar/quitar/ajustar
// cantidades es solo en memoria (Map en state.js, igual que wishlist.js:
// no hay una tabla "cart" en la base, no se pidió persistirlo). "Finalizar
// compra" sí es real: llama a POST /purchases, que hace la compra atómica
// completa contra PostgreSQL (valida, descuenta saldo, agrega a
// user_games, todo o nada). También la usa el botón COMPRAR/OBTENER de la
// ficha de juego (game-detail.js), para 1 solo juego.
// Depende de LowlootData, LowlootAPI, session.js, helpers.js, state.js y components.js.

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

  // No tiene sentido tenerlo en el carrito Y en la wishlist a la vez: si
  // lo estás comprando, lo sacamos de "quiero esto" automáticamente.
  if (added && wishlist.has(String(id))) {
    wishlist.delete(String(id));
    LowlootAPI.removeFromWishlist(id).catch(() => {});
    if (qs('.view[data-view="wishlist"]')?.classList.contains('active')) renderWishlistView();
  }

  if (added) cart.set(id, 1);
  else cart.delete(id);

  btn.classList.toggle('wishlisted', added);
  btn.innerHTML = `<span class="wishlist-icon">${added ? '✓' : '🛒'}</span> ${added ? 'En el carrito' : 'Agregar al carrito'}`;

  showToast(added ? 'Agregado al carrito' : 'Quitado del carrito');
  renderCartBadge();

  if (qs('.view[data-view="carrito"]')?.classList.contains('active')) renderCartView();
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
    .map(([id, qty]) => ({ game: allGames.find((g) => String(g.id) === String(id)), qty }))
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
      <button type="button" class="btn-primary cart-checkout-btn" data-cart-checkout>FINALIZAR COMPRA</button>
    </div>
  `;
}
/* ---------- Compra real (atómica contra PostgreSQL vía /purchases) ---------- */

// Confirma con el usuario cuánto saldo se va a gastar, hace la compra
// atómica (1 juego o varios) y actualiza saldo/carrito/biblioteca en caso
// de éxito. Devuelve true/false según el resultado, para que quien llama
// sepa si tiene que refrescar su propia vista.
async function purchaseGames(gameIds, { fromCart = false } = {}) {
  if (!requireLogin('Iniciá sesión para comprar')) return false;
  if (!gameIds.length) return false;

  const allGames = await LowlootData.getAllGames();
  const items = gameIds
    .map((id) => allGames.find((g) => String(g.id) === String(id)))
    .filter(Boolean);
  if (!items.length) return false;

  const total = items.reduce((sum, g) => sum + cartLineTotal(g, 1), 0);
  const balance = Number(currentUser.balance) || 0;
  const names = items.map((g) => g.name).join(', ');

  const confirmed = await showConfirmModal({
    title: total > 0 ? 'Confirmar compra' : 'Agregar a tu biblioteca',
    message:
      total > 0
        ? `Vas a gastar <strong>${formatPrice(total)}</strong> de tu saldo (disponible: <strong>${formatPrice(balance)}</strong>) en:<br>${escapeHtml(names)}.`
        : `Vas a agregar a tu biblioteca (gratis):<br>${escapeHtml(names)}.`,
    confirmLabel: total > 0 ? 'Confirmar compra' : 'Agregar',
  });
  if (!confirmed) return false;

  try {
    const response = await LowlootAPI.purchase(items.map((g) => Number(g.id)));

    currentUser.balance = response.newBalance;
    if (typeof renderTopbarSession === 'function') renderTopbarSession();
    if (typeof invalidateLibraryCache === 'function') invalidateLibraryCache();

    if (fromCart) {
      gameIds.forEach((id) => cart.delete(String(id)));
      renderCartBadge();
    }

    showToast(
      items.length > 1
        ? 'Compra realizada: ya están en tu biblioteca'
        : `${items[0].name} se agregó a tu biblioteca`
    );
    return true;
  } catch (err) {
    if (err.status === 402) {
      showToast('Saldo insuficiente');
    } else {
      showToast(err.message || 'No se pudo completar la compra');
    }
    return false;
  }
}

// Botón COMPRAR/OBTENER de la ficha de un juego (data-purchase-game).
async function purchaseGame(gameId) {
  const success = await purchaseGames([gameId]);
  if (success) await openGameDetail(gameId); // refresca el botón a JUGAR / "En tu biblioteca"
}

// Botón FINALIZAR COMPRA del carrito (data-cart-checkout).
async function checkoutCart() {
  if (!cart.size) return;
  const gameIds = [...cart.keys()];
  const success = await purchaseGames(gameIds, { fromCart: true });
  if (success) renderCartView();
}
