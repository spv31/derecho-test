export function renderMarkdown(md) {
  if (!md) return '';

  const escape = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const renderInline = (s) => s
    .replace(/`([^`\n]+)`/g, '<code class="bg-brand-bg px-1.5 py-0.5 rounded text-xs font-mono text-brand-accent">$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong class="font-semibold text-brand-text">$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

  const text = escape(md);
  const blocks = text.split(/\n\n+/);

  const out = blocks.map(raw => {
    const block = raw.trim();
    if (!block) return '';

    let m;
    if ((m = block.match(/^### (.+)$/))) {
      return `<h3 class="font-display text-base font-semibold mt-5 mb-2 text-brand-text">${renderInline(m[1])}</h3>`;
    }
    if ((m = block.match(/^## (.+)$/))) {
      return `<h2 class="font-display text-lg font-semibold mt-6 mb-3 text-brand-text border-b border-brand-border/40 pb-1">${renderInline(m[1])}</h2>`;
    }

    const lines = block.split('\n');
    if (lines.every(l => /^- /.test(l.trim()))) {
      const items = lines.map(l => `<li>${renderInline(l.trim().slice(2))}</li>`).join('');
      return `<ul class="list-disc pl-6 my-3 space-y-1 text-sm text-brand-text">${items}</ul>`;
    }
    if (lines.every(l => /^\d+\. /.test(l.trim()))) {
      const items = lines.map(l => `<li>${renderInline(l.trim().replace(/^\d+\. /, ''))}</li>`).join('');
      return `<ol class="list-decimal pl-6 my-3 space-y-1 text-sm text-brand-text">${items}</ol>`;
    }
    if (lines.every(l => /^> /.test(l.trim()))) {
      const content = lines.map(l => l.trim().slice(2)).join(' ');
      return `<blockquote class="border-l-4 border-brand-accent/50 pl-4 italic text-brand-muted my-4 text-sm">${renderInline(content)}</blockquote>`;
    }

    return `<p class="my-3 text-sm leading-relaxed text-brand-text">${renderInline(block.replace(/\n/g, ' '))}</p>`;
  });

  return out.filter(Boolean).join('\n');
}