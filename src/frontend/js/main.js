import { state } from './state.js';
import { $, showToast } from './utils.js';
import { getSubjects, createSubject, deleteSubject } from './api.js';
import { logout } from './auth.js';
import { renderLogin } from './views/login.js';
import { renderAppLayout, setUserEmail, showEmptyState } from './views/app.js';
import { renderSubjectsList } from './views/sidebar.js';
import { showSubject } from './views/subject.js';
import { showExam } from './views/exam.js';

function init() {
  if (state.token && state.userEmail) {
    showApp();
  } else if (state.token) {
    showApp();
  } else {
    renderLogin();
  }
}

async function showApp() {
  renderAppLayout();
  setUserEmail(state.userEmail);
  const subjects = await getSubjects();
  if (subjects === null) return;
  state.subjects = subjects || [];
  renderSubjectsList(state.subjects, null);
  showEmptyState();
  wireSidebarEvents();
  wireNavigationEvents();
  wireTopbarEvents();
}

function wireSidebarEvents() {
  const subjectsList = $('#subjects-list');

  subjectsList.addEventListener('click', async (e) => {
    const subjectItem = e.target.closest('[data-nav="subject"]');
    if (subjectItem) {
      const id = subjectItem.dataset.id;
      const name = subjectItem.dataset.name;
      if (id && name) {
        await navigateToSubject(id, name);
      }
      return;
    }

    const deleteBtn = e.target.closest('[data-action="delete-subject"]');
    if (deleteBtn) {
      e.stopPropagation();
      const id = deleteBtn.dataset.id;
      await deleteSubject(id);
      await refreshSidebar();
      if (state.currentSubjectId === id) {
        state.currentSubjectId = null;
        state.currentSubjectName = null;
        showEmptyState();
      }
      return;
    }
  });

  $('#create-subject-btn').addEventListener('click', async () => {
    const input = $('#new-subject-input');
    const name = input.value.trim();
    if (!name) return;
    const result = await createSubject(name);
    if (result) {
      input.value = '';
      await refreshSidebar();
      await navigateToSubject(result.id, result.name);
    }
  });

  $('#new-subject-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('#create-subject-btn').click();
  });
}

function wireNavigationEvents() {
  document.getElementById('main-content').addEventListener('click', (e) => {
    const navEl = e.target.closest('[data-nav]');
    if (!navEl) return;
    const action = navEl.dataset.nav;

    if (action === 'back-to-subjects') {
      showEmptyState();
      state.currentSubjectId = null;
      state.currentSubjectName = null;
      renderSubjectsList(state.subjects, null);
    } else if (action === 'back-to-subject') {
      if (state.currentSubjectId && state.currentSubjectName) {
        navigateToSubject(state.currentSubjectId, state.currentSubjectName);
      } else {
        showEmptyState();
      }
    } else if (action === 'exam') {
      const examId = navEl.dataset.examId;
      if (examId) navigateToExam(examId);
    }
  });

  window.addEventListener('nav:subject', (e) => {
    const { subjectId, subjectName } = e.detail;
    if (subjectId && subjectName) {
      navigateToSubject(subjectId, subjectName);
    } else {
      showEmptyState();
    }
  });

  window.addEventListener('nav:exam', (e) => {
    const { examId } = e.detail;
    if (examId) navigateToExam(examId);
  });
}

function wireTopbarEvents() {
  $('#logout-btn').addEventListener('click', () => {
    logout();
  });
}

async function navigateToSubject(subjectId, subjectName) {
  state.currentSubjectId = subjectId;
  state.currentSubjectName = subjectName;
  state.currentExamId = null;
  state.examQuestions = [];
  state.userAnswers = [];
  renderSubjectsList(state.subjects, subjectId);
  await showSubject(subjectId, subjectName);
}

async function navigateToExam(examId) {
  await showExam(examId);
}

async function refreshSidebar() {
  const subjects = await getSubjects();
  if (subjects === null) return;
  state.subjects = subjects || [];
  renderSubjectsList(state.subjects, state.currentSubjectId);
}

window.addEventListener('auth:login', showApp);
window.addEventListener('auth:logout', () => {
  renderLogin();
});
window.addEventListener('auth:expired', () => {
  renderLogin();
});

init();