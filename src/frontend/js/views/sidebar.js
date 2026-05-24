import { $, escapeHtml } from '../utils.js';

export function renderSubjectsList(subjects, activeId) {
  const container = $('#subjects-list');
  const empty = $('#sidebar-empty');
  container.innerHTML = '';
  if (!subjects || subjects.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  subjects.forEach(sub => {
    const isActive = sub.id === activeId;
    const item = document.createElement('div');
    item.className = `flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-colors group ${
      isActive ? 'bg-brand-accent/15 text-brand-text' : 'text-brand-muted hover:text-brand-text hover:bg-brand-surface'
    }`;
    item.setAttribute('data-nav', 'subject');
    item.setAttribute('data-id', sub.id);
    item.setAttribute('data-name', sub.name);
    item.innerHTML = `
      <span class="text-sm truncate flex-1">${escapeHtml(sub.name)}</span>
      <button class="delete-subject-btn text-brand-muted hover:text-brand-error transition-colors opacity-0 group-hover:opacity-100 ml-2" data-action="delete-subject" data-id="${sub.id}" title="Eliminar asignatura">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
      </button>
    `;
    container.appendChild(item);
  });
}