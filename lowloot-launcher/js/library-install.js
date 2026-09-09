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

// Esto es a propósito: el modal de instalación (disco, carpeta, espacio,
// progreso) queda completo y disponible para probarlo/mostrarlo, pero ya NO
// termina "instalando" de verdad el juego (antes marcaba installed=true y
// habilitaba un botón JUGAR que a su vez tiraba otro toast de "no
// disponible" — dos capas de simulado engañoso). Confirmar acá avisa
// honestamente que todavía no hay instalación real.
function confirmInstall(gameId) {
  const game = libraryCache?.find((g) => String(g.gameId) === String(gameId));
  closeInstallModal();
  showToast(
    game
      ? `La instalación de ${game.name} todavía no está disponible: esta ventana es solo una vista previa de cómo va a funcionar.`
      : 'La instalación todavía no está disponible: esta ventana es solo una vista previa de cómo va a funcionar.'
  );
}
