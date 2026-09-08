// api-client.js
//
// Único lugar del frontend que sabe cómo pedirle datos a la API real
// (lowloot-server + PostgreSQL). No hay lógica de negocio acá, solo el
// fetch y el manejo de errores de red/HTTP.
//
// Si el día de mañana cambia la URL base o se agregan más endpoints
// (/packs, /news, /library, etc.), este es el archivo a tocar.

const LowlootAPI = (() => {
  const BASE_URL = 'http://localhost:8080';

  async function getGames() {
    const res = await fetch(`${BASE_URL}/games`);
    if (!res.ok) {
      throw new Error(`GET /games devolvió ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  return {
    getGames,
  };
})();
