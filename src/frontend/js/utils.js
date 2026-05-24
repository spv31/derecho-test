export function $(sel) {
  return document.querySelector(sel);
}

export function $$(sel) {
  return document.querySelectorAll(sel);
}

export function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

export function showToast(message, type = 'info') {
  const color = type === 'error'
    ? 'border-red-500/50 bg-red-50 text-red-800 dark:border-red-500/80 dark:bg-red-950 dark:text-red-300'
    : type === 'success'
      ? 'border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:border-emerald-500/80 dark:bg-emerald-950 dark:text-emerald-300'
      : 'border-brand-accent/50 bg-brand-surface text-brand-text';
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `border ${color} rounded-lg px-4 py-3 text-sm shadow-lg min-w-[220px] max-w-[360px] animate-[fadeIn_0.2s_ease]`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

export function showLoading(show) {
  document.getElementById('loading-overlay').classList.toggle('hidden', !show);
}

export function showConfirmModal({ title, message, confirmText, confirmClass }) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/60';

    const card = document.createElement('div');
    card.className = 'bg-brand-surface border border-brand-border rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl';

    card.innerHTML = `
      <h3 class="font-display text-lg font-semibold text-brand-text mb-2">${escapeHtml(title)}</h3>
      <p class="text-sm text-brand-muted mb-5">${escapeHtml(message)}</p>
      <div class="flex justify-end gap-3">
        <button class="cancel-btn px-4 py-2 text-sm rounded-lg border border-brand-border text-brand-muted hover:text-brand-text hover:bg-brand-bg transition-colors">Cancelar</button>
        <button class="confirm-btn px-4 py-2 text-sm rounded-lg text-white transition-colors ${confirmClass || 'bg-brand-accent hover:bg-brand-accent-h'}">${escapeHtml(confirmText || 'Confirmar')}</button>
      </div>
    `;

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    function close() {
      overlay.remove();
      document.removeEventListener('keydown', handleEscape);
      resolve(false);
    }

    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

    card.querySelector('.cancel-btn').addEventListener('click', close);

    card.querySelector('.confirm-btn').addEventListener('click', () => {
      overlay.remove();
      document.removeEventListener('keydown', handleEscape);
      resolve(true);
    });

    function handleEscape(e) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', handleEscape);
  });
}

export function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export const ERROR_MESSAGES = {
  400: {
    default: 'La información enviada no es válida. Revísala e inténtalo de nuevo.',
    upload: 'No hemos podido leer el archivo. Asegúrate de que no esté dañado.',
  },
  401: {
    default: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
  },
  403: {
    default: 'Tu cuenta no tiene acceso a esta aplicación.',
  },
  404: {
    default: 'No hemos encontrado lo que buscabas.',
    subject: 'Esta asignatura ya no existe.',
    document: 'Este documento ya no existe.',
    exam: 'Este examen ya no existe.',
  },
  413: {
    upload: 'El archivo es demasiado grande. El máximo es 25 MB.',
  },
  422: {
    default: 'Faltan datos o son incorrectos.',
    generate: 'Selecciona al menos un documento y entre 1 y 30 preguntas.',
  },
  429: {
    default: 'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.',
  },
  502: {
    default: 'El servicio no responde. Inténtalo en unos segundos.',
    generate: 'No hemos podido generar el examen. Inténtalo de nuevo en unos segundos.',
  },
  500: {
    default: 'Ha ocurrido un error. Inténtalo más tarde.',
  },
};

export const NETWORK_ERROR = 'No hemos podido conectar con el servidor. Comprueba tu conexión.';
export const UNKNOWN_ERROR = 'Ha ocurrido un error inesperado. Inténtalo de nuevo.';