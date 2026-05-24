import { state } from './state.js?v=3';
import { $ } from './utils.js?v=3';
import { getSubjects, deleteSubject } from './api.js?v=3';
import { renderLogin } from './views/login.js?v=3';
import { renderAppLayout, setUserInfo, showEmptyState } from './views/app.js?v=3';
import { renderSubjectsList } from './views/sidebar.js?v=3';
import { showSubject } from './views/subject.js?v=3';
import { showExam } from './views/exam.js?v=3';

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
    const subjectItem = e.target.closest('[data-nav="subject"]');
    if (subjectItem) {
      const { id, name } = subjectItem.dataset;
      if (id && name) await navigateToSubject(id, name);
      return;
    }

    const delBtn = e.target.closest('[data-action="delete-subject"]');
    if (delBtn) {
      e.stopPropagation();
      const id = delBtn.dataset.id;
      await deleteSubject(id);
      await refreshSidebar();
      if (state.currentSubjectId === id) {
        state.currentSubjectId = null;
        state.currentSubjectName = null;
        showEmptyState();
      }
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
}

/* ── Helpers ── */

async function navigateToSubject(id, name) {
  state.currentSubjectId = id;
  state.currentSubjectName = name;
  state.currentExamId = null;
  state.examQuestions = [];
  state.userAnswers = [];
  renderSubjectsList(state.subjects, id);
  await showSubject(id, name);
}

async function navigateToExam(examId) {
  await showExam(examId);
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
