import { state } from './state.js?v=1';
import { $, showConfirmModal, showToast } from './utils.js?v=1';
import { getSubjects, deleteSubject, renameSubject } from './api.js?v=1';
import { renderLogin } from './views/login.js?v=1';
import { renderAppLayout, setUserInfo, showEmptyState } from './views/app.js?v=1';
import { renderSubjectsList } from './views/sidebar.js?v=1';
import { showSubject } from './views/subject.js?v=1';
import { showExam } from './views/exam.js?v=1';
import { showSummary } from './views/summary.js?v=1';

/* ── Boot ── */

function init() {
  if (state.token) {
    showApp();
  } else {
    renderLogin();
  }
}

async function showApp() {
  renderAppLayout();
  setUserInfo(state.userEmail);

  const subjects = await getSubjects();
  if (subjects === null) return;          // API error — layout stays visible
  state.subjects = subjects;

  renderSubjectsList(state.subjects, null);
  showEmptyState();
  wireSidebarClicks();
  wireNavigation();
}

/* ── Sidebar subject list clicks ── */

function wireSidebarClicks() {
  const list = $('#subjects-list');
  if (!list) return;

  list.addEventListener('click', async (e) => {
    // Check delete button FIRST — it lives inside [data-nav="subject"] so it
    // must be matched before the subject-navigation check, otherwise the parent
    // match wins and the delete handler is never reached.
    const delBtn = e.target.closest('[data-action="delete-subject"]');
    if (delBtn) {
      e.stopPropagation();
      const id = delBtn.dataset.id;
      const name = delBtn.closest('[data-nav="subject"]')?.dataset?.name || 'esta asignatura';
      const confirmed = await showConfirmModal({
        title: 'Eliminar asignatura',
        message: `¿Seguro que quieres eliminar "${name}"? Se borrarán también todos sus documentos y exámenes.`,
        confirmText: 'Eliminar',
        confirmClass: 'bg-brand-error hover:bg-red-700',
      });
      if (!confirmed) return;
      const result = await deleteSubject(id);
      if (result === null) return;
      showToast(`Asignatura "${name}" eliminada`, 'success');
      await refreshSidebar();
      if (state.currentSubjectId === id) {
        state.currentSubjectId = null;
        state.currentSubjectName = null;
        state.currentSummaryId = null;
        showEmptyState();
      }
      return;
    }

    const renameBtn = e.target.closest('[data-action="rename-subject"]');
    if (renameBtn) {
      e.stopPropagation();
      const subjectItem = renameBtn.closest('[data-nav="subject"]');
      if (!subjectItem) return;
      const id = subjectItem.dataset.id;
      const nameSpan = subjectItem.querySelector('span.truncate');
      if (!nameSpan) return;
      const currentName = nameSpan.textContent;

      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentName;
      input.className = 'bg-brand-bg border border-brand-accent rounded px-2 py-0.5 text-sm text-brand-text focus:ring-2 focus:ring-brand-accent outline-none flex-1 min-w-0';
      nameSpan.replaceWith(input);
      input.focus();
      input.select();

      let saved = false;
      async function save() {
        if (saved) return;
        saved = true;
        const newName = input.value.trim();
        if (!newName || newName === currentName) {
          const span = document.createElement('span');
          span.className = 'text-sm truncate flex-1';
          span.textContent = currentName;
          input.replaceWith(span);
          return;
        }
        const result = await renameSubject(id, newName);
        if (result) {
          showToast('Asignatura renombrada', 'success');
          if (state.currentSubjectId === id) {
            state.currentSubjectName = newName;
          }
          await refreshSidebar();
          if (state.currentSubjectId === id) {
            await showSubject(id, newName);
          }
        } else {
          const span = document.createElement('span');
          span.className = 'text-sm truncate flex-1';
          span.textContent = currentName;
          input.replaceWith(span);
        }
      }

      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); save(); }
        else if (ev.key === 'Escape') {
          saved = true;
          const span = document.createElement('span');
          span.className = 'text-sm truncate flex-1';
          span.textContent = currentName;
          input.replaceWith(span);
        }
      });
      input.addEventListener('blur', () => save());
      return;
    }

    const subjectItem = e.target.closest('[data-nav="subject"]');
    if (subjectItem) {
      const { id, name } = subjectItem.dataset;
      if (id && name) await navigateToSubject(id, name);
    }
  });
}

/* ── Main-content navigation ── */

function wireNavigation() {
  const main = $('#main-content');
  if (!main) return;

  main.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (!nav) return;

    const action = nav.dataset.nav;
    if (action === 'back-to-subjects') {
      state.currentSubjectId = null;
      state.currentSubjectName = null;
      renderSubjectsList(state.subjects, null);
      showEmptyState();
    } else if (action === 'back-to-subject') {
      if (state.currentSubjectId && state.currentSubjectName) {
        navigateToSubject(state.currentSubjectId, state.currentSubjectName);
      } else {
        showEmptyState();
      }
    } else if (action === 'exam') {
      const examId = nav.dataset.examId;
      if (examId) navigateToExam(examId);
    } else if (action === 'summary') {
      const summaryId = nav.dataset.summaryId;
      if (summaryId) navigateToSummary(summaryId);
    }
  });

  window.addEventListener('nav:subject', (e) => {
    const { subjectId, subjectName } = e.detail;
    if (subjectId && subjectName) navigateToSubject(subjectId, subjectName);
    else showEmptyState();
  });

  window.addEventListener('nav:exam', (e) => {
    if (e.detail.examId) navigateToExam(e.detail.examId);
  });

  window.addEventListener('nav:summary', (e) => {
    if (e.detail.summaryId) navigateToSummary(e.detail.summaryId);
  });
}

/* ── Helpers ── */

async function navigateToSubject(id, name) {
  state.currentSubjectId = id;
  state.currentSubjectName = name;
  state.currentExamId = null;
  state.examQuestions = [];
  state.userAnswers = [];
  state.currentSummaryId = null;
  renderSubjectsList(state.subjects, id);
  await showSubject(id, name);
}

async function navigateToExam(examId) {
  await showExam(examId);
}

async function navigateToSummary(summaryId) {
  await showSummary(summaryId);
}

async function refreshSidebar() {
  const subjects = await getSubjects();
  if (subjects === null) return;
  state.subjects = subjects;
  renderSubjectsList(state.subjects, state.currentSubjectId);
}

/* ── Global events ── */

window.addEventListener('sidebar:refresh', refreshSidebar);
window.addEventListener('auth:login', showApp);
window.addEventListener('auth:logout', () => renderLogin());
window.addEventListener('auth:expired', () => renderLogin());

init();
