import { state } from '../state.js?v=2';
import { $, escapeHtml, showLoading, showToast, showConfirmModal, formatDate } from '../utils.js?v=2';
import { getSummary, renameSummary, regenerateSummary, deleteSummary, exportSummary } from '../api.js?v=2';
import { renderMarkdown } from '../markdown.js?v=2';

export async function showSummary(summaryId) {
  state.currentSummaryId = summaryId;
  showLoading(true);
  const summary = await getSummary(summaryId);
  showLoading(false);
  if (!summary) {
    window.dispatchEvent(new CustomEvent('nav:subject', {
      detail: { subjectId: state.currentSubjectId, subjectName: state.currentSubjectName },
    }));
    return;
  }
  renderSummary(summary);
}

function renderSummary(summary) {
  const meta = `Actualizado el ${formatDate(summary.updated_at)} · ${summary.document_ids.length} ${summary.document_ids.length === 1 ? 'documento' : 'documentos'}`;
  const contentHtml = renderMarkdown(summary.content);

  $('#main-content').innerHTML = `
    <div class="max-w-3xl">
      <div class="flex items-start gap-3 mb-6">
        <button data-nav="back-to-subject" class="text-brand-muted hover:text-brand-text transition-colors mt-1 shrink-0" title="Volver">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div class="min-w-0 flex-1">
          <h2 id="summary-title" class="font-display text-xl font-semibold text-brand-text break-words">${escapeHtml(summary.title)}</h2>
          <p class="text-xs text-brand-muted mt-1">${meta}</p>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button id="rename-summary-btn" class="p-2 rounded text-brand-muted hover:text-brand-accent hover:bg-brand-surface transition-colors" title="Renombrar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"/></svg>
          </button>
          <button id="regenerate-summary-btn" class="p-2 rounded text-brand-muted hover:text-brand-accent hover:bg-brand-surface transition-colors" title="Regenerar con los mismos documentos">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
          </button>
          <button id="delete-summary-btn" class="p-2 rounded text-brand-muted hover:text-brand-error hover:bg-brand-surface transition-colors" title="Eliminar">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>

      <article id="summary-content" class="bg-brand-surface border border-brand-border rounded-xl p-6">
        ${contentHtml}
      </article>

      <div class="flex items-center gap-3 mt-4">
        <button id="export-pdf-btn" class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-brand-border text-brand-text hover:bg-brand-surface hover:border-brand-accent/50 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
          Exportar PDF
        </button>
        <button id="export-docx-btn" class="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-brand-border text-brand-text hover:bg-brand-surface hover:border-brand-accent/50 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg>
          Exportar DOCX
        </button>
      </div>
    </div>
  `;

  wireSummaryActions(summary);
}

function wireSummaryActions(summary) {
  $('#rename-summary-btn').addEventListener('click', () => startRename(summary));

  $('#regenerate-summary-btn').addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Regenerar resumen',
      message: 'Se reemplazará el contenido actual usando los mismos documentos. ¿Continuar?',
      confirmText: 'Regenerar',
    });
    if (!confirmed) return;
    showLoading(true);
    const result = await regenerateSummary(summary.id);
    showLoading(false);
    if (result) {
      showToast('Resumen regenerado', 'success');
      renderSummary(result);
    }
  });

  $('#delete-summary-btn').addEventListener('click', async () => {
    const confirmed = await showConfirmModal({
      title: 'Eliminar resumen',
      message: `¿Seguro que quieres eliminar "${summary.title}"? Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      confirmClass: 'bg-brand-error hover:bg-red-700',
    });
    if (!confirmed) return;
    const ok = await deleteSummary(summary.id);
    if (ok !== null) {
      showToast('Resumen eliminado', 'success');
      window.dispatchEvent(new CustomEvent('nav:subject', {
        detail: { subjectId: state.currentSubjectId, subjectName: state.currentSubjectName },
      }));
    }
  });

  $('#export-pdf-btn').addEventListener('click', () => {
    exportSummary(summary.id, 'pdf');
  });

  $('#export-docx-btn').addEventListener('click', () => {
    exportSummary(summary.id, 'docx');
  });
}

function startRename(summary) {
  const titleEl = $('#summary-title');
  if (!titleEl) return;
  const currentTitle = titleEl.textContent;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentTitle;
  input.className = 'bg-brand-bg border border-brand-accent rounded px-2 py-1 font-display text-xl font-semibold text-brand-text focus:ring-2 focus:ring-brand-accent outline-none w-full';
  titleEl.replaceWith(input);
  input.focus();
  input.select();

  let saved = false;
  async function save() {
    if (saved) return;
    saved = true;
    const newTitle = input.value.trim();
    if (!newTitle || newTitle === currentTitle) {
      const h2 = document.createElement('h2');
      h2.id = 'summary-title';
      h2.className = 'font-display text-xl font-semibold text-brand-text break-words';
      h2.textContent = currentTitle;
      input.replaceWith(h2);
      return;
    }
    const result = await renameSummary(summary.id, newTitle);
    const h2 = document.createElement('h2');
    h2.id = 'summary-title';
    h2.className = 'font-display text-xl font-semibold text-brand-text break-words';
    h2.textContent = result ? result.title : currentTitle;
    input.replaceWith(h2);
    if (result) showToast('Resumen renombrado', 'success');
  }

  input.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); save(); }
    else if (ev.key === 'Escape') {
      saved = true;
      const h2 = document.createElement('h2');
      h2.id = 'summary-title';
      h2.className = 'font-display text-xl font-semibold text-brand-text break-words';
      h2.textContent = currentTitle;
      input.replaceWith(h2);
    }
  });
  input.addEventListener('blur', () => save());
}