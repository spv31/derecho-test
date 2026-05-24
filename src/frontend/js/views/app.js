import { $ } from '../utils.js';
import { createSubject } from '../api.js';
import { logout } from '../auth.js';

let sidebarInitialized = false;

export function renderAppLayout() {
  $('#view-login').classList.add('hidden');
  $('#app-layout').classList.remove('hidden');
  if (!sidebarInitialized) {
    initSidebarBehavior();
    initSettingsMenu();
    sidebarInitialized = true;
  }
}

export function setUserInfo(email) {
  const emailEl = $('#user-email');
  const initialEl = $('#user-initial');
  if (emailEl) emailEl.textContent = email || '';
  if (initialEl) {
    const initial = email ? email.charAt(0).toUpperCase() : '?';
    initialEl.textContent = initial;
  }
}

export function showEmptyState() {
  $('#main-content').innerHTML = `
    <div class="flex flex-col items-center justify-center h-full text-center py-16">
      <svg class="w-16 h-16 text-brand-muted/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
      <h2 class="font-display text-lg font-semibold text-brand-text mb-2">Selecciona una asignatura</h2>
      <p class="text-sm text-brand-muted max-w-sm">Elige una asignatura del menú o pulsa + para crear una nueva</p>
    </div>
  `;
}

function initSidebarBehavior() {
  const sidebar = $('#sidebar');
  const backdrop = $('#sidebar-backdrop');
  const toggle = $('#sidebar-toggle');
  const mobileBtn = $('#mobile-menu-btn');

  if (!sidebar || !backdrop || !toggle || !mobileBtn) return;

  function isMobile() {
    return window.innerWidth < 768;
  }

  function isMobileSidebarOpen() {
    return isMobile() && sidebar.classList.contains('mobile-open');
  }

  function updateMobileBtnVisibility() {
    if (isMobileSidebarOpen()) {
      mobileBtn.classList.add('hidden');
    } else if (isMobile() || sidebar.classList.contains('desktop-collapsed')) {
      mobileBtn.classList.remove('hidden');
    } else {
      mobileBtn.classList.add('hidden');
    }
  }

  function setDesktopCollapsed(collapsed) {
    sidebar.classList.toggle('desktop-collapsed', collapsed);
    localStorage.setItem('sidebar_collapsed', collapsed ? 'true' : 'false');
    updateMobileBtnVisibility();
  }

  function getDesktopCollapsed() {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  }

  function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    backdrop.classList.add('hidden');
    updateMobileBtnVisibility();
  }

  function openMobileSidebar() {
    sidebar.classList.add('mobile-open');
    backdrop.classList.remove('hidden');
    updateMobileBtnVisibility();
  }

  toggle.addEventListener('click', () => {
    if (isMobile()) {
      closeMobileSidebar();
    } else {
      setDesktopCollapsed(!sidebar.classList.contains('desktop-collapsed'));
    }
  });

  mobileBtn.addEventListener('click', () => {
    if (sidebar.classList.contains('desktop-collapsed')) {
      setDesktopCollapsed(false);
    } else if (isMobile()) {
      if (isMobileSidebarOpen()) {
        closeMobileSidebar();
      } else {
        openMobileSidebar();
      }
    }
  });

  if (backdrop) {
    backdrop.addEventListener('click', closeMobileSidebar);
  }

  let prevMobile = isMobile();
  window.addEventListener('resize', () => {
    const nowMobile = isMobile();
    if (nowMobile !== prevMobile) {
      if (nowMobile) {
        sidebar.classList.remove('desktop-collapsed');
        closeMobileSidebar();
      } else {
        sidebar.classList.remove('mobile-open');
        backdrop.classList.add('hidden');
        if (getDesktopCollapsed()) {
          sidebar.classList.add('desktop-collapsed');
        }
      }
      prevMobile = nowMobile;
    }
    updateMobileBtnVisibility();
  });

  if (isMobile()) {
    closeMobileSidebar();
  } else if (getDesktopCollapsed()) {
    sidebar.classList.add('desktop-collapsed');
  }
  updateMobileBtnVisibility();

  document.addEventListener('click', (e) => {
    const subjectItem = e.target.closest('#subjects-list [data-nav="subject"]');
    if (subjectItem && isMobile()) {
      closeMobileSidebar();
    }
  });

  // Inline create
  const addBtn = $('#add-subject-btn');
  const inlineCreate = $('#inline-create');
  const inlineInput = $('#inline-subject-input');

  if (addBtn && inlineCreate && inlineInput) {
    addBtn.addEventListener('click', () => {
      inlineCreate.classList.remove('hidden');
      inlineInput.value = '';
      inlineInput.focus();
    });

    inlineInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const name = inlineInput.value.trim();
        if (!name) {
          inlineCreate.classList.add('hidden');
          return;
        }
        const result = await createSubject(name);
        if (result) {
          inlineCreate.classList.add('hidden');
          inlineInput.value = '';
          window.dispatchEvent(new CustomEvent('sidebar:refresh'));
          window.dispatchEvent(new CustomEvent('nav:subject', {
            detail: { subjectId: result.id, subjectName: result.name }
          }));
        }
      } else if (e.key === 'Escape') {
        inlineCreate.classList.add('hidden');
        inlineInput.value = '';
      }
    });

    inlineInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (inlineInput.value.trim() === '') {
          inlineCreate.classList.add('hidden');
        }
      }, 150);
    });
  }
}

function initSettingsMenu() {
  const btn = $('#settings-btn');
  const menu = $('#settings-menu');
  const logoutBtn = $('#logout-btn');

  if (!btn || !menu || !logoutBtn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });

  logoutBtn.addEventListener('click', () => {
    logout();
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') menu.classList.add('hidden');
  });
}