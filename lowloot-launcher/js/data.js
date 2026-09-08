// data.js
//
// Capa de datos de Lowloot.
//
// TODO (backend): hoy estas funciones devuelven datos de prueba en memoria.
// Cuando conectemos el backend real (Spring Boot + PostgreSQL), la idea es
// que cada función de abajo pase a hacer un fetch() a su endpoint
// correspondiente (por ejemplo GAMES -> GET /api/juegos) sin tener que
// cambiar el resto de la interfaz, porque ya se consumen como funciones
// async. Todos los precios están en ARS.

const LowlootData = (() => {
  const DEVELOPERS = {
    'Hollow Point Studios': {
      blurb: 'Estudio independiente especializado en roguelikes atmosféricos y sistemas de generación procedural.',
      founded: 2018,
    },
    'Vantage Dark': {
      blurb: 'Equipo enfocado en narrativa interactiva y juegos de infiltración con decisiones ramificadas.',
      founded: 2016,
    },
    'Foundry Interactive': {
      blurb: 'Estudio de supervivencia y crafteo, conocido por sus sistemas de construcción persistentes.',
      founded: 2014,
    },
    'Little Moons': {
      blurb: 'Estudio pequeño dedicado a experiencias contemplativas y narrativas fuera de lo convencional.',
      founded: 2020,
    },
    'Longshore Games': {
      blurb: 'Especialistas en estrategia táctica con foco en combate naval y campañas históricas ficticias.',
      founded: 2012,
    },
    'Saltmark Collective': {
      blurb: 'Colectivo de desarrollo especializado en sistemas de mejora y economía de juegos de estrategia.',
      founded: 2019,
    },
  };

  const NEWS = [
    {
      id: 'news-mods-verificados',
      title: 'Lowloot suma soporte para mods verificados',
      summary: 'Estamos trabajando en un sistema de verificación de mods para que instalarlos sea más seguro. Todavía en desarrollo.',
      date: '2026-08-20',
      gradient: 'gradient-a',
    },
    {
      id: 'news-wishlist',
      title: 'Nueva sección de Wishlist ya disponible',
      summary: 'Ahora podés guardar los juegos que te interesan y encontrarlos todos juntos en un mismo lugar.',
      date: '2026-08-15',
      gradient: 'gradient-b',
    },
    {
      id: 'news-iron-tide-descuento',
      title: 'Iron Tide llega con 35% de descuento de lanzamiento',
      summary: 'La nueva campaña naval de Longshore Games y Saltmark Collective ya está disponible con descuento de lanzamiento.',
      date: '2026-08-10',
      gradient: 'gradient-d',
    },
    {
      id: 'news-static-frontier-horas',
      title: 'Static Frontier supera las 25 mil horas jugadas',
      summary: 'La exploración espacial de Vantage Dark se convirtió en uno de los juegos más jugados de Lowloot.',
      date: '2026-07-28',
      gradient: 'gradient-e',
    },
    {
      id: 'news-mantenimiento',
      title: 'Mantenimiento programado de la tienda',
      summary: 'Este fin de semana vamos a estar optimizando los servidores de la tienda. Podrían verse algunas demoras.',
      date: '2026-07-20',
      gradient: 'gradient-f',
    },
  ];

  const GAMES = [
    {
      id: 'ashen-hollow',
      name: 'Ashen Hollow',
      genre: 'Roguelike',
      tags: ['Roguelike', 'Cooperativo'],
      shortDesc: 'Explorá ruinas olvidadas y sobreviví a la oscuridad en este roguelike cooperativo.',
      description:
        'Ashen Hollow es un roguelike cooperativo para hasta cuatro jugadores. Cada partida genera mapas, enemigos y botín distintos, así que ninguna expedición a las ruinas se siente igual a la anterior. Coordiná con tu equipo, administrá recursos limitados y decidí cuándo retirarse antes de que la oscuridad los alcance.',
      developers: ['Hollow Point Studios'],
      releaseDate: '2025-11-03',
      languages: ['Español', 'English', 'Português'],
      price: 18999,
      discount: 0,
      isFree: false,
      rating: 4.6,
      reviewsCount: 812,
      plays: 15400,
      owned: true,
      recommended: false,
      gradient: 'gradient-featured',
      features: [
        'Cooperativo online para hasta 4 jugadores',
        'Mapas y enemigos generados proceduralmente',
        'Sistema de botín persistente entre partidas',
        'Modo difícil con reglas adicionales',
      ],
      editions: [
        { name: 'Edición Estándar', price: 18999, includes: 'Juego base' },
        { name: 'Edición Deluxe', price: 24999, includes: 'Juego base + banda sonora + skins exclusivas' },
      ],
      dlc: [{ name: 'Ashen Hollow: Las Grietas Profundas', price: 6999 }],
      minReq: { os: 'Windows 10 64-bit', cpu: 'Intel i5-6600 / Ryzen 5 1600', ram: '8 GB', gpu: 'GTX 1050 Ti / RX 560', storage: '18 GB' },
      recReq: { os: 'Windows 11 64-bit', cpu: 'Intel i7-9700 / Ryzen 7 3700X', ram: '16 GB', gpu: 'GTX 1660 Super / RX 5600 XT', storage: '18 GB SSD' },
      mods: [
        { name: 'Paleta de colores alternativa', author: 'comunidad' },
        { name: 'Interfaz minimalista', author: 'comunidad' },
      ],
      reviews: [
        { user: 'Renfield_ok', rating: 5, language: 'Español', date: '2026-06-02', text: 'Cada partida se siente distinta. Con amigos es todavía mejor.' },
        { user: 'darkmatterX', rating: 4, language: 'English', date: '2026-05-14', text: 'Great atmosphere, runs can get repetitive after 30+ hours though.' },
        { user: 'lucre.g', rating: 5, language: 'Español', date: '2026-04-20', text: 'La dificultad está muy bien balanceada. Recomendado.' },
      ],
    },
    {
      id: 'nightfall-circuit',
      name: 'Nightfall Circuit',
      genre: 'Infiltración',
      tags: ['Infiltración', 'Thriller'],
      shortDesc: 'Un thriller de infiltración ambientado en una ciudad que nunca apaga sus luces.',
      description:
        'Nightfall Circuit es un thriller de infiltración ambientado en una ciudad que nunca apaga sus luces. Sigilo, hackeo y decisiones que cambian el final te esperan en cada misión. Cada elección afecta cómo te perciben las facciones de la ciudad y qué rutas se abren más adelante.',
      developers: ['Vantage Dark'],
      releaseDate: '2026-01-15',
      languages: ['Español', 'English'],
      price: 14999,
      discount: 20,
      isFree: false,
      rating: 4.2,
      reviewsCount: 530,
      plays: 9800,
      owned: false,
      recommended: true,
      gradient: 'gradient-a',
      features: [
        'Múltiples finales según tus decisiones',
        'Sistema de reputación con facciones',
        'Mecánicas de hackeo y sigilo combinadas',
        'Sin combate directo: todo se resuelve con astucia',
      ],
      editions: [{ name: 'Edición Estándar', price: 14999, includes: 'Juego base' }],
      dlc: [],
      minReq: { os: 'Windows 10 64-bit', cpu: 'Intel i3-8100 / Ryzen 3 2200G', ram: '8 GB', gpu: 'GTX 1050 / RX 560', storage: '12 GB' },
      recReq: { os: 'Windows 11 64-bit', cpu: 'Intel i5-10400 / Ryzen 5 3600', ram: '16 GB', gpu: 'GTX 1660 / RX 580', storage: '12 GB SSD' },
      mods: [],
      reviews: [
        { user: 'nightowl', rating: 4, language: 'English', date: '2026-03-01', text: 'Tense and smart, though the final act feels rushed.' },
        { user: 'sombra_urbana', rating: 5, language: 'Español', date: '2026-02-18', text: 'La ambientación de la ciudad es excelente, muy inmersivo.' },
      ],
    },
    {
      id: 'rust-and-ember',
      name: 'Rust & Ember',
      genre: 'Supervivencia',
      tags: ['Supervivencia', 'Crafteo'],
      shortDesc: 'Sobrevivencia y crafteo en un mundo post-industrial.',
      description:
        'Rust & Ember te deja caer en un mundo post-industrial en ruinas. Construí tu refugio, craftea herramientas y armas, y defendé lo que levantaste antes de que caiga la noche. La gestión de recursos y el clima cambiante hacen que cada decisión de construcción importe.',
      developers: ['Foundry Interactive'],
      releaseDate: '2024-08-20',
      languages: ['Español', 'English', 'Deutsch'],
      price: 9499,
      discount: 0,
      isFree: false,
      rating: 3.9,
      reviewsCount: 344,
      plays: 21000,
      owned: false,
      recommended: true,
      gradient: 'gradient-b',
      features: [
        'Construcción modular de refugios',
        'Ciclo día/noche con clima dinámico',
        'Árbol de crafteo profundo',
        'Cooperativo opcional hasta 3 jugadores',
      ],
      editions: [{ name: 'Edición Estándar', price: 9499, includes: 'Juego base' }],
      dlc: [{ name: 'Rust & Ember: Tierras Heladas', price: 4499 }],
      minReq: { os: 'Windows 10 64-bit', cpu: 'Intel i5-4460 / Ryzen 3 1200', ram: '8 GB', gpu: 'GTX 960 / RX 570', storage: '20 GB' },
      recReq: { os: 'Windows 10/11 64-bit', cpu: 'Intel i7-8700 / Ryzen 5 3600', ram: '16 GB', gpu: 'GTX 1660 Ti / RX 590', storage: '20 GB SSD' },
      mods: [{ name: 'Recetas de crafteo extendidas', author: 'comunidad' }],
      reviews: [
        { user: 'buildmaster', rating: 4, language: 'English', date: '2026-01-22', text: 'Solid crafting loop, could use more late-game content.' },
        { user: 'refugio7', rating: 3, language: 'Español', date: '2025-12-10', text: 'Divertido al principio, se siente repetitivo después de un tiempo.' },
      ],
    },
    {
      id: 'quiet-orbit',
      name: 'Quiet Orbit',
      genre: 'Puzzle',
      tags: ['Puzzle', 'Contemplativo'],
      shortDesc: 'Un puzzle contemplativo sobre gravedad y espacio.',
      description:
        'Quiet Orbit es un puzzle contemplativo sobre gravedad y espacio. Sin prisa, sin enemigos: solo vos y la órbita perfecta. Cada nivel presenta un sistema planetario en miniatura que hay que balancear usando principios simples de física.',
      developers: ['Little Moons'],
      releaseDate: '2025-05-02',
      languages: ['Español', 'English'],
      price: 0,
      discount: 0,
      isFree: true,
      rating: 4.4,
      reviewsCount: 210,
      plays: 5200,
      owned: false,
      recommended: true,
      gradient: 'gradient-c',
      features: [
        'Más de 60 niveles de física gravitacional',
        'Sin límites de tiempo ni fallos punitivos',
        'Banda sonora ambiental original',
        'Modo fotografía integrado',
      ],
      editions: [{ name: 'Edición Estándar', price: 0, includes: 'Juego completo' }],
      dlc: [],
      minReq: { os: 'Windows 10 64-bit', cpu: 'Intel i3 / Ryzen 3', ram: '4 GB', gpu: 'Integrada reciente', storage: '3 GB' },
      recReq: { os: 'Windows 10/11 64-bit', cpu: 'Intel i5 / Ryzen 5', ram: '8 GB', gpu: 'GTX 1050', storage: '3 GB SSD' },
      mods: [],
      reviews: [
        { user: 'calmgamer', rating: 5, language: 'English', date: '2026-02-04', text: 'Beautiful and relaxing, perfect for winding down.' },
        { user: 'orbita.lenta', rating: 4, language: 'Español', date: '2025-11-19', text: 'Muy lindo, algunos niveles finales son bastante difíciles.' },
      ],
    },
    {
      id: 'iron-tide',
      name: 'Iron Tide',
      genre: 'Estrategia',
      tags: ['Estrategia', 'Naval'],
      shortDesc: 'Comandá flotas en campañas navales tácticas por turnos.',
      description:
        'Iron Tide te pone al mando de una flota en campañas navales tácticas por turnos. Gestioná recursos, mejorá tus barcos entre batallas y adaptá tu estrategia al clima y al terreno de cada escenario.',
      developers: ['Longshore Games', 'Saltmark Collective'],
      releaseDate: '2026-06-10',
      languages: ['Español', 'English'],
      price: 22999,
      discount: 35,
      isFree: false,
      rating: 4.1,
      reviewsCount: 190,
      plays: 3100,
      owned: false,
      recommended: false,
      gradient: 'gradient-d',
      features: [
        'Batallas navales tácticas por turnos',
        'Campaña con más de 20 misiones',
        'Sistema de mejoras entre batallas',
        'Editor de escenarios',
      ],
      editions: [
        { name: 'Edición Estándar', price: 22999, includes: 'Juego base' },
        { name: 'Edición Almirante', price: 29999, includes: 'Juego base + campaña adicional + editor avanzado' },
      ],
      dlc: [],
      minReq: { os: 'Windows 10 64-bit', cpu: 'Intel i5-7500 / Ryzen 5 2600', ram: '8 GB', gpu: 'GTX 1050 Ti', storage: '15 GB' },
      recReq: { os: 'Windows 11 64-bit', cpu: 'Intel i7-10700 / Ryzen 7 3700X', ram: '16 GB', gpu: 'GTX 1660', storage: '15 GB SSD' },
      mods: [],
      reviews: [{ user: 'almirante_r', rating: 4, language: 'Español', date: '2026-06-15', text: 'Muy táctico, el editor de escenarios le suma mucha vida útil.' }],
    },
    {
      id: 'static-frontier',
      name: 'Static Frontier',
      genre: 'Exploración',
      tags: ['Exploración', 'Ciencia ficción'],
      shortDesc: 'Explorá un cinturón de asteroides abandonado en busca de respuestas.',
      description:
        'Static Frontier te suelta en un cinturón de asteroides abandonado con una nave dañada y más preguntas que respuestas. Explorá estaciones a la deriva, reconstruí tu nave con lo que encuentres y descubrí qué pasó con la tripulación original.',
      developers: ['Vantage Dark'],
      releaseDate: '2023-09-12',
      languages: ['Español', 'English', 'Français'],
      price: 16999,
      discount: 0,
      isFree: false,
      rating: 4.7,
      reviewsCount: 980,
      plays: 26800,
      owned: false,
      recommended: false,
      gradient: 'gradient-e',
      features: [
        'Exploración espacial no lineal',
        'Reparación y mejora de nave basada en recursos encontrados',
        'Narrativa ambiental sin diálogos forzados',
        'Más de 15 estaciones únicas para descubrir',
      ],
      editions: [{ name: 'Edición Estándar', price: 16999, includes: 'Juego base' }],
      dlc: [{ name: 'Static Frontier: Señales Perdidas', price: 5499 }],
      minReq: { os: 'Windows 10 64-bit', cpu: 'Intel i5-6500 / Ryzen 5 1500X', ram: '8 GB', gpu: 'GTX 1060', storage: '25 GB' },
      recReq: { os: 'Windows 11 64-bit', cpu: 'Intel i7-9700K / Ryzen 7 3700X', ram: '16 GB', gpu: 'RTX 2060', storage: '25 GB SSD' },
      mods: [{ name: 'Traducción al portugués (comunidad)', author: 'comunidad' }],
      reviews: [
        { user: 'voidwalker', rating: 5, language: 'English', date: '2026-07-01', text: 'One of the most atmospheric exploration games I have played.' },
        { user: 'cinturon_frio', rating: 5, language: 'Español', date: '2026-05-28', text: 'La sensación de soledad está lograda a la perfección.' },
        { user: 'nova_c', rating: 4, language: 'Français', date: '2026-04-11', text: 'Superbe ambiance, un peu lent au début.' },
      ],
    },
    {
      id: 'paper-moon',
      name: 'Paper Moon',
      genre: 'Narrativo',
      tags: ['Narrativo', 'Aventura'],
      shortDesc: 'Una aventura narrativa sobre cartas nunca enviadas.',
      description:
        'Paper Moon sigue la historia de dos hermanos que se reencuentran a través de cartas nunca enviadas. Es una aventura narrativa corta, con foco en los diálogos y en pequeños puzzles ambientales que acompañan la historia.',
      developers: ['Little Moons'],
      releaseDate: '2026-07-01',
      languages: ['Español', 'English'],
      price: 7999,
      discount: 10,
      isFree: false,
      rating: 4.5,
      reviewsCount: 402,
      plays: 4300,
      owned: true,
      recommended: false,
      gradient: 'gradient-f',
      features: [
        'Historia narrativa de 4-6 horas',
        'Múltiples finales según tus respuestas',
        'Arte pintado a mano',
        'Sin combate ni fallos: foco total en la historia',
      ],
      editions: [{ name: 'Edición Estándar', price: 7999, includes: 'Juego base' }],
      dlc: [],
      minReq: { os: 'Windows 10 64-bit', cpu: 'Intel i3 / Ryzen 3', ram: '4 GB', gpu: 'Integrada reciente', storage: '5 GB' },
      recReq: { os: 'Windows 10/11 64-bit', cpu: 'Intel i5 / Ryzen 5', ram: '8 GB', gpu: 'GTX 1050', storage: '5 GB SSD' },
      mods: [],
      reviews: [{ user: 'letras_al_viento', rating: 5, language: 'Español', date: '2026-07-05', text: 'Me hizo llorar. Corto pero muy bien escrito.' }],
    },
    {
      id: 'glass-hollow',
      name: 'Glass Hollow',
      genre: 'Terror',
      tags: ['Terror', 'Psicológico'],
      shortDesc: 'Terror psicológico en una casa que cambia cuando no la mirás.',
      description:
        'Glass Hollow es un juego de terror psicológico ambientado en una casa que cambia de forma cuando no la estás mirando directamente. No hay combate: la única herramienta es prestar atención a los detalles que no encajan.',
      developers: ['Hollow Point Studios'],
      releaseDate: '2022-03-18',
      languages: ['English'],
      price: 12999,
      discount: 0,
      isFree: false,
      rating: 3.6,
      reviewsCount: 150,
      plays: 7600,
      owned: false,
      recommended: false,
      gradient: 'gradient-a',
      features: [
        'Terror psicológico sin combate',
        'Casa procedural que cambia entre partidas',
        'Duración aproximada de 3 horas',
        'Múltiples finales ocultos',
      ],
      editions: [{ name: 'Edición Estándar', price: 12999, includes: 'Juego base' }],
      dlc: [],
      minReq: { os: 'Windows 10 64-bit', cpu: 'Intel i3-6100 / Ryzen 3 1200', ram: '8 GB', gpu: 'GTX 1050', storage: '10 GB' },
      recReq: { os: 'Windows 10/11 64-bit', cpu: 'Intel i5-9400 / Ryzen 5 2600', ram: '16 GB', gpu: 'GTX 1650', storage: '10 GB SSD' },
      mods: [],
      reviews: [{ user: 'insomne_92', rating: 3, language: 'English', date: '2025-10-02', text: 'Creepy concept but a bit short for the price.' }],
    },
  ];

  const PACKS = [
    {
      id: 'coleccion-frontier',
      name: 'Colección Frontier',
      description: 'Dos aventuras de Vantage Dark en un solo pack: infiltración urbana y exploración espacial.',
      gameIds: ['nightfall-circuit', 'static-frontier'],
      packPrice: 24999,
      gradient: 'gradient-a',
    },
    {
      id: 'pack-supervivencia',
      name: 'Pack Supervivencia',
      description: 'Construí, sobreviví y comandá: dos juegos de gestión de recursos y estrategia.',
      gameIds: ['rust-and-ember', 'iron-tide'],
      packPrice: 26999,
      gradient: 'gradient-d',
    },
  ];

  const clone = (value) => JSON.parse(JSON.stringify(value));

  async function getAllGames() {
    return clone(GAMES);
  }

  async function getGameById(id) {
    const game = GAMES.find((g) => g.id === id);
    return game ? clone(game) : null;
  }

  async function getMostPlayedGame() {
    if (!GAMES.length) return null;
    const top = [...GAMES].sort((a, b) => b.plays - a.plays)[0];
    return clone(top);
  }

  async function getTrendingGames() {
    return clone(GAMES.filter((g) => g.recommended));
  }

  async function getNews() {
    return clone(NEWS);
  }

  async function getAllPacks() {
    return clone(PACKS);
  }

  async function getPackById(id) {
    const pack = PACKS.find((p) => p.id === id);
    return pack ? clone(pack) : null;
  }

  async function getGamesByDeveloper(developerName, excludeId) {
    return clone(GAMES.filter((g) => g.developers.includes(developerName) && g.id !== excludeId));
  }

  async function getDeveloperInfo(name) {
    return DEVELOPERS[name] || { blurb: 'Sin información adicional disponible.', founded: null };
  }

  async function getStoreSections() {
    return {
      ofertas: clone(GAMES.filter((g) => g.discount > 0)),
      packs: clone(PACKS),
      mejorValorados: clone([...GAMES].sort((a, b) => b.rating - a.rating)),
      masJugados: clone([...GAMES].sort((a, b) => b.plays - a.plays)),
      recienLanzados: clone([...GAMES].sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))),
    };
  }

  async function searchGames(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return clone(
      GAMES.filter(
        (g) => g.name.toLowerCase().includes(q) || g.genre.toLowerCase().includes(q) || g.tags.some((t) => t.toLowerCase().includes(q))
      )
    );
  }

  async function getFilterOptions() {
    return {
      genres: [...new Set(GAMES.map((g) => g.genre))].sort(),
      languages: [...new Set(GAMES.flatMap((g) => g.languages))].sort(),
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
    getFilterOptions,
  };
})();
