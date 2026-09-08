// components.js — piezas de UI reutilizables entre Inicio, Tienda, Wishlist y las
// páginas de detalle: tarjetas de juego/pack, filas de resultado, precios y badges.
// Depende de helpers.js.

/* ---------- Tarjetas reutilizables ---------- */

// Muestra la portada real del juego si /games mandó coverImageUrl; si no,
// cae al degradado de color de siempre (mismo mecanismo que ya existía,
// ahora es el respaldo en vez de ser el dato principal).
function gameCoverClass(game) {
  return game.coverImageUrl ? '' : game.gradient || 'gradient-a';
}

// "contain" en vez de "cover": muchas portadas son pósters verticales y,
// dentro de contenedores 16:9, "cover" las recortaba (cabezas/pies afuera
// del marco). Con "contain" se ve la imagen COMPLETA siempre, sin deformar,
// rellenando el sobrante con un fondo oscuro (letterbox) en vez de recortar.
function gameCoverStyle(game) {
  return game.coverImageUrl
    ? `style="background-image:url('${escapeHtml(game.coverImageUrl)}');background-size:contain;background-position:center;background-repeat:no-repeat;background-color:#050505;"`
    : '';
}

function priceMarkup(game) {
  if (game.isFree) return `<span class="game-price price-free">GRATIS</span>`;
  if (game.discount > 0) {
    const discounted = Math.round(game.price * (1 - game.discount / 100));
    return `<span class="game-price has-discount"><span class="price-old">${formatPrice(game.price)}</span><span class="price-new">${formatPrice(discounted)}</span></span>`;
  }
  return `<span class="game-price">${formatPrice(game.price)}</span>`;
}

function discountBadge(game) {
  return game.discount > 0 ? `<span class="discount-badge">-${game.discount}%</span>` : '';
}

// Video de preview (hover tipo Steam) que se superpone a la portada dentro
// de la misma tarjeta. Se renderiza pausado/oculto; app.js lo reproduce al
// pasar el mouse (ver initHoverPreviews) y lo pausa al salir. Siempre arranca
// muteado para no disparar sonido inesperado. Se reutiliza tal cual en la
// tarjeta de "Más jugado ahora" (home.js), que comparte el mismo marcado.
function gameCardPreviewVideo(game) {
  if (!game.previewVideoUrl) return '';
  return `<video class="game-card-video" muted loop playsinline preload="none" data-preview-src="${escapeHtml(game.previewVideoUrl)}"></video>`;
}

function renderGameCard(game) {
  const hasPreview = !!game.previewVideoUrl;
  return `
    <article class="game-card" data-game-id="${game.id}"${hasPreview ? ' data-preview-card' : ''}>
      <div class="game-card-media">
        <div class="game-image ${gameCoverClass(game)}" ${gameCoverStyle(game)} aria-hidden="true"></div>
        ${gameCardPreviewVideo(game)}
        ${discountBadge(game)}
      </div>
      <div class="game-info">
        <h4 class="game-name">${game.name}</h4>
        <span class="game-genre">${game.genre}</span>
        <div class="game-meta-row">
          <span class="game-rating">★ ${game.rating.toFixed(1)}</span>
          ${priceMarkup(game)}
        </div>
      </div>
    </article>
  `;
}

function renderResultRow(game) {
  return `
    <article class="result-row" data-game-id="${game.id}">
      <div class="result-thumb ${gameCoverClass(game)}" ${gameCoverStyle(game)} aria-hidden="true"></div>
      <div class="result-info">
        <h4 class="result-name">${game.name}</h4>
        <span class="result-genre">${game.genre}</span>
      </div>
      <span class="result-rating">★ ${game.rating.toFixed(1)}</span>
      <div class="result-price">${discountBadge(game)}${priceMarkup(game)}</div>
    </article>
  `;
}

function packSavings(pack, games) {
  const individualTotal = games.reduce((sum, g) => sum + (g.isFree ? 0 : g.price), 0);
  const savings = individualTotal - pack.packPrice;
  const pct = individualTotal > 0 ? Math.round((savings / individualTotal) * 100) : 0;
  return { individualTotal, savings, pct };
}

function renderPackCard(pack, games) {
  const { individualTotal, savings, pct } = packSavings(pack, games);
  return `
    <article class="pack-card" data-pack-id="${pack.id}">
      <div class="pack-card-media">
        <div class="pack-thumb ${games[0] ? gameCoverClass(games[0]) : ''}" ${games[0] ? gameCoverStyle(games[0]) : ''} aria-hidden="true"></div>
        <div class="pack-thumb pack-thumb-secondary ${games[1] ? gameCoverClass(games[1]) : ''}" ${games[1] ? gameCoverStyle(games[1]) : ''} aria-hidden="true"></div>
        <span class="pack-count-badge">${games.length} juegos</span>
      </div>
      <div class="game-info">
        <h4 class="game-name">${pack.name}</h4>
        <span class="game-genre">${games.map((g) => g.name).join(' + ')}</span>
        <div class="game-meta-row">
          <span class="price-old">${formatPrice(individualTotal)}</span>
          <span class="price-new">${formatPrice(pack.packPrice)}</span>
        </div>
        <span class="pack-savings">Ahorrás ${formatPrice(savings)} (${pct}%)</span>
      </div>
    </article>
  `;
}

/* ---------- Reseñas (reutilizado por la ficha de Tienda y de Biblioteca) ---------- */

function renderReviewsList(reviews) {
  if (!reviews.length) return `<p class="placeholder-text">Todavía no hay reseñas para este juego.</p>`;
  return reviews
    .map(
      (r) => `
    <article class="review-item">
      <div class="review-header">
        <span class="review-avatar" aria-hidden="true"></span>
        <div>
          <span class="review-user">${escapeHtml(r.user)}</span>
          <span class="review-meta">★ ${r.rating} · ${r.language} · ${formatDate(r.date)}</span>
        </div>
      </div>
      <p class="review-text">${escapeHtml(r.text)}</p>
    </article>
  `
    )
    .join('');
}