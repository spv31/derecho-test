import { $ } from "../utils.js?v=2";
import { createSubject } from "../api.js?v=2";
import { logout } from "../auth.js?v=2";

let initialized = false;

export function renderAppLayout() {
  $("#view-login").classList.add("hidden");
  $("#app-layout").classList.remove("hidden");
  if (!initialized) {
    initialized = true;
    setupSidebar();
    setupSettingsMenu();
    setupInlineCreate();
  }
}

export function setUserInfo(email) {
  const emailEl = $("#user-email");
  const initialEl = $("#user-initial");
  if (emailEl) emailEl.textContent = email || "";
  if (initialEl) {
    initialEl.textContent = email ? email.charAt(0).toUpperCase() : "?";
  }
}

export function showEmptyState() {
  $("#main-content").innerHTML = `
    <div class="flex flex-col items-center justify-center h-full text-center py-16">
      <svg class="w-16 h-16 text-brand-muted/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
      <h2 class="font-display text-lg font-semibold text-brand-text mb-2">Selecciona una asignatura</h2>
      <p class="text-sm text-brand-muted max-w-sm">Elige una asignatura del menú o pulsa + para crear una nueva</p>
    </div>
  `;
}

/* ── Sidebar open/close ── */

function setupSidebar() {
  const sidebar = $("#sidebar");
  const backdrop = $("#sidebar-backdrop");
  const toggleBtn = $("#sidebar-toggle");
  const reopenBtn = $("#mobile-menu-btn");

  if (!sidebar || !toggleBtn || !reopenBtn) return;

  const isMobile = () => window.innerWidth < 768;

  /* Show / hide the floating reopen button */
  function syncReopenBtn() {
    const sidebarHidden = isMobile()
      ? !sidebar.classList.contains("mobile-open")
      : sidebar.classList.contains("desktop-collapsed");
    reopenBtn.classList.toggle("visible", sidebarHidden);
  }

  /* Desktop collapse */
  function setCollapsed(yes) {
    sidebar.classList.toggle("desktop-collapsed", yes);
    localStorage.setItem("sidebar_collapsed", yes ? "1" : "");
    syncReopenBtn();
  }

  /* Mobile drawer */
  function openDrawer() {
    sidebar.classList.add("mobile-open");
    if (backdrop) backdrop.classList.remove("hidden");
    syncReopenBtn();
  }
  function closeDrawer() {
    sidebar.classList.remove("mobile-open");
    if (backdrop) backdrop.classList.add("hidden");
    syncReopenBtn();
  }

  /* Toggle button inside sidebar header */
  toggleBtn.addEventListener("click", () => {
    if (isMobile()) {
      closeDrawer();
    } else {
      setCollapsed(!sidebar.classList.contains("desktop-collapsed"));
    }
  });

  /* Floating reopen / hamburger button */
  reopenBtn.addEventListener("click", () => {
    if (isMobile()) {
      openDrawer();
    } else {
      setCollapsed(false);
    }
  });

  /* Backdrop closes mobile drawer */
  if (backdrop) backdrop.addEventListener("click", closeDrawer);

  /* Resize: clean up state when crossing breakpoint */
  let wasMobile = isMobile();
  window.addEventListener("resize", () => {
    const nowMobile = isMobile();
    if (nowMobile !== wasMobile) {
      if (nowMobile) {
        sidebar.classList.remove("desktop-collapsed");
        closeDrawer();
      } else {
        sidebar.classList.remove("mobile-open");
        if (backdrop) backdrop.classList.add("hidden");
        if (localStorage.getItem("sidebar_collapsed")) {
          sidebar.classList.add("desktop-collapsed");
        }
      }
      wasMobile = nowMobile;
    }
    syncReopenBtn();
  });

  /* Initial state */
  if (isMobile()) {
    closeDrawer();
  } else if (localStorage.getItem("sidebar_collapsed")) {
    sidebar.classList.add("desktop-collapsed");
  }
  syncReopenBtn();

  /* Auto-close mobile drawer when picking a subject */
  document.addEventListener("click", (e) => {
    if (e.target.closest('#subjects-list [data-nav="subject"]') && isMobile()) {
      closeDrawer();
    }
  });
}

/* ── Settings dropdown ── */

/* ── Settings dropdown ── */

function setupSettingsMenu() {
  const btn = $("#settings-btn");
  const menu = $("#settings-menu");
  const logoutBtn = $("#logout-btn");

  // Elementos del tema
  const themeToggleBtn = $("#theme-toggle-btn");
  const sunIcon = $("#theme-icon-sun");
  const moonIcon = $("#theme-icon-moon");
  const themeLabel = $("#theme-toggle-label");

  if (!btn || !menu || !logoutBtn) return;

  // 1. Mostrar/Ocultar menú
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    menu.classList.toggle("hidden");
  });

  // 2. Cerrar sesión
  logoutBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.add("hidden");
    logout();
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.add("hidden");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") menu.classList.add("hidden");
  });

  // 3. Lógica de cambio de tema
  function updateThemeUI(isDark) {
    if (!sunIcon || !moonIcon || !themeLabel) return;
    if (isDark) {
      sunIcon.classList.remove("hidden");
      moonIcon.classList.add("hidden");
      themeLabel.textContent = "Modo claro";
    } else {
      moonIcon.classList.remove("hidden");
      sunIcon.classList.add("hidden");
      themeLabel.textContent = "Modo oscuro";
    }
  }

  // Estado inicial basado en la clase del HTML
  const isDark = document.documentElement.classList.contains("dark");
  updateThemeUI(isDark);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Evita que se cierre el menú al cambiar el tema
      const willBeDark = document.documentElement.classList.toggle("dark");
      localStorage.setItem("theme", willBeDark ? "dark" : "light");
      updateThemeUI(willBeDark);
    });
  }
}

/* ── Inline create subject ── */

function setupInlineCreate() {
  const addBtn = $("#add-subject-btn");
  const wrapper = $("#inline-create");
  const input = $("#inline-subject-input");
  if (!addBtn || !wrapper || !input) return;

  addBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    wrapper.classList.remove("hidden");
    input.value = "";
    // Defer focus so browser finishes click processing first
    requestAnimationFrame(() => input.focus());
  });

  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const name = input.value.trim();
      if (!name) {
        wrapper.classList.add("hidden");
        return;
      }
      const result = await createSubject(name);
      if (result) {
        wrapper.classList.add("hidden");
        input.value = "";
        window.dispatchEvent(new CustomEvent("sidebar:refresh"));
        window.dispatchEvent(
          new CustomEvent("nav:subject", {
            detail: { subjectId: result.id, subjectName: result.name },
          }),
        );
      }
    } else if (e.key === "Escape") {
      wrapper.classList.add("hidden");
      input.value = "";
    }
  });

  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (!input.value.trim()) wrapper.classList.add("hidden");
    }, 200);
  });
}
