import { $ } from '../utils.js';

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

  function isMobile() {
    return window.innerWidth < 768;
  }

  function setDesktopCollapsed(collapsed) {
    sidebar.classList.toggle('desktop-collapsed', collapsed);
    localStorage.setItem('sidebar_collapsed', collapsed ? 'true' : 'false');
  }

  function getDesktopCollapsed() {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  }

  function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    backdrop.classList.add('hidden');
  }

  function openMobileSidebar() {
    sidebar.classList.add('mobile-open');
    backdrop.classList.remove('hidden');
  }

  // Sidebar toggle (inside sidebar header — collapses on desktop, closes on mobile)
  toggle.addEventListener('click', () => {
    if (isMobile()) {
      closeMobileSidebar();
    } else {
      setDesktopCollapsed(!sidebar.classList.contains('desktop-collapsed'));
    }
  });

  // Mobile hamburger button (floating, outside sidebar — opens sidebar)
  mobileBtn.addEventListener('click', () => {
    openMobileSidebar();
  });

  // Backdrop click closes mobile sidebar
  backdrop.addEventListener('click', closeMobileSidebar);

  // Handle resize
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
  });

  // Initial state
  if (isMobile()) {
    closeMobileSidebar();
  } else if (getDesktopCollapsed()) {
    sidebar.classList.add('desktop-collapsed');
  }

  // Close mobile sidebar when selecting a subject
  document.addEventListener('click', (e) => {
    const subjectItem = e.target.closest('#subjects-list [data-nav="subject"]');
    if (subjectItem && isMobile()) {
      closeMobileSidebar();
    }
  });
}

function initSettingsMenu() {
  const btn = $('#settings-btn');
  const menu = $('#settings-menu');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.add('hidden');
    }
  });

  // Close menu on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') menu.classList.add('hidden');
  });
}