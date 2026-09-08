// library-data.js
//
// Datos de "propiedad del usuario" de la Biblioteca (instalado, horas
// jugadas, favoritos, carpetas, logros, updates del desarrollador,
// comunidad). Esto NO es dato de catálogo: /games no tiene ni puede tener
// esta información, porque es específica de cada usuario, no del juego en
// sí. Todavía no existe ningún endpoint para esto (ni /library, ni
// /achievements, ni /community), así que sigue siendo mock — pero ahora
// se genera dinámicamente a partir de los juegos reales que devuelva
// game-store.js, en vez de tener 8 entradas hardcodeadas con IDs
// ficticios ('ashen-hollow', etc.) que iban a quedar huérfanas apenas
// cambiaran los juegos de prueba.
//
// TODO (backend): cuando exista un endpoint real de biblioteca del
// usuario, reemplazar generateLibraryEntry() por datos reales, igual que
// se hizo con game-store.js para el catálogo.

const LibraryData = (() => {
  const DRIVES = [
    { id: 'C', label: 'C:  — SSD principal', freeGB: 128, totalGB: 500 },
    { id: 'D', label: 'D:  — HDD secundario', freeGB: 340, totalGB: 1000 },
  ];

  const DAY_MS = 24 * 60 * 60 * 1000;

  let libraryEntries = null;
  let buildPromise = null;

  const clone = (value) => JSON.parse(JSON.stringify(value));

  function isoDateDaysAgo(days) {
    return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
  }

  function isoDateTimeDaysAgo(days) {
    return new Date(Date.now() - days * DAY_MS).toISOString();
  }

  function generateAchievements(game, installed, playtimeHours, addedDate) {
    return [
      {
        id: 'a1',
        name: 'Primeros pasos',
        description: `Iniciá ${game.name} por primera vez.`,
        unlocked: installed,
        unlockedDate: installed ? addedDate : null,
      },
      {
        id: 'a2',
        name: 'En marcha',
        description: `Acumulá horas de juego en ${game.name}.`,
        unlocked: playtimeHours > 20,
        unlockedDate: playtimeHours > 20 ? addedDate : null,
      },
      {
        id: 'a3',
        name: 'Explorador',
        description: 'Descubrí contenido oculto.',
        unlocked: false,
        unlockedDate: null,
      },
    ];
  }

  function generateDevUpdates(game, updateAvailable, addedDate) {
    const base = {
      version: '1.0.0',
      date: game.releaseDate || addedDate,
      title: 'Lanzamiento',
      description: `Primera versión pública de ${game.name}.`,
      changes: ['Lanzamiento inicial'],
    };
    if (!updateAvailable) return [base];
    return [
      {
        version: '1.1.0',
        date: isoDateDaysAgo(3),
        title: 'Actualización disponible',
        description: 'Hay una nueva versión esperando para instalarse.',
        changes: ['Mejoras generales', 'Corrección de errores'],
      },
      base,
    ];
  }

  function generateCommunityPosts(game, addedDate) {
    return [
      {
        id: `${game.id}-p1`,
        user: 'jugador_anonimo',
        date: addedDate,
        title: `¿Alguien más está jugando ${game.name}?`,
        content: 'Recién lo empecé, ¿algún consejo para arrancar bien?',
        likes: 3,
        comments: [],
      },
    ];
  }

  function generateLibraryEntry(game, index) {
    const installed = index % 2 === 0;
    const updateAvailable = installed && index % 3 === 0;
    const playtimeHours = installed ? Math.round((index + 1) * 6.5 * 10) / 10 : 0;
    const addedDate = isoDateDaysAgo((index + 3) * 5);
    const lastPlayed = installed && playtimeHours > 0 ? isoDateTimeDaysAgo((index + 1) * 2) : null;

    return {
      gameId: game.id,
      installed,
      installedVersion: installed ? '1.0.0' : null,
      latestVersion: updateAvailable ? '1.1.0' : '1.0.0',
      updateAvailable,
      installSizeGB: 8 + (index % 5) * 4,
      playtimeHours,
      lastPlayed,
      addedDate,
      favorite: index % 4 === 0,
      folder: game.genre || null,
      dlcOwned: [], // sin fuente real todavía: /games no trae DLC comprado por el usuario
      achievements: generateAchievements(game, installed, playtimeHours, addedDate),
      devUpdates: generateDevUpdates(game, updateAvailable, addedDate),
      communityPosts: generateCommunityPosts(game, addedDate),
    };
  }

  async function ensureLibraryBuilt() {
    if (!buildPromise) {
      buildPromise = LowlootData.getAllGames().then((games) => {
        libraryEntries = games.map((game, index) => generateLibraryEntry(game, index));
      });
    }
    return buildPromise;
  }

  async function getLibrary() {
    await ensureLibraryBuilt();
    return clone(libraryEntries);
  }

  async function getLibraryEntry(gameId) {
    await ensureLibraryBuilt();
    const entry = libraryEntries.find((e) => e.gameId === gameId);
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
  };
})();
