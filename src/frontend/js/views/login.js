import { $ } from '../utils.js';
import { initLogin } from '../auth.js';

export function renderLogin() {
  $('#view-login').classList.remove('hidden');
  $('#app-layout').classList.add('hidden');
  const loginError = $('#login-error');
  loginError.classList.add('hidden');
  loginError.textContent = '';
  initLogin();
}