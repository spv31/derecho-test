import { state } from '../state.js?v=1';
import { $, $$, escapeHtml, showToast, showLoading, showConfirmModal, formatDate } from '../utils.js?v=1';
import { getDocuments, uploadDocument, deleteDocument, getExams, generateExam } from '../api.js?v=1';

export async function showSubject(subjectId, subjectName) {
  state.currentSubjectId = subjectId;
  state.currentSubjectName = subjectName;
  state.currentExamId = null;
  state.examQuestions = [];
  state.userAnswers = [];

  $('#main-content').innerHTML = getSubjectHtml(subjectName);
  await loadSubjectData();
}

function getSubjectHtml(subjectName) {
  return `
    <div class="max-w-3xl">
      <div class="mb-6">
        <h2 class="font-display text-xl font-semibold text-brand-text">${escapeHtml(subjectName)}</h2>
      </div>

      <div class="mb-8">
        <h3 class="font-display text-sm font-semibold text-brand-muted mb-3">Documentos</h3>

        <div id="upload-zone" class="border-2 border-dashed border-brand-border rounded-lg bg-brand-surface/50 p-6 text-center cursor-pointer transition-colors hover:border-brand-accent/50 mb-4">
          <svg class="w-8 h-8 mx-auto mb-2 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"/></svg>
          <p class="text-brand-muted text-sm">Arrastra aquí tus apuntes (PDF o PPTX) o haz clic para subirlos</p>
          <input id="file-input" type="file" accept=".pdf,.pptx" multiple class="hidden" />
        </div>

        <div id="documents-list" class="space-y-2"></div>
        <div id="documents-empty" class="hidden text-brand-muted text-sm text-center py-4">No hay documentos en esta asignatura</div>
      </div>

      <div class="mb-8">
        <h3 class="font-display text-sm font-semibold text-brand-muted mb-3">Generar examen</h3>
        <div class="bg-brand-surface border border-brand-border rounded-xl p-5">
          <p class="text-sm text-brand-muted mb-4">Selecciona los documentos que quieres incluir en el examen</p>
          <div class="mb-5">
            <div id="select-all-row" class="hidden justify-end mb-2">
              <button id="select-all-btn" class="text-xs text-brand-accent hover:underline transition-colors">Seleccionar todos</button>
            </div>
            <div id="doc-selector" class="space-y-2 max-h-56 overflow-y-auto"></div>
            <p id="doc-selector-empty" class="text-sm text-brand-muted/60 py-4 text-center">Sube documentos para poder generar exámenes</p>
          </div>
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-brand-border/50">
            <div class="flex items-center gap-2">
              <input id="question-count" type="number" min="1" max="30" value="5" class="w-16 bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text focus:ring-2 focus:ring-brand-accent focus:border-brand-accent outline-none transition-all" />
              <span class="text-sm text-brand-muted">preguntas</span>
            </div>
            <button id="generate-exam-btn" class="sm:ml-auto bg-brand-accent hover:bg-brand-accent-h text-white text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"/></svg>
              Generar examen
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 class="font-display text-sm font-semibold text-brand-muted mb-3">Exámenes anteriores</h3>
        <div id="exams-list" class="space-y-2"></div>
        <div id="exams-empty" class="hidden text-brand-muted text-sm text-center py-4">Aún no has generado ningún examen</div>
      </div>
    </div>
  `;
}

async function loadSubjectData() {
  const id = state.currentSubjectId;
  const [documents, exams] = await Promise.all([
    getDocuments(id),
    getExams(id),
  ]);
  renderDocuments(documents || []);
  renderDocSelector(documents || []);
  renderExams(exams || []);
  wireSubjectEvents();
}

function renderDocuments(docs) {
  const container = $('#documents-list');
  const empty = $('#documents-empty');
  container.innerHTML = '';
  if (docs.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  docs.forEach(doc => {
    let statusText, statusColor;
    switch (doc.status) {
      case 'ready':
        statusText = 'Listo';
        statusColor = 'text-emerald-400';
        break;
      case 'processing':
        statusText = 'Procesando';
        statusColor = 'text-amber-400';
        break;
      default:
        statusText = 'Error';
        statusColor = 'text-brand-error';
    }
    const el = document.createElement('div');
    el.className = 'bg-brand-surface border border-brand-border rounded-lg px-3 py-2 flex items-center justify-between';
    el.innerHTML = `
      <div class="flex items-center gap-2 min-w-0">
        <svg class="w-4 h-4 text-brand-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
        <span class="text-sm truncate">${escapeHtml(doc.filename)}</span>
        <span class="text-xs ${statusColor}">${statusText}</span>
      </div>
      <button class="delete-doc-btn text-brand-muted hover:text-brand-error transition-colors ml-2" data-action="delete-document" data-id="${doc.id}" data-filename="${escapeHtml(doc.filename)}" title="Eliminar">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    `;
    container.appendChild(el);
  });
}

function renderDocSelector(docs) {
  const container = $('#doc-selector');
  const empty = $('#doc-selector-empty');
  container.innerHTML = '';
  const ready = docs.filter(d => d.status === 'ready');
  if (ready.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  ready.forEach(doc => {
    const label = document.createElement('label');
    label.className = 'flex items-center gap-3 px-3.5 py-3 rounded-lg border border-brand-border bg-brand-bg/50 hover:border-brand-accent/40 cursor-pointer transition-all group';
    label.innerHTML = `
      <input type="checkbox" class="doc-checkbox w-4 h-4 rounded border-brand-border bg-brand-bg text-brand-accent focus:ring-brand-accent focus:ring-offset-0 shrink-0 cursor-pointer" value="${doc.id}" />
      <svg class="w-4 h-4 text-brand-muted/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
      <span class="text-sm text-brand-text truncate">${escapeHtml(doc.filename)}</span>
    `;
    container.appendChild(label);
  });
  const selectAllRow = document.getElementById('select-all-row');
  if (selectAllRow) {
    if (ready.length > 0) {
      selectAllRow.classList.remove('hidden');
      selectAllRow.classList.add('flex');
    } else {
      selectAllRow.classList.add('hidden');
      selectAllRow.classList.remove('flex');
    }
    const btn = document.getElementById('select-all-btn');
    if (btn) btn.textContent = 'Seleccionar todos';
  }
}

function renderExams(exams) {
  const container = $('#exams-list');
  const empty = $('#exams-empty');
  container.innerHTML = '';
  if (exams.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  exams.forEach(exam => {
    const el = document.createElement('div');
    el.className = 'bg-brand-surface border border-brand-border rounded-lg px-4 py-3 flex items-center justify-between hover:border-brand-accent/50 transition-colors cursor-pointer hover:bg-brand-accent/5';
    el.setAttribute('data-nav', 'exam');
    el.setAttribute('data-exam-id', exam.id);
    el.innerHTML = `
      <div>
        <h4 class="text-sm font-medium">${escapeHtml(exam.title)}</h4>
        <p class="text-xs text-brand-muted mt-0.5">${exam.question_count} preguntas &middot; ${formatDate(exam.created_at)}</p>
      </div>
      <svg class="w-4 h-4 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
    `;
    container.appendChild(el);
  });
}

function wireSubjectEvents() {
  const uploadZone = $('#upload-zone');
  const fileInput = $('#file-input');

  if (!uploadZone || !fileInput) return;

  const selectAllBtn = document.getElementById('select-all-btn');
  if (selectAllBtn) {
    const freshBtn = selectAllBtn.cloneNode(true);
    selectAllBtn.parentNode.replaceChild(freshBtn, selectAllBtn);
    document.getElementById('select-all-btn').addEventListener('click', () => {
      const checkboxes = Array.from(document.querySelectorAll('.doc-checkbox'));
      const allChecked = checkboxes.every(cb => cb.checked);
      checkboxes.forEach(cb => { cb.checked = !allChecked; });
      document.getElementById('select-all-btn').textContent =
        allChecked ? 'Seleccionar todos' : 'Deseleccionar';
    });
  }

  const newUploadZone = uploadZone.cloneNode(true);
  uploadZone.parentNode.replaceChild(newUploadZone, uploadZone);
  const currentUploadZone = $('#upload-zone');
  const currentFileInput = $('#file-input');

  currentUploadZone.addEventListener('click', () => currentFileInput.click());

  currentUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    currentUploadZone.classList.add('drag-over');
  });
  currentUploadZone.addEventListener('dragleave', () => {
    currentUploadZone.classList.remove('drag-over');
  });
  currentUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    currentUploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleFileUpload(Array.from(e.dataTransfer.files));
  });
  currentFileInput.addEventListener('change', () => {
    if (currentFileInput.files.length) handleFileUpload(Array.from(currentFileInput.files));
  });

  const generateBtn = $('#generate-exam-btn');
  if (generateBtn) {
    const newGenerateBtn = generateBtn.cloneNode(true);
    generateBtn.parentNode.replaceChild(newGenerateBtn, generateBtn);
  }

  const qInput = $('#question-count');
  if (qInput) {
    const newQInput = qInput.cloneNode(true);
    qInput.parentNode.replaceChild(newQInput, qInput);
  }

  const newGenerateBtnEl = $('#generate-exam-btn');
  if (!newGenerateBtnEl) return;

  newGenerateBtnEl.addEventListener('click', async () => {
    const checkboxes = $$('.doc-checkbox:checked');
    const docIds = Array.from(checkboxes).map(cb => cb.value);
    if (docIds.length === 0) {
      showToast('Selecciona al menos un documento', 'error');
      return;
    }
    const qCount = parseInt($('#question-count').value) || 5;
    if (qCount < 1 || qCount > 30) {
      showToast('Número de preguntas entre 1 y 30', 'error');
      return;
    }
    showLoading(true);
    const result = await generateExam(state.currentSubjectId, docIds, qCount);
    showLoading(false);
    if (result) {
      showToast('Examen generado correctamente', 'success');
      await loadSubjectData();
      window.dispatchEvent(new CustomEvent('nav:exam', { detail: { examId: result.id } }));
    }
  });

  const deleteBtns = document.querySelectorAll('[data-action="delete-document"]');
  deleteBtns.forEach(btn => {
    if (!btn) return;
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const filename = btn.dataset.filename || 'este documento';
      const confirmed = await showConfirmModal({
        title: 'Eliminar documento',
        message: `¿Estás seguro de que quieres eliminar "${filename}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        confirmClass: 'bg-brand-error hover:bg-red-700',
      });
      if (!confirmed) return;
      await deleteDocument(id);
      showToast('Documento eliminado', 'success');
      await loadSubjectData();
    });
  });
}

async function handleFileUpload(files) {
  const maxSize = 25 * 1024 * 1024;
  const validFiles = [];
  const errors = [];
  for (const file of files) {
    if (file.size > maxSize) {
      errors.push(`${file.name}: demasiado grande`);
      continue;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'pptx'].includes(ext)) {
      errors.push(`${file.name}: formato no soportado`);
      continue;
    }
    validFiles.push(file);
  }
  if (validFiles.length === 0) {
    showToast(errors.join(', '), 'error');
    return;
  }
  let successCount = 0;
  let failCount = 0;
  for (let i = 0; i < validFiles.length; i++) {
    showToast(`Subiendo ${i + 1}/${validFiles.length}...`, 'info');
    const result = await uploadDocument(state.currentSubjectId, validFiles[i]);
    if (result) {
      successCount++;
    } else {
      failCount++;
    }
  }
  if (failCount === 0) {
    showToast(`${successCount} ficheros subidos correctamente`, 'success');
  } else {
    showToast(`${successCount} de ${validFiles.length} subidos (${failCount} error)`, 'error');
  }
  await loadSubjectData();
}