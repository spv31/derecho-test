/**
 * Custom Markdown → HTML renderer (line-by-line).
 * Soporta: ## h2, ### h3, #### h4, **bold**, *italic*, `code`,
 *          listas (- y 1.), blockquotes (> ), párrafos.
 * NO soporta: tablas, imágenes, enlaces, h1, HTML embebido.
 */
export function renderMarkdown(md) {
  if (!md) return '';

  /* ── helpers ──────────────────────────────────────── */
  const esc = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const inline = (raw) => {
    let s = esc(raw);
    s = s.replace(/`([^`\n]+)`/g,
      '<code class="bg-brand-bg px-1.5 py-0.5 rounded text-xs font-mono text-brand-accent">$1</code>');
    s = s.replace(/\*\*([^*\n]+)\*\*/g,
      '<strong class="font-semibold text-brand-text">$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    return s;
  };

  /* ── detección de tipo de línea ──────────────────── */
  const isHeading    = (l) => /^#{2,4}\s+/.test(l);
  const isUl         = (l) => /^- /.test(l);
  const isOl         = (l) => /^\d+\.\s/.test(l);
  const isBlockquote = (l) => /^>\s?/.test(l);

  /* ── clases por nivel de heading ─────────────────── */
  const hClass = {
    2: 'font-display text-lg font-semibold mt-6 mb-3 text-brand-text border-b border-brand-border/40 pb-1',
    3: 'font-display text-base font-semibold mt-5 mb-2 text-brand-text',
    4: 'font-display text-sm font-semibold mt-4 mb-1.5 text-brand-text',
  };

  /* ── procesamiento línea a línea ─────────────────── */
  const lines = md.split('\n');
  const html  = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    /* línea vacía → saltar */
    if (!trimmed) { i++; continue; }

    /* ── Headings ── */
    const hm = trimmed.match(/^(#{2,4})\s+(.+)$/);
    if (hm) {
      const lvl = hm[1].length;
      html.push(`<h${lvl} class="${hClass[lvl] || hClass[4]}">${inline(hm[2])}</h${lvl}>`);
      i++;
      continue;
    }

    /* ── Blockquote: agrupar líneas consecutivas con > ── */
    if (isBlockquote(trimmed)) {
      const bq = [];
      while (i < lines.length && isBlockquote(lines[i].trim())) {
        bq.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      html.push(
        `<blockquote class="border-l-4 border-brand-accent/50 pl-4 italic text-brand-muted my-4 text-sm">${inline(bq.join(' '))}</blockquote>`
      );
      continue;
    }

    /* ── Lista no ordenada ── */
    if (isUl(trimmed)) {
      const items = [];
      while (i < lines.length && isUl(lines[i].trim())) {
        let txt = lines[i].trim().slice(2);
        i++;
        /* líneas de continuación indentadas */
        while (
          i < lines.length &&
          lines[i].trim() &&
          !isUl(lines[i].trim()) &&
          !isOl(lines[i].trim()) &&
          !isHeading(lines[i].trim()) &&
          !isBlockquote(lines[i].trim()) &&
          /^\s{2,}/.test(lines[i])
        ) {
          txt += ' ' + lines[i].trim();
          i++;
        }
        items.push(`<li>${inline(txt)}</li>`);
      }
      html.push(
        `<ul class="list-disc pl-6 my-3 space-y-1 text-sm text-brand-text">${items.join('')}</ul>`
      );
      continue;
    }

    /* ── Lista ordenada ── */
    if (isOl(trimmed)) {
      const items = [];
      while (i < lines.length && isOl(lines[i].trim())) {
        let txt = lines[i].trim().replace(/^\d+\.\s/, '');
        i++;
        while (
          i < lines.length &&
          lines[i].trim() &&
          !isOl(lines[i].trim()) &&
          !isUl(lines[i].trim()) &&
          !isHeading(lines[i].trim()) &&
          !isBlockquote(lines[i].trim()) &&
          /^\s{2,}/.test(lines[i])
        ) {
          txt += ' ' + lines[i].trim();
          i++;
        }
        items.push(`<li>${inline(txt)}</li>`);
      }
      html.push(
        `<ol class="list-decimal pl-6 my-3 space-y-1 text-sm text-brand-text">${items.join('')}</ol>`
      );
      continue;
    }

    /* ── Párrafo: acumular líneas consecutivas no especiales ── */
    const pLines = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t || isHeading(t) || isUl(t) || isOl(t) || isBlockquote(t)) break;
      pLines.push(t);
      i++;
    }
    if (pLines.length) {
      html.push(
        `<p class="my-3 text-sm leading-relaxed text-brand-text">${inline(pLines.join(' '))}</p>`
      );
    }
  }

  return html.join('\n');
}