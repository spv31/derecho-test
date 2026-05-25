import { state } from './state.js?v=1';
import { ERROR_MESSAGES, NETWORK_ERROR, UNKNOWN_ERROR, showToast } from './utils.js?v=1';

export async function apiFetch(url, options = {}, errorContext) {
  const headers = options.headers || {};
  if (state.token && !url.includes('/api/config') && !url.includes('/api/auth/')) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  try {
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 && state.token) {
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_email');
      state.token = null;
      state.userEmail = '';
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return null;
    }
    if (!res.ok) {
      const status = res.status;
      const msg = ERROR_MESSAGES[status]
        ? (errorContext && ERROR_MESSAGES[status][errorContext]) || ERROR_MESSAGES[status].default
        : UNKNOWN_ERROR;
      const body = await res.text().catch(() => '');
      console.error(`API error ${res.status} on ${url}:`, body);
      showToast(msg, 'error');
      return null;
    }
    if (res.status === 204) return {};
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    if (err instanceof TypeError) {
      console.error('Network error:', err);
      showToast(NETWORK_ERROR, 'error');
      return null;
    }
    throw err;
  }
}

export async function getConfig() {
  return apiFetch('/api/config');
}

export async function getSubjects() {
  return apiFetch('/api/subjects');
}

export async function createSubject(name) {
  return apiFetch('/api/subjects', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function deleteSubject(id) {
  return apiFetch(`/api/subjects/${id}`, {
    method: 'DELETE',
  }, 'subject');
}

export async function getDocuments(subjectId) {
  return apiFetch(`/api/subjects/${subjectId}/documents`);
}

export async function uploadDocument(subjectId, file) {
  const fd = new FormData();
  fd.append('files', file);
  return apiFetch(`/api/subjects/${subjectId}/documents`, {
    method: 'POST',
    body: fd,
  }, 'upload');
}

export async function deleteDocument(id) {
  return apiFetch(`/api/documents/${id}`, {
    method: 'DELETE',
  }, 'document');
}

export async function getExams(subjectId) {
  return apiFetch(`/api/subjects/${subjectId}/exams`);
}

export async function generateExam(subjectId, documentIds, questionCount) {
  return apiFetch(`/api/subjects/${subjectId}/exams/generate`, {
    method: 'POST',
    body: JSON.stringify({ document_ids: documentIds, question_count: questionCount }),
  }, 'generate');
}

export async function getExam(examId) {
  return apiFetch(`/api/exams/${examId}`);
}

export async function deleteExam(id) {
  return apiFetch(`/api/exams/${id}`, {
    method: 'DELETE',
  }, 'exam');
}

export async function renameSubject(id, name) {
  return apiFetch(`/api/subjects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  }, 'subject');
}

export async function renameExam(id, title) {
  return apiFetch(`/api/exams/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  }, 'exam');
}