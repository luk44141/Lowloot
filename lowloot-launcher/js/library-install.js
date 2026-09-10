// library-install.js — modal de instalación de Biblioteca (disco, carpeta, espacio,
// versión, contenido opcional, acceso directo) con una barra de progreso simulada.
// No hay descarga real: al "completar" la instalación se actualiza el estado local
// del juego (installed = true) para que el resto de la UI reaccione.
// Depende de LibraryData, helpers.js, state.js y library.js (libraryCache).

async function openInstallModal(gameId) {
  const allGames = await loadLibraryGames();
  const game = allGames.find((g) => String(g.gameId) === String(gameId));
  if (!game) return;

  installModalGameId = gameId;
  const drives = await LibraryData.getDrives();
  renderInstallModal(game, drives, drives[0].id);
  qs('#install-modal-overlay').classList.add('open');
}

function closeInstallModal() {
  qs('#install-modal-overlay')?.classList.remove('open');
  installModalGameId = null;
}

function renderInstallModal(game, drives, selectedDriveId) {
  const drive = drives.find((d) => d.id === selectedDriveId) || drives[0];
  const content = qs('#install-modal-content');
  if (!content) return;

  const hasSizeInfo = typeof game.installSizeGB === 'number';
  const notEnoughSpace = hasSizeInfo && drive.freeGB < game.installSizeGB;

  content.innerHTML = `
    <h3 class="install-modal-title">Instalar ${game.name}</h3>

    <div class="install-field">
      <label for="install-drive-select">Disco / unidad</label>
      <select id="install-drive-select">
        ${drives.map((d) => `<option value="${d.id}" ${d.id === selectedDriveId ? 'selected' : ''}>${d.label}</option>`).join('')}
      </select>
    </div>

    <div class="install-field">
      <label for="install-path-input">Carpeta de instalación</label>
      <input type="text" id="install-path-input" value="${drive.id}:\\Lowloot\\Games\\${game.name}" />
    </div>

    <div class="install-space-row">
      <div><span class="lib-stat-label">Espacio necesario</span><span class="lib-stat-value">${hasSizeInfo ? `${game.installSizeGB} GB` : '—'}</span></div>
      <div><span class="lib-stat-label">Espacio disponible</span><span class="lib-stat-value ${notEnoughSpace ? 'install-space-warning' : ''}">${drive.freeGB} GB</span></div>
      <div><span class="lib-stat-label">Versión a instalar</span><span class="lib-stat-value">${game.latestVersion}</span></div>
    </div>

    ${notEnoughSpace ? '<p class="install-warning">No hay espacio suficiente en esta unidad.</p>' : ''}

    <div class="install-field">
      <span class="install-field-label">Contenido adicional opcional</span>
      <label class="install-checkbox"><input type="checkbox" checked /> Banda sonora en alta calidad (+1.2 GB)</label>
      <label class="install-checkbox"><input type="checkbox" /> Paquetes de idioma adicionales (+0.6 GB)</label>
    </div>

    <label class="install-checkbox install-shortcut">
      <input type="checkbox" checked /> Crear acceso directo en el escritorio
    </label>

    <div class="install-modal-footer">
      <button type="button" class="btn-secondary" data-install-cancel>CANCELAR</button>
      <button type="button" class="btn-primary" data-install-confirm="${game.gameId}" ${notEnoughSpace ? 'disabled' : ''}>INSTALAR</button>
    </div>
  `;
}

function handleInstallDriveChange(selectEl) {
  const gameId = installModalGameId;
  const game = libraryCache?.find((g) => String(g.gameId) === String(gameId));
  if (!game) return;

  LibraryData.getDrives().then((drives) => {
    renderInstallModal(game, drives, selectEl.value);
  });
}

function confirmInstall(gameId) {
  const content = qs('#install-modal-content');
  const game = libraryCache?.find((g) => String(g.gameId) === String(gameId));
  if (!game || !content) return;

  content.innerHTML = `
    <h3 class="install-modal-title">Instalando ${game.name}...</h3>
    <div class="install-progress-track">
      <div class="install-progress-fill" id="install-progress-fill"></div>
    </div>
    <p class="install-progress-label" id="install-progress-label">Preparando archivos...</p>
  `;

  const fill = qs('#install-progress-fill');
  const label = qs('#install-progress-label');
  const steps = ['Preparando archivos...', 'Copiando datos...', 'Verificando integridad...', 'Casi listo...'];
  let pct = 0;

  const timer = setInterval(() => {
    pct += 8 + Math.random() * 10;

    if (pct >= 100) {
      pct = 100;
      clearInterval(timer);
      fill.style.width = '100%';
      label.textContent = '¡Instalación completa!';
      finishInstall(gameId);
      return;
    }

    fill.style.width = `${pct}%`;
    label.textContent = steps[Math.min(Math.floor(pct / 26), steps.length - 1)];
  }, 220);
}

// Desinstalar (desde el menú de "tres puntos" de la Biblioteca): también
// simulado, solo persiste installed=false. No borra, mueve ni toca ningún
// archivo real -- no hay instalación real todavía.
async function uninstallLibraryGame(gameId) {
  try {
    await LowlootAPI.uninstallGame(gameId);
  } catch (err) {
    showToast(err.message || 'No se pudo desinstalar');
    return;
  }

  const index = libraryCache?.findIndex((g) => String(g.gameId) === String(gameId));
  if (index > -1) {
    libraryCache[index].installed = false;
    libraryCache[index].installedVersion = null;
  }

  showToast('Juego desinstalado');

  if (qs('.view[data-view="biblioteca"]')?.classList.contains('active')) {
    refreshLibraryGamesList();
  }
  if (String(currentLibraryGameId) === String(gameId) && qs('.view[data-view="library-game"]')?.classList.contains('active')) {
    const updatedGame = libraryCache.find((g) => String(g.gameId) === String(gameId));
    if (updatedGame) renderLibraryGameDetail(updatedGame);
  }
}

async function finishInstall(gameId) {
  try {
    // No hay instalación real: esto solo persiste que el juego quedó
    // "instalado" para este usuario, tal como se pidió (modal "En
    // proceso" + guardar el estado si ya existe la estructura para ello).
    await LowlootAPI.installGame(gameId);
  } catch (err) {
    closeInstallModal();
    showToast(err.message || 'No se pudo guardar la instalación');
    return;
  }

  const index = libraryCache?.findIndex((g) => String(g.gameId) === String(gameId));
  if (index > -1) {
    libraryCache[index].installed = true;
    libraryCache[index].installedVersion = libraryCache[index].latestVersion;
    libraryCache[index].updateAvailable = false;
  }

  setTimeout(() => {
    closeInstallModal();
    showToast('Instalación completa');

    if (qs('.view[data-view="biblioteca"]')?.classList.contains('active')) {
      refreshLibraryGamesList();
    }
    if (currentLibraryGameId === gameId && qs('.view[data-view="library-game"]')?.classList.contains('active')) {
      const updatedGame = libraryCache.find((g) => String(g.gameId) === String(gameId));
      if (updatedGame) renderLibraryGameDetail(updatedGame);
    }

    // Instalar también se puede iniciar desde la ficha de un juego en la
    // Tienda (ya comprado): si esa ficha sigue abierta, se refresca para
    // que el botón pase de INSTALAR a JUGAR sin que haga falta salir y
    // volver a entrar.
    if (qs('.view[data-view="game"]')?.classList.contains('active') && typeof openGameDetail === 'function') {
      openGameDetail(gameId);
    }
  }, 700);
}
