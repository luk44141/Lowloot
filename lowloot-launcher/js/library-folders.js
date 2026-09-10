// library-folders.js — modal para crear carpetas de Biblioteca a gusto del
// usuario: nombre + selección de juegos entre los que ya tiene comprados.
// Las carpetas nunca se arman solas (ver library-data.js): esta es la única
// forma de que aparezca una. Depende de loadLibraryGames() (library.js),
// LibraryData (library-data.js), helpers.js y components.js (gameCoverClass/Style).

// Juegos marcados en el modal mientras está abierto (se resetea cada vez
// que se abre). Usamos un Set para poder tildar/destildar por id sin
// duplicados y sin depender del orden de los checkboxes.
let folderModalSelectedGames = new Set();

async function openCreateFolderModal() {
  const allGames = await loadLibraryGames();
  if (!allGames.length) return;

  folderModalSelectedGames = new Set();
  renderFolderModal(allGames, '');
  qs('#folder-modal-overlay')?.classList.add('open');
  qs('#folder-name-input')?.focus();
}

function closeCreateFolderModal() {
  qs('#folder-modal-overlay')?.classList.remove('open');
  folderModalSelectedGames = new Set();
}

function renderFolderModal(allGames, currentNameValue) {
  const content = qs('#folder-modal-content');
  if (!content) return;

  const selectedGames = allGames.filter((g) => folderModalSelectedGames.has(String(g.gameId)));

  const chipsHtml = selectedGames.length
    ? selectedGames
        .map(
          (g) => `
        <span class="folder-chip" data-folder-chip-remove="${g.gameId}">
          ${escapeHtml(g.name)}
          <button type="button" aria-label="Quitar ${escapeHtml(g.name)}">&times;</button>
        </span>
      `
        )
        .join('')
    : `<p class="folder-chips-empty">Todavía no seleccionaste ningún juego.</p>`;

  const gameRowsHtml = allGames
    .map((g) => {
      const checked = folderModalSelectedGames.has(String(g.gameId));
      return `
        <label class="folder-game-row ${checked ? 'checked' : ''}">
          <input type="checkbox" data-folder-game-checkbox="${g.gameId}" ${checked ? 'checked' : ''} />
          <span class="folder-game-thumb ${gameCoverClass(g)}" ${gameCoverStyle(g)} aria-hidden="true"></span>
          <span class="folder-game-name">${escapeHtml(g.name)}</span>
          ${g.folder ? `<span class="folder-game-current">En "${escapeHtml(g.folder)}"</span>` : ''}
        </label>
      `;
    })
    .join('');

  content.innerHTML = `
    <h3 class="install-modal-title">Crear carpeta</h3>

    <div class="install-field">
      <label for="folder-name-input">Nombre de la carpeta</label>
      <input type="text" id="folder-name-input" placeholder="Ej: Para jugar con amigos" maxlength="40" value="${escapeHtml(currentNameValue || '')}" autocomplete="off" />
    </div>

    <div class="install-field">
      <span class="install-field-label">Juegos seleccionados</span>
      <div class="folder-chips">${chipsHtml}</div>
    </div>

    <div class="install-field">
      <span class="install-field-label">Elegí los juegos para esta carpeta</span>
      <div class="folder-game-list">${gameRowsHtml}</div>
    </div>

    <div class="install-modal-footer">
      <button type="button" class="btn-secondary" data-folder-cancel>CANCELAR</button>
      <button type="button" class="btn-primary" data-folder-create-confirm>CREAR CARPETA</button>
    </div>
  `;
}

async function toggleFolderGameSelection(gameId, checked) {
  const id = String(gameId);
  if (checked) folderModalSelectedGames.add(id);
  else folderModalSelectedGames.delete(id);

  const allGames = await loadLibraryGames();
  const nameInput = qs('#folder-name-input');
  const currentName = nameInput ? nameInput.value : '';
  renderFolderModal(allGames, currentName);
  // Re-enfoca el input de nombre solo si el usuario ya había empezado a
  // escribir algo, para no robarle el foco a la lista de juegos sin razón.
  if (currentName) {
    const refocused = qs('#folder-name-input');
    if (refocused) {
      refocused.focus();
      refocused.setSelectionRange(currentName.length, currentName.length);
    }
  }
}

async function submitCreateFolder() {
  const nameInput = qs('#folder-name-input');
  const name = nameInput ? nameInput.value.trim() : '';

  if (!name) {
    showToast('Ponele un nombre a la carpeta');
    nameInput?.focus();
    return;
  }
  if (!folderModalSelectedGames.size) {
    showToast('Elegí al menos un juego para la carpeta');
    return;
  }

  await LibraryData.createFolder(name, [...folderModalSelectedGames]);
  closeCreateFolderModal();
  showToast(`Carpeta "${name}" creada`);

  if (qs('.view[data-view="biblioteca"]')?.classList.contains('active') && typeof renderLibraryHome === 'function') {
    renderLibraryHome();
  }
}

function initFolderModal() {
  const overlay = qs('#folder-modal-overlay');
  const content = qs('#folder-modal-content');
  if (!overlay || !content) return;

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeCreateFolderModal();
  });

  document.getElementById('folder-modal-close')?.addEventListener('click', closeCreateFolderModal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && overlay.classList.contains('open')) closeCreateFolderModal();
  });

  content.addEventListener('change', (event) => {
    const checkbox = event.target.closest('[data-folder-game-checkbox]');
    if (checkbox) {
      toggleFolderGameSelection(checkbox.dataset.folderGameCheckbox, checkbox.checked);
    }
  });

  content.addEventListener('click', (event) => {
    if (event.target.closest('[data-folder-cancel]')) {
      closeCreateFolderModal();
      return;
    }
    if (event.target.closest('[data-folder-create-confirm]')) {
      submitCreateFolder();
      return;
    }
    const chipRemove = event.target.closest('[data-folder-chip-remove]');
    if (chipRemove) {
      toggleFolderGameSelection(chipRemove.dataset.folderChipRemove, false);
    }
  });
}
