// game-detail.js — página dedicada de un juego

// Timer del slideshow automático de screenshots (ver startGallerySlideshow).
// Vive acá porque es estado propio de esta vista; navigation.js lo detiene
// al salir de la ficha (activateView llama a stopGallerySlideshow si existe).
let galleryAutoTimer = null;

// Cuando el video del hero termina, la ficha pasa sola a mostrar las
// screenshots (deslizándose) y, al completar una vuelta completa a la
// galería, vuelve sola al video (también deslizándose). Este flag indica
// que ese "viaje de ida y vuelta" automático está en curso; se cancela apenas
// el usuario toca una miniatura a mano, para no interrumpirlo mientras mira.
let heroAutoReturnToVideo = false;

async function openGameDetail(id) {
  const game = await LowlootData.getGameById(id);

  if (!game) return;

  const activeNav = qs('.nav-item.active');

  if (activeNav) {
    lastMainView = activeNav.dataset.view;
  }

  await renderGameDetail(game);

  activateView('game', {
    selectNav: false
  });
}

/* ---------- Hero: video destacado + slideshow de screenshots ---------- */

function heroVideoHtml(game) {
  return `
    <video
      id="detail-hero-video"
      class="detail-preview-video"
      src="${game.previewVideoUrl}"
      controls
      autoplay
      muted
      playsinline
      preload="metadata"
      poster="${game.coverImageUrl || ''}">
    </video>
  `;
}

// Intenta reproducir el video del hero con audio a volumen bajo. Si el
// navegador/Electron bloquea el autoplay con sonido (política estándar),
// cae a autoplay muteado y deja el audio listo para activarse apenas el
// usuario interactúe una vez con la app (click o tecla), en cualquier parte.
function setupHeroVideoAudio() {
  const video = qs('#detail-hero-video');
  if (!video) return;

  const TARGET_VOLUME = 0.15;
  video.volume = TARGET_VOLUME;

  const tryUnmutedAutoplay = () => {
    video.muted = false;
    video.volume = TARGET_VOLUME;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });
  };

  tryUnmutedAutoplay();

  const unlockAudioOnInteraction = () => {
    if (!video.isConnected) return; // el usuario ya navegó a otra vista
    video.muted = false;
    video.volume = TARGET_VOLUME;
    video.play().catch(() => {});
  };

  document.addEventListener('click', unlockAudioOnInteraction, { once: true });
  document.addEventListener('keydown', unlockAudioOnInteraction, { once: true });
}

function stopGallerySlideshow() {
  heroAutoReturnToVideo = false;
  if (galleryAutoTimer) {
    clearInterval(galleryAutoTimer);
    galleryAutoTimer = null;
  }
}

// Desliza el contenido actual del hero hacia afuera, ejecuta renderFn
// (que reemplaza el innerHTML) y deja que vuelva a su lugar deslizándose
// desde el lado opuesto. direction='back' se usa cuando volvemos del final
// de la galería hacia el video (se desliza para el otro lado que al ir).
function transitionHeroSlide(renderFn, direction = 'forward') {
  const hero = qs('#detail-hero-image');
  if (!hero) {
    renderFn();
    return;
  }
  hero.classList.add(direction === 'back' ? 'hero-slide-out-back' : 'hero-slide-out');
  setTimeout(() => {
    renderFn();
    hero.classList.remove('hero-slide-out', 'hero-slide-out-back');
  }, 220);
}

// Las screenshots van pasando solas cada ~4.5s. Nunca interrumpe al video:
// si el hero está mostrando el <video>, este tick no hace nada. Si el ciclo
// llegó a completar una vuelta entera desde que el video terminó
// (heroAutoReturnToVideo), en vez de repetir la primera foto vuelve al video.
function startGallerySlideshow(game, galleryImages) {
  stopGallerySlideshow();
  if (galleryImages.length < 2) return;

  galleryAutoTimer = setInterval(() => {
    const hero = qs('#detail-hero-image');
    if (!hero) {
      stopGallerySlideshow();
      return;
    }
    if (hero.querySelector('video')) return;

    const activeThumb = qsa('.gallery-thumb[data-thumb]').find(
      (t) => t.classList.contains('active') && t.dataset.thumb !== 'video'
    );
    const currentIndex = activeThumb ? Number(activeThumb.dataset.thumb) : -1;
    const nextIndex = (currentIndex + 1) % galleryImages.length;

    if (nextIndex === 0 && heroAutoReturnToVideo && game.previewVideoUrl) {
      heroAutoReturnToVideo = false;
      stopGallerySlideshow();
      transitionHeroSlide(() => showGalleryVideo(game), 'back');
      return;
    }

    transitionHeroSlide(() => showGalleryImage(game, galleryImages, nextIndex));
  }, 4500);
}

function showGalleryImage(game, galleryImages, index) {
  const hero = qs('#detail-hero-image');
  const image = galleryImages[index];
  if (!hero || !image) return;

  // Pausar explícitamente antes de reemplazar: sacar un <video> del DOM
  // con innerHTML no lo detiene solo, puede seguir sonando de fondo.
  hero.querySelectorAll('video').forEach((v) => v.pause());

  hero.innerHTML = `<img class="detail-preview-image" src="${image}" alt="${game.name} - Captura ${index + 1}">`;

  qsa('.gallery-thumb').forEach((t) => t.classList.remove('active'));
  const targetThumb = qsa('.gallery-thumb[data-thumb]').find((t) => t.dataset.thumb === String(index));
  targetThumb?.classList.add('active');
}

function showGalleryVideo(game) {
  const hero = qs('#detail-hero-image');
  if (!hero || !game.previewVideoUrl) return;

  hero.querySelectorAll('video').forEach((v) => v.pause());
  hero.innerHTML = heroVideoHtml(game);

  qsa('.gallery-thumb').forEach((t) => t.classList.remove('active'));
  qs('.gallery-thumb-video')?.classList.add('active');

  setupHeroVideoAudio();
  bindHeroVideoEndedHandler(game);
}

// Al terminar el video una vez (ya no tiene loop), la ficha pasa sola a la
// galería de fotos deslizándose. Si no hay fotos, simplemente lo repite.
function bindHeroVideoEndedHandler(game) {
  const video = qs('#detail-hero-video');
  if (!video) return;

  video.addEventListener(
    'ended',
    () => {
      const galleryImages = game.images?.length ? game.images : game.coverImageUrl ? [game.coverImageUrl] : [];

      if (!galleryImages.length) {
        video.currentTime = 0;
        video.play().catch(() => {});
        return;
      }

      heroAutoReturnToVideo = true;
      transitionHeroSlide(() => showGalleryImage(game, galleryImages, 0));
      startGallerySlideshow(game, galleryImages);
    },
    { once: true }
  );
}

function cartActionButtonHtml(game) {
  const inCart = cart.has(game.id);
  return `
    <button type="button" class="btn-secondary ${inCart ? 'wishlisted' : ''}" data-cart-toggle="${game.id}">
      <span class="wishlist-icon">${inCart ? '✓' : '🛒'}</span> ${inCart ? 'En el carrito' : 'Agregar al carrito'}
    </button>
  `;
}

async function renderGameDetail(game) {
  const container = qs('#game-detail-content');

  // Si veníamos de otro juego con el video sonando, hay que pausarlo ANTES
  // de tirar el HTML viejo — reemplazar innerHTML no detiene solo el audio.
  container?.querySelectorAll('video').forEach((v) => v.pause());
  stopGallerySlideshow();

  const devInfos = await Promise.all(
    game.developers.map((name) =>
      LowlootData.getDeveloperInfo(name)
    )
  );

  const otherGames =
    await LowlootData.getGamesByDeveloper(
      game.developers[0],
      game.id
    );

  // /games es catálogo público: no sabe (ni debe saber) qué juegos son de
  // cada usuario. La pertenencia real sale de /library/me (user_games),
  // no de un campo hardcodeado en game-store.js.
  game.owned = currentUser
    ? Boolean(await LibraryData.getLibraryEntry(game.id))
    : false;

  const discounted =
    game.discount > 0
      ? Math.round(
          game.price *
            (1 - game.discount / 100)
        )
      : game.price;

  const isWishlisted = wishlist.has(String(game.id));

  const galleryImages = game.images?.length
    ? game.images
    : game.coverImageUrl
      ? [game.coverImageUrl]
      : [];

  const hasVideo = !!game.previewVideoUrl;

  const videoThumbHtml = hasVideo
    ? `
      <button
        type="button"
        class="gallery-thumb gallery-thumb-video active"
        data-thumb="video"
        style="background-image:url('${game.coverImageUrl || ''}');background-size:cover;background-position:center;"
        aria-label="Ver video">
        <span class="gallery-thumb-play">▶</span>
      </button>
    `
    : '';

  const imageThumbsHtml = galleryImages
    .map((image, i) => {
      return `
        <button
          type="button"
          class="gallery-thumb ${!hasVideo && i === 0 ? 'active' : ''}"
          data-thumb="${i}"
          style="
            background-image:url('${image}');
            background-size:contain;
            background-position:center;
            background-repeat:no-repeat;
            background-color:#050505;">
        </button>
      `;
    })
    .join('');

  const galleryThumbs = videoThumbHtml + imageThumbsHtml;

  let actionButton;

  if (game.owned) {
    actionButton = `
      <button
        type="button"
        class="btn-primary"
        data-buy-toggle="La ejecución del juego todavía no está disponible">
        JUGAR
      </button>
    `;
  } else if (game.isFree) {
    actionButton = `
      <button
        type="button"
        class="btn-primary"
        data-purchase-game="${game.id}">
        OBTENER
      </button>
    `;
  } else {
    actionButton = `
      <button
        type="button"
        class="btn-primary"
        data-purchase-game="${game.id}">
        COMPRAR · ${formatPrice(discounted)}
      </button>
    `;
  }

  const ownedBadge = game.owned
    ? `<span class="owned-badge">En tu biblioteca</span>`
    : '';

  const priceRow = game.owned
    ? ''
    : `
      <div class="detail-price-row">
        ${
          game.discount > 0
            ? `
              <span class="discount-badge">
                -${game.discount}%
              </span>

              <span class="price-old">
                ${formatPrice(game.price)}
              </span>
            `
            : ''
        }

        <span class="detail-price">
          ${
            game.isFree
              ? 'GRATIS'
              : formatPrice(discounted)
          }
        </span>
      </div>
    `;

  const editionsHtml = game.editions
    .map(
      (e) => `
        <div class="info-card">
          <h5>${e.name}</h5>
          <p>${e.includes}</p>

          <span class="info-card-price">
            ${
              e.price === 0
                ? 'GRATIS'
                : formatPrice(e.price)
            }
          </span>
        </div>
      `
    )
    .join('');

  const dlcHtml = game.dlc.length
    ? `
      <div class="info-card-row">
        ${game.dlc
          .map(
            (d) => `
              <div class="info-card">
                <h5>${d.name}</h5>

                <span class="info-card-price">
                  ${formatPrice(d.price)}
                </span>
              </div>
            `
          )
          .join('')}
      </div>
    `
    : `
      <p class="placeholder-text">
        Este juego todavía no tiene DLC disponible.
      </p>
    `;

  const modsHtml = game.mods.length
    ? `
      <ul class="simple-list">
        ${game.mods
          .map(
            (m) =>
              `<li>
                ${m.name}
                <span class="text-muted">
                  — por ${m.author}
                </span>
              </li>`
          )
          .join('')}
      </ul>
    `
    : `
      <p class="placeholder-text">
        Todavía no hay mods disponibles para este juego.
      </p>
    `;

  const requirementsHtml = `
    <div class="requirements-grid">

      <div class="requirements-col">
        <h5>Mínimos</h5>

        <ul class="req-list">
          <li>
            <span>SO</span>
            <span>${game.minReq.os}</span>
          </li>

          <li>
            <span>Procesador</span>
            <span>${game.minReq.cpu}</span>
          </li>

          <li>
            <span>Memoria</span>
            <span>${game.minReq.ram}</span>
          </li>

          <li>
            <span>Gráficos</span>
            <span>${game.minReq.gpu}</span>
          </li>

          <li>
            <span>Almacenamiento</span>
            <span>${game.minReq.storage}</span>
          </li>
        </ul>
      </div>

      <div class="requirements-col">
        <h5>Recomendados</h5>

        <ul class="req-list">
          <li>
            <span>SO</span>
            <span>${game.recReq.os}</span>
          </li>

          <li>
            <span>Procesador</span>
            <span>${game.recReq.cpu}</span>
          </li>

          <li>
            <span>Memoria</span>
            <span>${game.recReq.ram}</span>
          </li>

          <li>
            <span>Gráficos</span>
            <span>${game.recReq.gpu}</span>
          </li>

          <li>
            <span>Almacenamiento</span>
            <span>${game.recReq.storage}</span>
          </li>
        </ul>
      </div>

    </div>
  `;

  const ratingBreakdown = [5, 4, 3, 2, 1]
    .map((star) => {
      const count = game.reviews.filter(
        (r) =>
          Math.round(r.rating) === star
      ).length;

      const pct = game.reviews.length
        ? Math.round(
            (count /
              game.reviews.length) *
              100
          )
        : 0;

      return `
        <div class="rating-bar-row">
          <span>${star}★</span>

          <div class="rating-bar-track">
            <div
              class="rating-bar-fill"
              style="width:${pct}%">
            </div>
          </div>

          <span class="rating-bar-count">
            ${count}
          </span>
        </div>
      `;
    })
    .join('');

  const reviewLanguages = [
    ...new Set(
      game.reviews.map(
        (r) => r.language
      )
    )
  ];

  const reviewsControls = `
    <div class="reviews-controls">

      <select id="review-lang-filter">
        <option value="todos">
          Todos los idiomas
        </option>

        ${reviewLanguages
          .map(
            (l) =>
              `<option value="${l}">
                ${l}
              </option>`
          )
          .join('')}
      </select>

      <select id="review-rating-filter">
        <option value="0">
          Cualquier valoración
        </option>

        <option value="5">
          5 estrellas
        </option>

        <option value="4">
          4 estrellas o más
        </option>

        <option value="3">
          3 estrellas o más
        </option>
      </select>

      <select id="review-sort">
        <option value="recientes">
          Más recientes
        </option>

        <option value="valoracion-alta">
          Mejor valoradas
        </option>

        <option value="valoracion-baja">
          Peor valoradas
        </option>
      </select>

    </div>
  `;

  const otherGamesHtml = otherGames.length
    ? `
      <div class="store-row-track">
        ${otherGames
          .map(renderGameCard)
          .join('')}
      </div>
    `
    : `
      <p class="placeholder-text">
        No hay más juegos de esta desarrolladora todavía.
      </p>
    `;

  container.innerHTML = `
    <button
      type="button"
      class="back-btn"
      data-back-to="main-nav">

      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round">

        <line
          x1="19"
          y1="12"
          x2="5"
          y2="12">
        </line>

        <polyline
          points="12 19 5 12 12 5">
        </polyline>

      </svg>

      Volver
    </button>

    <div class="detail-gallery">

      <div
        class="detail-hero"
        id="detail-hero-image">

        ${
          hasVideo
            ? heroVideoHtml(game)
            : game.coverImageUrl
              ? `
                <img
                  class="detail-preview-image"
                  src="${game.coverImageUrl}"
                  alt="${game.name}">
              `
              : ''
        }

      </div>

      <div class="gallery-thumbs">
        ${galleryThumbs}
      </div>

    </div>

    <div class="detail-header">

      <span class="game-tag">
        ${game.tags.join(' · ')}
      </span>

      <h1 class="detail-name">
        ${game.name}
      </h1>

      <div class="detail-meta-row">

        <span class="game-rating">
          ★ ${game.rating.toFixed(1)}

          <span class="text-muted">
            (${game.reviewsCount} reseñas)
          </span>
        </span>

        <span class="detail-developer">
          por ${game.developers.join(' y ')}
        </span>

      </div>

      ${ownedBadge}

      ${priceRow}

      <div class="detail-actions">
        ${actionButton}
        ${game.owned ? '' : cartActionButtonHtml(game)}

        ${
          game.owned
            ? ''
            : `
        <button
          type="button"
          class="btn-secondary ${
            isWishlisted
              ? 'wishlisted'
              : ''
          }"
          data-wishlist-toggle="${game.id}">

          <span class="wishlist-icon">
            ${isWishlisted ? '♥' : '♡'}
          </span>

          ${
            isWishlisted
              ? 'En tu wishlist'
              : 'Agregar a wishlist'
          }

        </button>
        `
        }
      </div>

    </div>

    <section class="detail-section">
      <h3 class="section-title">
        DESCRIPCIÓN
      </h3>

      <p class="detail-desc">
        ${game.description}
      </p>
    </section>

    <section class="detail-section">
      <h3 class="section-title">
        CARACTERÍSTICAS
      </h3>

      <ul class="chip-list">
        ${game.features
          .map(
            (f) =>
              `<li class="chip">${f}</li>`
          )
          .join('')}
      </ul>
    </section>

    <section class="detail-section">
      <h3 class="section-title">
        DESARROLLADORA
      </h3>

      <div class="developer-list">

        ${game.developers
          .map(
            (name, i) => `
              <div class="developer-item">

                <h4 class="developer-name">
                  ${name}

                  ${
                    devInfos[i].founded
                      ? `
                        <span class="text-muted">
                          · desde ${devInfos[i].founded}
                        </span>
                      `
                      : ''
                  }
                </h4>

                <p class="detail-desc">
                  ${devInfos[i].blurb}
                </p>

              </div>
            `
          )
          .join('')}

      </div>
    </section>

    <section class="detail-section detail-section-inline">

      <div>
        <h3 class="section-title">
          FECHA DE LANZAMIENTO
        </h3>

        <p class="detail-desc">
          ${formatDate(game.releaseDate)}
        </p>
      </div>

      <div>
        <h3 class="section-title">
          IDIOMAS
        </h3>

        <p class="detail-desc">
          ${game.languages.join(', ')}
        </p>
      </div>

    </section>

    <section class="detail-section">

      <h3 class="section-title">
        VERSIONES DISPONIBLES
      </h3>

      <div class="info-card-row">
        ${editionsHtml}
      </div>

    </section>

    <section class="detail-section">

      <h3 class="section-title">
        DLC
      </h3>

      ${dlcHtml}

    </section>

    <section class="detail-section">

      <h3 class="section-title">
        REQUISITOS
      </h3>

      ${requirementsHtml}

    </section>

    <section class="detail-section">

      <h3 class="section-title">
        MODS
      </h3>

      ${modsHtml}

    </section>

    <section class="detail-section">

      <h3 class="section-title">
        VALORACIONES Y RESEÑAS
      </h3>

      <div class="reviews-summary">

        <div class="reviews-average">

          <span class="reviews-average-number">
            ${game.rating.toFixed(1)}
          </span>

          <span class="game-rating">
            ★ de 5
          </span>

          <span class="text-muted">
            ${game.reviewsCount} reseñas totales
          </span>

        </div>

        <div class="rating-breakdown">
          ${ratingBreakdown}
        </div>

      </div>

      ${reviewsControls}

      <div
        class="reviews-list"
        id="reviews-list">

        ${renderReviewsList(game.reviews)}

      </div>

    </section>

    <section class="detail-section">

      <h3 class="section-title">
        MÁS DE ${game.developers[0].toUpperCase()}
      </h3>

      ${otherGamesHtml}

    </section>
  `;

  currentDetailReviews = game.reviews;

  heroAutoReturnToVideo = false;
  if (hasVideo) {
    setupHeroVideoAudio();
    bindHeroVideoEndedHandler(game);
  }

  qsa('.gallery-thumb').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      // El usuario está navegando la galería a mano: cancelar cualquier
      // "vuelta automática al video" que hubiera quedado pendiente.
      heroAutoReturnToVideo = false;

      if (thumb.dataset.thumb === 'video') {
        transitionHeroSlide(() => showGalleryVideo(game), 'back');
      } else {
        transitionHeroSlide(() => showGalleryImage(game, galleryImages, Number(thumb.dataset.thumb)));
      }
      startGallerySlideshow(game, galleryImages);
    });
  });

  startGallerySlideshow(game, galleryImages);
}

function applyReviewFilters() {
  const langEl = qs(
    '#review-lang-filter'
  );

  const ratingEl = qs(
    '#review-rating-filter'
  );

  const sortEl = qs(
    '#review-sort'
  );

  if (
    !langEl ||
    !ratingEl ||
    !sortEl
  ) {
    return;
  }

  const lang = langEl.value;
  const minRating =
    parseFloat(ratingEl.value);

  const sort = sortEl.value;

  let list = [
    ...currentDetailReviews
  ];

  if (lang !== 'todos') {
    list = list.filter(
      (r) => r.language === lang
    );
  }

  if (minRating) {
    list = list.filter(
      (r) => r.rating >= minRating
    );
  }

  if (sort === 'valoracion-alta') {
    list.sort(
      (a, b) =>
        b.rating - a.rating
    );
  } else if (
    sort === 'valoracion-baja'
  ) {
    list.sort(
      (a, b) =>
        a.rating - b.rating
    );
  } else {
    list.sort(
      (a, b) =>
        new Date(b.date) -
        new Date(a.date)
    );
  }

  const listEl = qs(
    '#reviews-list'
  );

  if (listEl) {
    listEl.innerHTML =
      renderReviewsList(list);
  }
}

async function toggleWishlist(btn) {
  const id = btn.dataset.wishlistToggle;
  if (!requireLogin('Iniciá sesión para usar tu wishlist')) return;

  const added = !wishlist.has(String(id));

  // Optimista: se refleja en el botón al toque, y se revierte si el
  // servidor rechaza el cambio (sesión vencida, juego inexistente, etc.).
  btn.disabled = true;
  try {
    if (added) {
      await LowlootAPI.addToWishlist(id);
      wishlist.set(String(id), new Date().toISOString());
    } else {
      await LowlootAPI.removeFromWishlist(id);
      wishlist.delete(String(id));
    }
  } catch (err) {
    showToast(err.message || 'No se pudo actualizar tu wishlist');
    btn.disabled = false;
    return;
  }
  btn.disabled = false;

  btn.classList.toggle('wishlisted', added);

  btn.innerHTML = `
    <span class="wishlist-icon">
      ${added ? '♥' : '♡'}
    </span>

    ${added ? 'En tu wishlist' : 'Agregar a wishlist'}
  `;

  showToast(added ? 'Agregado a tu wishlist' : 'Quitado de tu wishlist');

  if (qs('.view[data-view="wishlist"]')?.classList.contains('active') && typeof renderWishlistView === 'function') {
    renderWishlistView();
  }
}