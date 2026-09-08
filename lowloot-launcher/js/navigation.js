// navigation.js — cambio entre las vistas principales (Inicio/Tienda/juego/pack/etc)
// y manejo de los botones "Volver". Depende de helpers.js.

/* ---------- Navegación general ---------- */

function activateView(viewName, options = {}) {
  const navItems = qsa('.nav-item[data-view]');
  const views = qsa('.view[data-view]');

  if (options.selectNav !== false) {
    navItems.forEach((n) => n.classList.toggle('active', n.dataset.view === viewName));
  } else {
    navItems.forEach((n) => n.classList.remove('active'));
  }

  // Al salir de una vista (volver, cambiar de sección, etc.) hay que pausar
  // cualquier video que haya quedado reproduciéndose ahí (el hero de la
  // ficha de juego, algún preview de tarjeta que no llegó a pausarse por
  // mouseout). Si no se hace esto, el audio sigue sonando aunque la vista
  // esté oculta con display:none, porque el elemento sigue vivo en el DOM.
  views.forEach((v) => {
    const isActive = v.dataset.view === viewName;
    v.classList.toggle('active', isActive);
    if (!isActive) {
      v.querySelectorAll('video').forEach((video) => {
        if (!video.paused) video.pause();
      });
    }
  });

  if (viewName !== 'game' && typeof stopGallerySlideshow === 'function') {
    stopGallerySlideshow();
  }

  scrollMainTop();
}

function initSidebarNavigation() {
  qsa('.nav-item[data-view]').forEach((item) => {
    item.addEventListener('click', () => {
      activateView(item.dataset.view);
      if (item.dataset.view === 'tienda') renderStoreHome();
      if (item.dataset.view === 'wishlist') renderWishlistView();
      if (item.dataset.view === 'biblioteca') renderLibraryHome();
      if (item.dataset.view === 'carrito') renderCartView();
    });
  });
}

function handleBack(target) {
  if (target === 'store-home') {
    activateView('tienda');
    renderStoreHome();
  } else if (target === 'library-home') {
    activateView('biblioteca');
    renderLibraryHome();
  } else if (target === 'main-nav') {
    activateView(lastMainView);
    if (lastMainView === 'tienda') renderStoreHome();
    if (lastMainView === 'wishlist') renderWishlistView();
    if (lastMainView === 'biblioteca') renderLibraryHome();
    if (lastMainView === 'carrito') renderCartView();
  }
}