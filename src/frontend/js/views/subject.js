import { state } from '../state.js?v=1';
import { $, $$, escapeHtml, showToast, showLoading, showConfirmModal, formatDate } from '../utils.js?v=1';
import {
  getDocuments, uploadDocument, deleteDocument,
  getExams, generateExam, deleteExam, renameExam,
  getSummaries, generateSummary, deleteSummary, renameSummary,
} from '../api.js?v=1';

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
          <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-4">
            <p class="text-sm text-brand-muted">Selecciona los documentos que quieres incluir en el examen</p>
            <button id="select-all-btn" class="hidden text-xs font-medium text-brand-accent hover:text-brand-accent-h transition-colors whitespace-nowrap">Seleccionar todos</button>
          </div>
          <div class="mb-5">
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

      <div class="mb-8">
        <h3 class="font-display text-sm font-semibold text-brand-muted mb-3">Exámenes anteriores</h3>
        <div id="exams-list" class="space-y-2"></div>
        <div id="exams-empty" class="hidden text-brand-muted text-sm text-center py-4">Aún no has generado ningún examen</div>
      </div>

      <div class="mb-8">
        <h3 class="font-display text-sm font-semibold text-brand-muted mb-3">Generar resumen</h3>
        <div class="bg-brand-surface border border-brand-border rounded-xl p-5">
          <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-4">
            <p class="text-sm text-brand-muted">Selecciona los documentos que quieres resumir</p>
            <button id="summary-select-all-btn" class="hidden text-xs font-medium text-brand-accent hover:text-brand-accent-h transition-colors whitespace-nowrap">Seleccionar todos</button>
          </div>
          <div class="mb-5">
            <div id="summary-doc-selector" class="space-y-2 max-h-56 overflow-y-auto"></div>
            <p id="summary-doc-selector-empty" class="text-sm text-brand-muted/60 py-4 text-center">Sube documentos para poder generar resúmenes</p>
          </div>
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-brand-border/50">
            <p class="text-xs text-brand-muted sm:flex-1">El resumen se genera en Markdown a partir del contenido de los documentos seleccionados.</p>
            <button id="generate-summary-btn" class="bg-brand-accent hover:bg-brand-accent-h text-white text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
              Generar resumen
            </button>
          </div>
        </div>
      </div>

      <div>
        <h3 class="font-display text-sm font-semibold text-brand-muted mb-3">Resúmenes</h3>
        <div id="summaries-list" class="space-y-2"></div>
        <div id="summaries-empty" class="hidden text-brand-muted text-sm text-center py-4">Aún no has generado ningún resumen</div>
      </div>
    </div>
  `;
}

async function loadSubjectData() {
  const id = state.currentSubjectId;
  const [documents, exams, summaries] = await Promise.all([
    getDocuments(id),
    getExams(id),
    getSummaries(id),
  ]);
  renderDocuments(documents || []);
  renderDocSelector(documents || []);
  renderSummaryDocSelector(documents || []);
  renderExams(exams || []);
  renderSummaries(summaries || []);
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
    const selectAllBtn = $('#select-all-btn');
    if (selectAllBtn) selectAllBtn.classList.add('hidden');
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
  const selectAllBtn = $('#select-all-btn');
  if (selectAllBtn) {
    selectAllBtn.classList.remove('hidden');
    selectAllBtn.textContent = 'Seleccionar todos';
  }
}

function renderSummaryDocSelector(docs) {
  const container = $('#summary-doc-selector');
  const empty = $('#summary-doc-selector-empty');
  if (!container) return;
  container.innerHTML = '';
  const ready = docs.filter(d => d.status === 'ready');
  if (ready.length === 0) {
    empty.classList.remove('hidden');
    const selectAllBtn = $('#summary-select-all-btn');
    if (selectAllBtn) selectAllBtn.classList.add('hidden');
    return;
  }
  empty.classList.add('hidden');
  ready.forEach(doc => {
    const label = document.createElement('label');
    label.className = 'flex items-center gap-3 px-3.5 py-3 rounded-lg border border-brand-border bg-brand-bg/50 hover:border-brand-accent/40 cursor-pointer transition-all';
    label.innerHTML = `
      <input type="checkbox" class="summary-doc-checkbox w-4 h-4 rounded border-brand-border bg-brand-bg text-brand-accent focus:ring-brand-accent focus:ring-offset-0 shrink-0 cursor-pointer" value="${doc.id}" />
      <svg class="w-4 h-4 text-brand-muted/70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
      <span class="text-sm text-brand-text truncate">${escapeHtml(doc.filename)}</span>
    `;
    container.appendChild(label);
  });
  const selectAllBtn = $('#summary-select-all-btn');
  if (selectAllBtn) {
    selectAllBtn.classList.remove('hidden');
    selectAllBtn.textContent = 'Seleccionar todos';
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
    el.className = 'group bg-brand-surface border border-brand-border rounded-lg px-4 py-3 flex items-center justify-between hover:border-brand-accent/50 transition-colors cursor-pointer hover:bg-brand-accent/5';
    el.setAttribute('data-nav', 'exam');
    el.setAttribute('data-exam-id', exam.id);
    el.innerHTML = `
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h4 class="text-sm font-medium truncate">${escapeHtml(exam.title)}</h4>
          ${exam.last_result ? `<span class="inline-flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
            exam.last_result.percentage >= 70
              ? 'bg-emerald-500/15 text-emerald-400'
              : exam.last_result.percentage >= 40
                ? 'bg-amber-500/15 text-amber-400'
                : 'bg-red-500/15 text-brand-error'
          }">${exam.last_result.percentage}%</span>` : ''}
        </div>
        <p class="text-xs text-brand-muted mt-1.5">${exam.question_count} preguntas &middot; ${formatDate(exam.created_at)}</p>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button class="text-brand-muted hover:text-brand-accent transition-opacity duration-150 opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 rounded" data-action="rename-exam" data-id="${exam.id}" title="Renombrar examen">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"/></svg>
        </button>
        <button class="text-brand-muted hover:text-brand-error transition-opacity duration-150 opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 rounded" data-action="delete-exam" data-id="${exam.id}" data-title="${escapeHtml(exam.title)}" title="Eliminar examen">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
        <svg class="w-4 h-4 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </div>
    `;
    container.appendChild(el);
  });
}

function renderSummaries(summaries) {
  const container = $('#summaries-list');
  const empty = $('#summaries-empty');
  if (!container) return;
  container.innerHTML = '';
  if (summaries.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  summaries.forEach(summary => {
    const el = document.createElement('div');
    el.className = 'group bg-brand-surface border border-brand-border rounded-lg px-4 py-3 flex items-center justify-between hover:border-brand-accent/50 transition-colors cursor-pointer hover:bg-brand-accent/5';
    el.setAttribute('data-nav', 'summary');
    el.setAttribute('data-summary-id', summary.id);
    el.innerHTML = `
      <div class="min-w-0 flex-1">
        <h4 class="text-sm font-medium truncate">${escapeHtml(summary.title)}</h4>
        <p class="text-xs text-brand-muted mt-1.5">${summary.document_ids.length} ${summary.document_ids.length === 1 ? 'documento' : 'documentos'} &middot; ${formatDate(summary.updated_at)}</p>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button class="text-brand-muted hover:text-brand-accent transition-opacity duration-150 opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 rounded" data-action="rename-summary" data-id="${summary.id}" title="Renombrar resumen">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"/></svg>
        </button>
        <button class="text-brand-muted hover:text-brand-error transition-opacity duration-150 opacity-100 md:opacity-0 md:group-hover:opacity-100 p-1 rounded" data-action="delete-summary" data-id="${summary.id}" data-title="${escapeHtml(summary.title)}" title="Eliminar resumen">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
        <svg class="w-4 h-4 text-brand-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </div>
    `;
    container.appendChild(el);
  });
}

function wireSubjectEvents() {
  const uploadZone = $('#upload-zone');
  const fileInput = $('#file-input');

  if (!uploadZone || !fileInput) return;

  const selectAllBtn = $('#select-all-btn');
  if (selectAllBtn) {
    const freshBtn = selectAllBtn.cloneNode(true);
    selectAllBtn.parentNode.replaceChild(freshBtn, selectAllBtn);
    $('#select-all-btn').addEventListener('click', () => {
      const checkboxes = Array.from($$('.doc-checkbox'));
      const allChecked = checkboxes.every(cb => cb.checked);
      checkboxes.forEach(cb => { cb.checked = !allChecked; });
      $('#select-all-btn').textContent =
        allChecked ? 'Seleccionar todos' : 'Deseleccionar';
    });
  }

  const summarySelectAllBtn = $('#summary-select-all-btn');
  if (summarySelectAllBtn) {
    const freshBtn = summarySelectAllBtn.cloneNode(true);
    summarySelectAllBtn.parentNode.replaceChild(freshBtn, summarySelectAllBtn);
    $('#summary-select-all-btn').addEventListener('click', () => {
      const checkboxes = Array.from($$('.summary-doc-checkbox'));
      const allChecked = checkboxes.every(cb => cb.checked);
      checkboxes.forEach(cb => { cb.checked = !allChecked; });
      $('#summary-select-all-btn').textContent =
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
  if (newGenerateBtnEl) {
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
  }

  const generateSummaryBtn = $('#generate-summary-btn');
  if (generateSummaryBtn) {
    const newGenSumBtn = generateSummaryBtn.cloneNode(true);
    generateSummaryBtn.parentNode.replaceChild(newGenSumBtn, generateSummaryBtn);
    $('#generate-summary-btn').addEventListener('click', async () => {
      const checkboxes = $$('.summary-doc-checkbox:checked');
      const docIds = Array.from(checkboxes).map(cb => cb.value);
      if (docIds.length === 0) {
        showToast('Selecciona al menos un documento', 'error');
        return;
      }
      showLoading(true);
      const result = await generateSummary(state.currentSubjectId, docIds);
      showLoading(false);
      if (result) {
        showToast('Resumen generado correctamente', 'success');
        await loadSubjectData();
        window.dispatchEvent(new CustomEvent('nav:summary', { detail: { summaryId: result.id } }));
      }
    });
  }

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

  document.querySelectorAll('[data-action="delete-exam"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const title = btn.dataset.title || 'este examen';
      const confirmed = await showConfirmModal({
        title: 'Eliminar examen',
        message: `¿Estás seguro de que quieres eliminar "${title}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        confirmClass: 'bg-brand-error hover:bg-red-700',
      });
      if (!confirmed) return;
      await deleteExam(id);
      showToast('Examen eliminado', 'success');
      await loadSubjectData();
    });
  });

  document.querySelectorAll('[data-action="rename-exam"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const examId = btn.dataset.id;
      const examRow = btn.closest('[data-nav="exam"]');
      if (!examRow) return;
      const titleEl = examRow.querySelector('h4');
      if (!titleEl) return;
      const currentTitle = titleEl.textContent;

      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentTitle;
      input.className = 'bg-brand-bg border border-brand-accent rounded px-2 py-1 text-sm text-brand-text focus:ring-2 focus:ring-brand-accent outline-none w-full';
      titleEl.replaceWith(input);
      input.focus();
      input.select();

      let saved = false;
      async function save() {
        if (saved) return;
        saved = true;
        const newTitle = input.value.trim();
        if (!newTitle || newTitle === currentTitle) {
          const h4 = document.createElement('h4');
          h4.className = 'text-sm font-medium truncate';
          h4.textContent = currentTitle;
          input.replaceWith(h4);
          return;
        }
        const result = await renameExam(examId, newTitle);
        if (result) {
          showToast('Examen renombrado', 'success');
          await loadSubjectData();
        } else {
          const h4 = document.createElement('h4');
          h4.className = 'text-sm font-medium truncate';
          h4.textContent = currentTitle;
          input.replaceWith(h4);
        }
      }

      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); save(); }
        else if (ev.key === 'Escape') {
          saved = true;
          const h4 = document.createElement('h4');
          h4.className = 'text-sm font-medium truncate';
          h4.textContent = currentTitle;
          input.replaceWith(h4);
        }
      });
      input.addEventListener('blur', () => save());
    });
  });

  document.querySelectorAll('[data-action="delete-summary"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const title = btn.dataset.title || 'este resumen';
      const confirmed = await showConfirmModal({
        title: 'Eliminar resumen',
        message: `¿Estás seguro de que quieres eliminar "${title}"? Esta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        confirmClass: 'bg-brand-error hover:bg-red-700',
      });
      if (!confirmed) return;
      await deleteSummary(id);
      showToast('Resumen eliminado', 'success');
      await loadSubjectData();
    });
  });

  document.querySelectorAll('[data-action="rename-summary"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const summaryId = btn.dataset.id;
      const row = btn.closest('[data-nav="summary"]');
      if (!row) return;
      const titleEl = row.querySelector('h4');
      if (!titleEl) return;
      const currentTitle = titleEl.textContent;

      const input = document.createElement('input');
      input.type = 'text';
      input.value = currentTitle;
      input.className = 'bg-brand-bg border border-brand-accent rounded px-2 py-1 text-sm text-brand-text focus:ring-2 focus:ring-brand-accent outline-none w-full';
      titleEl.replaceWith(input);
      input.focus();
      input.select();

      let saved = false;
      async function save() {
        if (saved) return;
        saved = true;
        const newTitle = input.value.trim();
        if (!newTitle || newTitle === currentTitle) {
          const h4 = document.createElement('h4');
          h4.className = 'text-sm font-medium truncate';
          h4.textContent = currentTitle;
          input.replaceWith(h4);
          return;
        }
        const result = await renameSummary(summaryId, newTitle);
        if (result) {
          showToast('Resumen renombrado', 'success');
          await loadSubjectData();
        } else {
          const h4 = document.createElement('h4');
          h4.className = 'text-sm font-medium truncate';
          h4.textContent = currentTitle;
          input.replaceWith(h4);
        }
      }

      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') { ev.preventDefault(); save(); }
        else if (ev.key === 'Escape') {
          saved = true;
          const h4 = document.createElement('h4');
          h4.className = 'text-sm font-medium truncate';
          h4.textContent = currentTitle;
          input.replaceWith(h4);
        }
      });
      input.addEventListener('blur', () => save());
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
