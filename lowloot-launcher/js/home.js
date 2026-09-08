// home.js — vista de Inicio: carrusel de noticias, "más jugado ahora" y "en tendencia".
// Depende de LowlootData (data.js), helpers.js, state.js y components.js.

/* ---------- Inicio ---------- */

async function renderHome() {
  await renderNewsCarousel();

  const topPlayed = await LowlootData.getMostPlayedGame();
  const trending = await LowlootData.getTrendingGames();

  const topPlayedSlot = qs('#top-played-slot');
  const trendingSlot = qs('#trending-slot');

  if (topPlayed) {
    // Reutiliza el mismo mecanismo de video de las tarjetas normales
    // (.game-card-video + data-preview-card), así el hover-preview de
    // app.js (initHoverPreviews) funciona acá sin código nuevo.
    const hasPreview = !!topPlayed.previewVideoUrl;
    topPlayedSlot.innerHTML = `
      <div class="featured-card" data-game-id="${topPlayed.id}"${hasPreview ? ' data-preview-card' : ''}>
        <div class="featured-media">
          <div class="featured-image ${gameCoverClass(topPlayed)}" ${gameCoverStyle(topPlayed)} aria-hidden="true"></div>
          ${hasPreview ? `<video class="game-card-video" muted loop playsinline preload="none" data-preview-src="${escapeHtml(topPlayed.previewVideoUrl)}"></video>` : ''}
        </div>
        <div class="featured-info">
          <h3 class="featured-name">${topPlayed.name}</h3>
          <p class="featured-desc">${topPlayed.shortDesc}</p>
          <span class="top-played-count">${topPlayed.plays.toLocaleString('es-AR')} jugadores ahora</span>
          <button type="button" class="btn-primary featured-cta" data-game-id="${topPlayed.id}">VER JUEGO</button>
        </div>
      </div>
    `;
  } else {
    topPlayedSlot.innerHTML = `<p class="placeholder-text">Todavía no hay juegos cargados. Verificá que la API esté corriendo en http://localhost:8080.</p>`;
  }

  trendingSlot.innerHTML = trending.length
    ? trending.map(renderGameCard).join('')
    : `<p class="placeholder-text">Todavía no hay juegos para mostrar.</p>`;
}

/* ---------- Carrusel de noticias ---------- */

async function renderNewsCarousel() {
  newsList = await LowlootData.getNews();
  newsIndex = 0;
  updateNewsCarousel();
}

function updateNewsCarousel() {
  const slot = qs('#news-slot');
  if (!slot) return;

  if (!newsList.length) {
    slot.innerHTML = `<p class="placeholder-text">Todavía no hay noticias para mostrar.</p>`;
    return;
  }

  const len = newsList.length;
  const prev = newsList[(newsIndex - 1 + len) % len];
  const current = newsList[newsIndex];
  const next = newsList[(newsIndex + 1) % len];

  slot.innerHTML = `
    <div class="news-carousel-wrap">
      <div class="news-carousel">
        <button type="button" class="news-arrow" data-news-nav="prev" aria-label="Noticia anterior">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>

        <button type="button" class="news-card news-card-side" data-news-nav="prev">
          <div class="news-thumb ${prev.gradient}" aria-hidden="true"></div>
          <span class="news-side-title">${prev.title}</span>
        </button>

        <div class="news-card news-card-main">
          <div class="news-thumb news-thumb-main ${current.gradient}" aria-hidden="true"></div>
          <div class="news-main-info">
            <span class="news-date">${formatDate(current.date)}</span>
            <h3 class="news-title">${current.title}</h3>
            <p class="news-summary">${current.summary}</p>
          </div>
        </div>

        <button type="button" class="news-card news-card-side" data-news-nav="next">
          <div class="news-thumb ${next.gradient}" aria-hidden="true"></div>
          <span class="news-side-title">${next.title}</span>
        </button>

        <button type="button" class="news-arrow" data-news-nav="next" aria-label="Noticia siguiente">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>

      <div class="news-dots">
        ${newsList.map((n, i) => `<span class="news-dot ${i === newsIndex ? 'active' : ''}"></span>`).join('')}
      </div>
    </div>
  `;
}

function navigateNews(direction) {
  if (!newsList.length) return;
  const len = newsList.length;
  newsIndex = direction === 'prev' ? (newsIndex - 1 + len) % len : (newsIndex + 1) % len;
  updateNewsCarousel();
}