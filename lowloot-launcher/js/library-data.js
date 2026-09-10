// library-data.js
//
// Datos de "propiedad del usuario" de la Biblioteca (instalado, fecha de
// compra, carpetas). Antes esto se generaba a partir de TODOS los juegos
// del catálogo con valores fabricados por índice (instalado sí/no cada 2,
// favorito cada 4, horas jugadas inventadas...). Ahora sale de
// /library/me (tabla real `user_games`): solo aparecen los juegos que el
// usuario realmente compró, y "instalado" es el valor persistido de
// verdad, no un patrón hardcodeado.
//
// Los campos para los que todavía no existe ningún backend real (horas
// jugadas, última vez jugado, logros, actividad de comunidad, updates del
// desarrollador) se dejan en su estado vacío/neutral en vez de inventarse,
// igual que ya se hace con `notifications` en state.js.

const LibraryData = (() => {
  const DRIVES = [
    { id: 'C', label: 'C:  — SSD principal', freeGB: 128, totalGB: 500 },
    { id: 'D', label: 'D:  — HDD secundario', freeGB: 340, totalGB: 1000 },
  ];

  let libraryEntries = null;
  let buildPromise = null;

  const clone = (value) => JSON.parse(JSON.stringify(value));

  // Carpetas: no hay tabla para esto en el backend todavía, así que se
  // guardan en localStorage por usuario. Son 100% a elección del usuario
  // (nunca se auto-generan al comprar ni al instalar un juego): antes acá
  // se armaba una carpeta por género automáticamente, lo cual generaba
  // carpetas que nadie pidió. Un juego vive en como mucho una carpeta.
  function foldersStorageKey() {
    return currentUser ? `lowloot:folders:${currentUser.id}` : null;
  }

  function readFolderMap() {
    const key = foldersStorageKey();
    if (!key) return {};
    try {
      return JSON.parse(localStorage.getItem(key) || '{}');
    } catch (err) {
      return {};
    }
  }

  function writeFolderMap(map) {
    const key = foldersStorageKey();
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(map));
  }

  function toEntry(item, folderMap) {
    return {
      gameId: item.gameId,
      installed: Boolean(item.installed),
      installedVersion: item.installed ? '1.0.0' : null,
      latestVersion: '1.0.0',
      updateAvailable: false, // sin backend de updates real todavía
      installSizeGB: null,
      playtimeHours: 0, // sin backend de tiempo jugado real todavía
      lastPlayed: null,
      addedDate: item.purchasedAt ? String(item.purchasedAt).slice(0, 10) : null,
      favorite: Boolean(item.favorite), // real, persistido en user_games.favorite (V3)
      folder: folderMap[String(item.gameId)] || null,
      dlcOwned: [], // sin fuente real todavía: user_games no distingue DLC
      achievements: [],
      devUpdates: [],
      communityPosts: [],
    };
  }

  async function ensureLibraryBuilt() {
    if (!buildPromise) {
      buildPromise = (async () => {
        if (typeof currentUser === 'undefined' || !currentUser) {
          libraryEntries = [];
          return;
        }
        try {
          const items = await LowlootAPI.getLibrary();
          const folderMap = readFolderMap();
          libraryEntries = items.map((item) => toEntry(item, folderMap));

          // Si un juego se sacó de la biblioteca (admin, etc.) o cambió de
          // dueño, su asignación de carpeta vieja no debería seguir
          // ocupando espacio en localStorage para siempre.
          const ownedIds = new Set(libraryEntries.map((e) => String(e.gameId)));
          const cleanedMap = Object.fromEntries(Object.entries(folderMap).filter(([gameId]) => ownedIds.has(gameId)));
          if (Object.keys(cleanedMap).length !== Object.keys(folderMap).length) writeFolderMap(cleanedMap);
        } catch (err) {
          libraryEntries = [];
        }
      })();
    }
    return buildPromise;
  }

  // Crea (o reutiliza) una carpeta con ese nombre y le asigna los juegos
  // elegidos, sacándolos de cualquier otra carpeta en la que estuvieran
  // antes (un juego vive en una sola carpeta a la vez).
  async function createFolder(name, gameIds) {
    await ensureLibraryBuilt();
    const folderMap = readFolderMap();
    gameIds.forEach((gameId) => {
      folderMap[String(gameId)] = name;
    });
    writeFolderMap(folderMap);

    libraryEntries.forEach((entry) => {
      if (gameIds.map(String).includes(String(entry.gameId))) entry.folder = name;
    });
  }

  // Se llama después de comprar / instalar / iniciar-cerrar sesión, para
  // que la próxima lectura vuelva a pedir /library/me en vez de servir
  // datos viejos desde la caché.
  function invalidate() {
    libraryEntries = null;
    buildPromise = null;
  }

  async function getLibrary() {
    await ensureLibraryBuilt();
    return clone(libraryEntries);
  }

  async function getLibraryEntry(gameId) {
    await ensureLibraryBuilt();
    const entry = libraryEntries.find((e) => String(e.gameId) === String(gameId));
    return entry ? clone(entry) : null;
  }

  async function getFolders() {
    await ensureLibraryBuilt();
    const names = [...new Set(libraryEntries.map((e) => e.folder).filter(Boolean))].sort();
    return names.map((name) => ({
      name,
      gameIds: libraryEntries.filter((e) => e.folder === name).map((e) => e.gameId),
    }));
  }

  async function getDrives() {
    return clone(DRIVES);
  }

  // Actualiza el favorito de una entrada ya cargada en memoria (después de
  // un PATCH exitoso), para que la próxima lectura no tenga que volver a
  // pedirle /library/me al servidor.
  function setFavoriteCache(gameId, favorite) {
    if (!libraryEntries) return;
    const entry = libraryEntries.find((e) => String(e.gameId) === String(gameId));
    if (entry) entry.favorite = favorite;
  }

  return {
    getLibrary,
    getLibraryEntry,
    getFolders,
    getDrives,
    setFavoriteCache,
    createFolder,
    invalidate,
  };
})();
