import { state } from './state.js';
import { $, parseJwt } from './utils.js';
import { apiFetch } from './api.js';

export async function initLogin() {
  const config = await apiFetch('/api/config');
  if (!config || !config.google_client_id) {
    $('#login-error').textContent = 'Error al cargar la configuración de inicio de sesión.';
    $('#login-error').classList.remove('hidden');
    return;
  }
  if (typeof google === 'undefined') {
    setTimeout(() => initLogin(), 500);
    return;
  }
  google.accounts.id.initialize({
    client_id: config.google_client_id,
    callback: handleCredentialResponse,
  });
  google.accounts.id.renderButton(
    document.getElementById('google-signin-button'),
    { theme: 'outline', size: 'large', shape: 'pill', text: 'signin_with', locale: 'es' }
  );
}

export async function handleCredentialResponse(response) {
  const result = await apiFetch('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ id_token: response.credential }),
  });
  if (!result) return;
  state.token = result.token;
  localStorage.setItem('session_token', result.token);
  const payload = parseJwt(response.credential);
  if (payload && payload.email) {
    state.userEmail = payload.email;
    localStorage.setItem('user_email', payload.email);
  }
  window.dispatchEvent(new CustomEvent('auth:login'));
}

export function logout() {
  localStorage.removeItem('session_token');
  localStorage.removeItem('user_email');
  state.token = null;
  state.userEmail = '';
  state.currentSubjectId = null;
  state.currentSubjectName = null;
  state.currentExamId = null;
  state.examQuestions = [];
  state.userAnswers = [];
  window.dispatchEvent(new CustomEvent('auth:logout'));
}