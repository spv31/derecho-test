import { state } from './state.js';
import { $, showToast } from './utils.js';
import { getSubjects, createSubject, deleteSubject } from './api.js';
import { logout } from './auth.js';
import { renderLogin } from './views/login.js';
import { renderAppLayout, setUserInfo, showEmptyState } from './views/app.js';
import { renderSubjectsList } from './views/sidebar.js';
import { showSubject } from './views/subject.js';
import { showExam } from './views/exam.js';

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
  if (subjects === null) return;
  state.subjects = subjects || [];
  renderSubjectsList(state.subjects, null);
  showEmptyState();
  wireSidebarEvents();
  wireNavigationEvents();
  wireSettingsEvents();
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

  // Inline create: show input on + button click
  const addBtn = $('#add-subject-btn');
  const inlineCreate = $('#inline-create');
  const inlineInput = $('#inline-subject-input');

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
        await refreshSidebar();
        await navigateToSubject(result.id, result.name);
      }
    } else if (e.key === 'Escape') {
      inlineCreate.classList.add('hidden');
      inlineInput.value = '';
    }
  });

  inlineInput.addEventListener('blur', () => {
    // Small delay so a click on something else processes first
    setTimeout(() => {
      if (inlineInput.value.trim() === '') {
        inlineCreate.classList.add('hidden');
      }
    }, 150);
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

function wireSettingsEvents() {
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