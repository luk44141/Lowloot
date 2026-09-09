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

// Fecha + hora exacta (para "agregado a la wishlist el ..."), a diferencia
// de formatDate que solo muestra el día.
function formatDateTime(isoDateTime) {
  if (!isoDateTime) return '';
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function scrollMainTop() {
  qs('.main').scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- Modal de confirmación (reemplaza window.confirm) ---------- */
// message puede traer HTML simple (ya viene escapado por quien llama cuando
// hace falta); devuelve una Promise<boolean> con la elección del usuario.
function showConfirmModal({ title = 'Confirmar', message = '', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar' } = {}) {
  const overlay = document.getElementById('confirm-modal-overlay');
  if (!overlay) return Promise.resolve(window.confirm(message.replace(/<[^>]+>/g, '')));

  return new Promise((resolve) => {
    qs('#confirm-modal-title').textContent = title;
    qs('#confirm-modal-message').innerHTML = message;

    const acceptBtn = qs('#confirm-modal-accept');
    const cancelBtn = qs('#confirm-modal-cancel');
    acceptBtn.textContent = confirmLabel;
    cancelBtn.textContent = cancelLabel;

    function cleanup(result) {
      overlay.classList.remove('open');
      acceptBtn.removeEventListener('click', onAccept);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlay);
      document.removeEventListener('keydown', onKeydown);
      resolve(result);
    }
    function onAccept() {
      cleanup(true);
    }
    function onCancel() {
      cleanup(false);
    }
    function onOverlay(event) {
      if (event.target === overlay) cleanup(false);
    }
    function onKeydown(event) {
      if (event.key === 'Escape') cleanup(false);
    }

    acceptBtn.addEventListener('click', onAccept);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlay);
    document.addEventListener('keydown', onKeydown);
    overlay.classList.add('open');
  });
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
