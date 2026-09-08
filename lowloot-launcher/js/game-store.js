// game-store.js

const LowlootData = (() => {
  const API_BASE_URL = 'http://localhost:8080';

  const EMPTY_REQ = {
    os: '—',
    cpu: '—',
    ram: '—',
    gpu: '—',
    storage: '—'
  };

  const GRADIENT_POOL = [
    'gradient-a',
    'gradient-b',
    'gradient-c',
    'gradient-d',
    'gradient-e',
    'gradient-f'
  ];

  let gamesList = [];
  let loadPromise = null;

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const resolveAssetUrl = (path) => {
    if (!path) return null;

    if (
      path.startsWith('http://') ||
      path.startsWith('https://')
    ) {
      return path;
    }

    return `${API_BASE_URL}/${path.replace(/^\/+/, '')}?v=2`;
  };

  function pickGradient(seed) {
    let hash = 0;

    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }

    return GRADIENT_POOL[hash % GRADIENT_POOL.length];
  }

  function toArray(value) {
    if (Array.isArray(value)) return value;
    if (value === undefined || value === null || value === '') return [];
    return [value];
  }

  function normalizeGame(raw) {
    const id =
      raw.id ??
      raw.gameId ??
      raw.slug ??
      String(
        raw.name ??
        raw.title ??
        'juego'
      )
        .toLowerCase()
        .replace(/\s+/g, '-');

    const name = raw.name ?? raw.title ?? 'Sin nombre';

    const price =
      typeof raw.price === 'number'
        ? raw.price
        : 0;

    const coverImageUrl = resolveAssetUrl(
      raw.coverImageUrl ??
      raw.imageUrl ??
      raw.coverUrl ??
      raw.thumbnail ??
      null
    );

    const previewVideoUrl = resolveAssetUrl(
      raw.previewVideoUrl
    );

    const images = Array.isArray(raw.images)
      ? raw.images
          .map(resolveAssetUrl)
          .filter(Boolean)
      : [];

    const developers = Array.isArray(raw.developers)
      ? raw.developers
      : toArray(raw.developer ?? raw.studio);

    const description = raw.description ?? '';

    return {
      id,
      name,

      genre: raw.genre ?? '',

      tags: Array.isArray(raw.tags)
        ? raw.tags
        : toArray(raw.genre),

      shortDesc:
        raw.shortDesc ??
        (description
          ? description.slice(0, 140)
          : ''),

      description,

      developers: developers.length
        ? developers
        : ['Desarrolladora desconocida'],

      releaseDate:
        raw.releaseDate ??
        raw.release_date ??
        null,

      languages: Array.isArray(raw.languages)
        ? raw.languages
        : [],

      price,

      discount:
        typeof raw.discount === 'number'
          ? raw.discount
          : 0,

      isFree:
        raw.isFree ??
        raw.free ??
        price === 0,

      rating:
        typeof raw.rating === 'number'
          ? raw.rating
          : 0,

      reviewsCount:
        typeof raw.reviewsCount === 'number'
          ? raw.reviewsCount
          : 0,

      plays:
        typeof raw.plays === 'number'
          ? raw.plays
          : 0,

      recommended:
        Boolean(raw.recommended),

      owned: false,

      coverImageUrl,
      previewVideoUrl,
      images,

      gradient: coverImageUrl
        ? null
        : pickGradient(String(id)),

      features:
        Array.isArray(raw.features)
          ? raw.features
          : [],

      editions:
        Array.isArray(raw.editions) &&
        raw.editions.length
          ? raw.editions
          : [
              {
                name: 'Edición Estándar',
                price,
                includes: 'Juego base'
              }
            ],

      dlc:
        Array.isArray(raw.dlc)
          ? raw.dlc
          : [],

      minReq:
        raw.minReq ?? {
          ...EMPTY_REQ
        },

      recReq:
        raw.recReq ?? {
          ...EMPTY_REQ
        },

      mods:
        Array.isArray(raw.mods)
          ? raw.mods
          : [],

      reviews:
        Array.isArray(raw.reviews)
          ? raw.reviews
          : []
    };
  }

  async function ensureGamesLoaded() {
    if (!loadPromise) {
      loadPromise = LowlootAPI.getGames()
        .then((rawGames) => {
          gamesList = (
            Array.isArray(rawGames)
              ? rawGames
              : []
          ).map(normalizeGame);
        })
        .catch((err) => {
          console.error(
            'No se pudieron cargar los juegos desde /games:',
            err
          );

          gamesList = [];

          if (typeof showToast === 'function') {
            showToast(
              'No se pudo conectar con la API (http://localhost:8080/games)'
            );
          }
        });
    }

    return loadPromise;
  }

  async function getAllGames() {
    await ensureGamesLoaded();
    return clone(gamesList);
  }

  async function getGameById(id) {
    await ensureGamesLoaded();

    const game = gamesList.find(
      (g) => String(g.id) === String(id)
    );

    return game ? clone(game) : null;
  }

  async function getMostPlayedGame() {
    await ensureGamesLoaded();

    if (!gamesList.length) return null;

    const top = [...gamesList].sort(
      (a, b) => b.plays - a.plays
    )[0];

    return clone(top);
  }

  async function getTrendingGames() {
    await ensureGamesLoaded();

    const flagged = gamesList.filter(
      (g) => g.recommended
    );

    return clone(
      flagged.length
        ? flagged
        : gamesList.slice(0, 3)
    );
  }

  async function getNews() {
    return [];
  }

  async function getAllPacks() {
    return [];
  }

  async function getPackById() {
    return null;
  }

  async function getGamesByDeveloper(
    developerName,
    excludeId
  ) {
    await ensureGamesLoaded();

    return clone(
      gamesList.filter(
        (g) =>
          g.developers.includes(developerName) &&
          String(g.id) !== String(excludeId)
      )
    );
  }

  async function getDeveloperInfo() {
    return {
      blurb: 'Sin información adicional disponible.',
      founded: null
    };
  }

  async function getStoreSections() {
    await ensureGamesLoaded();

    return {
      ofertas: clone(
        gamesList.filter(
          (g) => g.discount > 0
        )
      ),

      packs: [],

      mejorValorados: clone(
        [...gamesList].sort(
          (a, b) => b.rating - a.rating
        )
      ),

      masJugados: clone(
        [...gamesList].sort(
          (a, b) => b.plays - a.plays
        )
      ),

      recienLanzados: clone(
        [...gamesList].sort((a, b) => {
          if (!a.releaseDate) return 1;
          if (!b.releaseDate) return -1;

          return (
            new Date(b.releaseDate) -
            new Date(a.releaseDate)
          );
        })
      )
    };
  }

  async function searchGames(query) {
    await ensureGamesLoaded();

    const q = query.trim().toLowerCase();

    if (!q) return [];

    return clone(
      gamesList.filter(
        (g) =>
          g.name
            .toLowerCase()
            .includes(q) ||
          g.genre
            .toLowerCase()
            .includes(q) ||
          g.tags.some((t) =>
            t.toLowerCase().includes(q)
          )
      )
    );
  }

  async function getFilterOptions() {
    await ensureGamesLoaded();

    return {
      genres: [
        ...new Set(
          gamesList
            .map((g) => g.genre)
            .filter(Boolean)
        )
      ].sort(),

      languages: [
        ...new Set(
          gamesList.flatMap(
            (g) => g.languages
          )
        )
      ].sort()
    };
  }

  return {
    getAllGames,
    getGameById,
    getMostPlayedGame,
    getTrendingGames,
    getNews,
    getAllPacks,
    getPackById,
    getGamesByDeveloper,
    getDeveloperInfo,
    getStoreSections,
    searchGames,
    getFilterOptions
  };
})();