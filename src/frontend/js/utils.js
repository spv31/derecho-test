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
    ? 'border-red-500/80 bg-red-950 text-red-200'
    : type === 'success'
      ? 'border-emerald-500/80 bg-emerald-950 text-emerald-200'
      : 'border-brand-accent/40 bg-brand-surface text-brand-text';
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `border ${color} rounded-lg px-4 py-3 text-sm shadow-lg backdrop-blur-sm min-w-[240px] max-w-[380px] animate-[fadeIn_0.2s_ease]`;
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