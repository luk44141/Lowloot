// app.js — arranque de la aplicación: delegación central de eventos (todo el contenido
// dinámico se genera con innerHTML, así que se escuchan los clics/cambios desde acá)
// y el bootstrap en DOMContentLoaded. Se carga último porque referencia funciones
// definidas en el resto de los archivos.

/* ---------- Delegación de eventos (contenido dinámico) ---------- */

function initDelegatedHandlers() {
  document.body.addEventListener('click', (event) => {
    const newsNav = event.target.closest('[data-news-nav]');
    if (newsNav) {
      navigateNews(newsNav.dataset.newsNav);
      return;
    }

    const wishlistRemoveBtn = event.target.closest('[data-wishlist-remove]');
    if (wishlistRemoveBtn) {
      wishlist.delete(wishlistRemoveBtn.dataset.wishlistRemove);
      renderWishlistView();
      showToast('Quitado de tu wishlist');
      return;
    }

    const wishlistBtn = event.target.closest('[data-wishlist-toggle]');
    if (wishlistBtn) {
      toggleWishlist(wishlistBtn);
      return;
    }

    // ---- Carrito ----

    const cartToggleBtn = event.target.closest('[data-cart-toggle]');
    if (cartToggleBtn) {
      toggleCartFromDetail(cartToggleBtn);
      return;
    }

    const cartRemoveBtn = event.target.closest('[data-cart-remove]');
    if (cartRemoveBtn) {
      removeFromCart(cartRemoveBtn.dataset.cartRemove);
      return;
    }

    const cartQtyDecreaseBtn = event.target.closest('[data-cart-qty-decrease]');
    if (cartQtyDecreaseBtn) {
      changeCartQty(cartQtyDecreaseBtn.dataset.cartQtyDecrease, -1);
      return;
    }

    const cartQtyIncreaseBtn = event.target.closest('[data-cart-qty-increase]');
    if (cartQtyIncreaseBtn) {
      changeCartQty(cartQtyIncreaseBtn.dataset.cartQtyIncrease, 1);
      return;
    }

    const buyBtn = event.target.closest('[data-buy-toggle]');
    if (buyBtn) {
      showToast(buyBtn.dataset.buyToggle);
      return;
    }

    // Las miniaturas de la ficha de Tienda (#game-detail-content) tienen su
    // propio listener (cambian el hero, reinician el slideshow, etc.) que se
    // engancha en game-detail.js al renderizar. Las de la ficha de
    // Biblioteca siguen usando este toggle genérico de "active".
    const galleryThumb = event.target.closest('.gallery-thumb');
    if (galleryThumb && !galleryThumb.closest('#game-detail-content')) {
      qsa('.gallery-thumb').forEach((t) => t.classList.remove('active'));
      galleryThumb.classList.add('active');
      return;
    }

    if (event.target.closest('#filters-toggle')) {
      qs('#filters-panel')?.classList.toggle('open');
      qs('#results-layout')?.classList.toggle('filters-open');
      currentOpenFilters = qs('#filters-panel')?.classList.contains('open') || false;
      return;
    }

    if (event.target.closest('#filters-clear')) {
      renderResults(currentResultsBaseList, { title: currentResultsTitle, query: currentResultsQuery, openFilters: currentOpenFilters });
      return;
    }

    // ---- Biblioteca: lista/cuadrícula/carátulas, filtros, carpetas ----

    const libInstallBtn = event.target.closest('[data-lib-install]');
    if (libInstallBtn) {
      openInstallModal(libInstallBtn.dataset.libInstall);
      return;
    }

    const libFavoriteBtn = event.target.closest('[data-lib-favorite-toggle]');
    if (libFavoriteBtn) {
      toggleLibraryFavorite(libFavoriteBtn);
      return;
    }

    const libViewBtn = event.target.closest('[data-lib-view]');
    if (libViewBtn) {
      libraryViewMode = libViewBtn.dataset.libView;
      refreshLibraryGamesList();
      return;
    }

    const libFilterBtn = event.target.closest('[data-lib-filter]');
    if (libFilterBtn) {
      libraryFilter = libFilterBtn.dataset.libFilter;
      refreshLibraryGamesList();
      return;
    }

    const libFolderCard = event.target.closest('[data-lib-folder]');
    if (libFolderCard) {
      libraryFolder = libFolderCard.dataset.libFolder;
      renderLibraryHome();
      return;
    }

    if (event.target.closest('[data-lib-folder-back]')) {
      libraryFolder = null;
      renderLibraryHome();
      return;
    }

    if (event.target.closest('[data-lib-back]')) {
      handleBack('library-home');
      return;
    }

    // ---- Comunidad (dentro de la ficha de Biblioteca) ----

    const communityLikeBtn = event.target.closest('[data-community-like]');
    if (communityLikeBtn) {
      toggleCommunityLike(communityLikeBtn);
      return;
    }

    const communityToggleBtn = event.target.closest('[data-community-toggle-comments]');
    if (communityToggleBtn) {
      toggleCommunityComments(communityToggleBtn);
      return;
    }

    const communitySubmitBtn = event.target.closest('[data-community-comment-submit]');
    if (communitySubmitBtn) {
      submitCommunityComment(communitySubmitBtn.dataset.communityCommentSubmit);
      return;
    }

    // ---- Modal de instalación ----

    if (event.target.closest('#install-modal-close') || event.target.closest('[data-install-cancel]')) {
      closeInstallModal();
      return;
    }

    if (event.target.id === 'install-modal-overlay') {
      closeInstallModal();
      return;
    }

    const installConfirmBtn = event.target.closest('[data-install-confirm]');
    if (installConfirmBtn && !installConfirmBtn.disabled) {
      confirmInstall(installConfirmBtn.dataset.installConfirm);
      return;
    }

    // ---- Navegación general (juegos, packs, "volver") ----

    const backBtn = event.target.closest('[data-back-to]');
    if (backBtn) {
      handleBack(backBtn.dataset.backTo);
      return;
    }

    if (event.target.closest('[data-explore]')) {
      handleExplore();
      return;
    }

    const libGameRow = event.target.closest('[data-lib-game-id]');
    if (libGameRow) {
      openLibraryGameDetail(libGameRow.dataset.libGameId);
      return;
    }

    const gameCard = event.target.closest('[data-game-id]');
    if (gameCard) {
      hideSuggestions();
      openGameDetail(gameCard.dataset.gameId);
      return;
    }

    const packCard = event.target.closest('[data-pack-id]');
    if (packCard) {
      hideSuggestions();
      openPackDetail(packCard.dataset.packId);
      return;
    }
  });

  document.body.addEventListener('change', (event) => {
    const target = event.target;

    if (target.id === 'sort-select') {
      currentFilters.sort = target.value;
      applyFiltersAndRender();
      return;
    }
    if (target.dataset.filter === 'genre') {
      toggleSetFilter(currentFilters.genres, target.value, target.checked);
      applyFiltersAndRender();
      return;
    }
    if (target.dataset.filter === 'language') {
      toggleSetFilter(currentFilters.languages, target.value, target.checked);
      applyFiltersAndRender();
      return;
    }
    if (target.dataset.filter === 'price') {
      currentFilters.priceBucket = target.value;
      applyFiltersAndRender();
      return;
    }
    if (target.dataset.filter === 'rating') {
      currentFilters.minRating = parseFloat(target.value);
      applyFiltersAndRender();
      return;
    }
    if (target.id === 'release-filter') {
      currentFilters.releaseWindow = target.value;
      applyFiltersAndRender();
      return;
    }
    if (['review-lang-filter', 'review-rating-filter', 'review-sort'].includes(target.id)) {
      applyReviewFilters();
      return;
    }
    if (target.id === 'install-drive-select') {
      handleInstallDriveChange(target);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeInstallModal();
  });
}

/* ---------- Previews de video en tarjetas (hover tipo Steam) ----------
   Delegado en document.body porque las tarjetas se regeneran constantemente
   con innerHTML (Inicio, Tienda, "Más de este desarrollador"). mouseover/
   mouseout sí burbujean (a diferencia de mouseenter/mouseleave), así que
   comparamos contra relatedTarget para simular el comportamiento de
   "entrar/salir" de la tarjeta sin re-disparar en cada hijo interno.
   Se usa tanto en las tarjetas normales (game-card) como en la de
   "Más jugado ahora" (featured-card), que comparten el mismo marcado de
   video (.game-card-video) y el mismo atributo data-preview-card. */

function initHoverPreviews() {
  document.body.addEventListener('mouseover', (event) => {
    const card = event.target.closest('[data-preview-card]');
    if (!card || card.contains(event.relatedTarget)) return;

    const video = card.querySelector('.game-card-video');
    if (!video) return;

    if (!video.src && video.dataset.previewSrc) {
      video.src = video.dataset.previewSrc;
    }

    try {
      video.currentTime = 0;
    } catch (err) {
      // El video puede no tener metadata cargada todavía; se ignora.
    }

    video.play().catch(() => {});
    card.classList.add('preview-playing');
  });

  document.body.addEventListener('mouseout', (event) => {
    const card = event.target.closest('[data-preview-card]');
    if (!card || card.contains(event.relatedTarget)) return;

    const video = card.querySelector('.game-card-video');
    if (!video) return;

    video.pause();
    try {
      video.currentTime = 0;
    } catch (err) {
      // Idem arriba.
    }
    card.classList.remove('preview-playing');
  });
}

/* ---------- Arranque de la app ---------- */

document.addEventListener('DOMContentLoaded', async () => {
  initSidebarNavigation();
  initProfileMenu();
  initNotifications();
  initSearch();
  initLibraryControls();
  initDelegatedHandlers();
  initHoverPreviews();
  renderCartBadge();
  await renderHome();
});