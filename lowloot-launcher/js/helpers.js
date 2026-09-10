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
