// helpers.js — utilidades genéricas: selección de DOM, formato de fecha/precio, scroll y toast.
// No depende de ningún otro archivo propio.

const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

// Fecha de referencia para la maqueta (coherente con los datos de prueba).
const NOW = new Date('2026-08-27T00:00:00');

/* ---------- Helpers de formato ---------- */

function formatPrice(n) {
  return '$' + Math.round(n).toLocaleString('es-AR');
}

function formatDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Tiempo relativo para datos reales del backend (notificaciones,
// solicitudes de amistad): a diferencia de NOW de arriba (fecha fija de
// la maqueta del catálogo), acá se usa la hora real del dispositivo,
// porque `createdAt`/`lastActiveAt` vienen con la hora real del servidor.
function formatRelativeTime(isoLocalDateTime) {
  if (!isoLocalDateTime) return '';
  const then = new Date(isoLocalDateTime);
  if (Number.isNaN(then.getTime())) return '';
  const diffMs = Date.now() - then.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 60) return 'Justo ahora';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} d`;
  return then.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function scrollMainTop() {
  qs('.main').scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Toast simple ---------- */

let toastTimeout = null;

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2200);
}
