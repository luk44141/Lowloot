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

  function toEntry(item) {
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
      favorite: false, // el toggle de favorito vive solo en memoria (libraryFavoriteOverrides)
      folder: item.genre || null,
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
          libraryEntries = items.map(toEntry);
        } catch (err) {
          libraryEntries = [];
        }
      })();
    }
    return buildPromise;
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

  return {
    getLibrary,
    getLibraryEntry,
    getFolders,
    getDrives,
    invalidate,
  };
})();
