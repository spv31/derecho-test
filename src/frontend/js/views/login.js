import { $ } from '../utils.js?v=1';
import { initLogin } from '../auth.js?v=1';

export function renderLogin() {
  $('#view-login').classList.remove('hidden');
  $('#app-layout').classList.add('hidden');
  const loginError = $('#login-error');
  loginError.classList.add('hidden');
  loginError.textContent = '';
  initLogin();
}