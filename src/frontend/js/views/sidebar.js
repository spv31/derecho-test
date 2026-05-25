import { $, escapeHtml } from '../utils.js?v=3';

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
    item.className = `flex items-center gap-2.5 rounded-lg px-3 py-2.5 cursor-pointer transition-all group ${
      isActive
        ? 'bg-brand-accent/15 border border-brand-accent/30 text-brand-text'
        : 'border border-transparent text-brand-muted hover:text-brand-text hover:bg-brand-bg/50'
    }`;
    item.setAttribute('data-nav', 'subject');
    item.setAttribute('data-id', sub.id);
    item.setAttribute('data-name', sub.name);
    item.innerHTML = `
      <svg class="w-4 h-4 shrink-0 ${isActive ? 'text-brand-accent' : 'text-brand-muted/50'}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"/></svg>
      <span class="text-sm truncate flex-1">${escapeHtml(sub.name)}</span>
      <div class="flex items-center gap-1 shrink-0">
        <button class="text-brand-muted hover:text-brand-accent transition-opacity duration-150 opacity-100 md:opacity-0 md:group-hover:opacity-100 p-0.5 rounded" data-action="rename-subject" data-id="${sub.id}" title="Renombrar">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z"/></svg>
        </button>
        <button class="delete-subject-btn text-brand-muted hover:text-brand-error transition-opacity duration-150 opacity-100 md:opacity-0 md:group-hover:opacity-100 p-0.5 rounded" data-action="delete-subject" data-id="${sub.id}" title="Eliminar">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}