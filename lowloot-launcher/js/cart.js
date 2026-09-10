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
      ({ game }) => `
    <div class="cart-row" data-game-id="${game.id}">
      <div class="result-thumb ${gameCoverClass(game)}" ${gameCoverStyle(game)} aria-hidden="true"></div>
      <div class="result-info">
        <h4 class="result-name">${game.name}</h4>
        <span class="result-genre">${game.genre}</span>
      </div>
      <div class="result-price">${formatPrice(cartLineTotal(game, 1))}</div>
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
  let items = gameIds
    .map((id) => allGames.find((g) => String(g.id) === String(id)))
    .filter(Boolean);
  if (!items.length) return false;

  // No tiene sentido intentar comprar algo que ya es de la biblioteca: se
  // avisa y se sigue solo con lo que falta, en vez de dejar que el backend
  // rechace toda la operación (atómica: si un solo id ya es del usuario,
  // hoy el servidor cancela la compra completa).
  const ownedChecks = await Promise.all(items.map((g) => LibraryData.getLibraryEntry(g.id)));
  const alreadyOwned = items.filter((_, i) => ownedChecks[i]);
  if (alreadyOwned.length) {
    showToast(
      alreadyOwned.length === 1
        ? `Ya tenés "${alreadyOwned[0].name}" en tu biblioteca`
        : `Ya tenés en tu biblioteca: ${alreadyOwned.map((g) => g.name).join(', ')}`
    );
    items = items.filter((_, i) => !ownedChecks[i]);
    if (!items.length) return false;
  }

  const total = items.reduce((sum, g) => sum + cartLineTotal(g, 1), 0);
  const balance = Number(currentUser.balance) || 0;
  const names = items.map((g) => g.name).join(', ');

  const confirmed = window.confirm(
    total > 0
      ? `Vas a gastar ${formatPrice(total)} de tu saldo (disponible: ${formatPrice(balance)}) en: ${names}. ¿Confirmás la compra?`
      : `Vas a agregar a tu biblioteca (gratis): ${names}. ¿Confirmás?`
  );
  if (!confirmed) return false;

  try {
    const response = await LowlootAPI.purchase(items.map((g) => Number(g.id)));

    currentUser.balance = response.newBalance;
    if (typeof renderTopbarSession === 'function') renderTopbarSession();
    if (typeof invalidateLibraryCache === 'function') invalidateLibraryCache();

    // El backend ya sacó estos juegos de la wishlist si estaban ahí (no
    // tiene sentido seguir "deseando" algo que ya es tuyo); se refleja acá
    // al toque, sin esperar a la próxima vez que se abra la wishlist.
    let wishlistChanged = false;
    response.purchasedGameIds.forEach((id) => {
      if (wishlist.delete(String(id))) wishlistChanged = true;
    });

    if (fromCart) {
      gameIds.forEach((id) => cart.delete(String(id)));
      renderCartBadge();
    }

    if (qs('.view[data-view="biblioteca"]')?.classList.contains('active') && typeof renderLibraryHome === 'function') {
      renderLibraryHome();
    }
    if (wishlistChanged && qs('.view[data-view="wishlist"]')?.classList.contains('active') && typeof renderWishlistView === 'function') {
      renderWishlistView();
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
