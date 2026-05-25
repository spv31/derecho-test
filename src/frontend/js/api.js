import { state } from './state.js?v=2';
import { ERROR_MESSAGES, NETWORK_ERROR, UNKNOWN_ERROR, showToast } from './utils.js?v=2';

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

export async function submitResult(examId, answers) {
  return apiFetch(`/api/exams/${examId}/results`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  }, 'exam');
}

export async function getExamResults(examId) {
  return apiFetch(`/api/exams/${examId}/results`);
}

export async function getSummaries(subjectId) {
  return apiFetch(`/api/subjects/${subjectId}/summaries`);
}

export async function generateSummary(subjectId, documentIds) {
  return apiFetch(`/api/subjects/${subjectId}/summaries/generate`, {
    method: 'POST',
    body: JSON.stringify({ document_ids: documentIds }),
  }, 'generate');
}

export async function getSummary(summaryId) {
  return apiFetch(`/api/summaries/${summaryId}`, {}, 'summary');
}

export async function renameSummary(id, title) {
  return apiFetch(`/api/summaries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  }, 'summary');
}

export async function regenerateSummary(id, documentIds) {
  return apiFetch(`/api/summaries/${id}/regenerate`, {
    method: 'POST',
    body: JSON.stringify(documentIds ? { document_ids: documentIds } : {}),
  }, 'generate');
}

export async function deleteSummary(id) {
  return apiFetch(`/api/summaries/${id}`, {
    method: 'DELETE',
  }, 'summary');
}

export async function exportSummary(summaryId, format) {
  try {
    const res = await fetch(`/api/summaries/${summaryId}/export?format=${format}`, {
      headers: { 'Authorization': `Bearer ${state.token}` },
    });
    if (res.status === 401 && state.token) {
      localStorage.removeItem('session_token');
      localStorage.removeItem('user_email');
      state.token = null;
      state.userEmail = '';
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return;
    }
    if (!res.ok) {
      showToast('Error al exportar el resumen', 'error');
      return;
    }
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const filenameMatch = disposition.match(/filename="?(.+?)"?$/);
    const filename = filenameMatch ? filenameMatch[1] : `resumen.${format}`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Export error:', err);
    showToast('Error de red al exportar', 'error');
  }
}