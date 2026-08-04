// Pure record -> chunk conversion. No browser, no I/O — unit tested directly.

/** "Robert Nathaniel Dett" -> "robert-nathaniel-dett" */
export function slugify(input) {
  return String(input)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const LABELS = {
  bio: 'Bio', role: 'Role', affiliation: 'Affiliation', location: 'Location',
  history: 'History', developments: 'Key developments', techniques: 'Technique',
  notableConductors: 'Notable conductors', description: 'Description',
  terms: 'Terms', period: 'Period', summary: 'Summary', publishers: 'Publishers',
  composer: 'Composer', arranger: 'Arranger', publisher: 'Publisher',
  voicing: 'Voicing', year: 'Year', difficulty: 'Difficulty', era: 'Era',
  subcategories: 'Subcategories', notes: 'Notes',
};

// `body` is the DOM-mode catch-all field; a "Body:" prefix is pure noise.
const UNLABELED = new Set(['body']);

const label = (field) => LABELS[field] ?? field
  .replace(/([a-z])([A-Z])/g, '$1 $2')   // camelCase -> camel Case
  .replace(/_/g, ' ')                     // snake_case -> snake case
  .replace(/^./, (c) => c.toUpperCase());

function stripHtml(value) {
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** One line per item for arrays of objects; a comma list for arrays of strings. */
function renderValue(value) {
  if (value == null) return '';
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    if (value.every((v) => typeof v !== 'object' || v === null)) {
      return value.map(stripHtml).filter(Boolean).join(', ');
    }
    return value
      .map((item) => Object.values(item)
        .filter((v) => v != null && typeof v !== 'object' && String(v).trim() !== '')
        .map(stripHtml).join(' — '))
      .filter(Boolean)
      .join('\n');
  }
  if (typeof value === 'object') return '';
  return stripHtml(value);
}

export function renderFacets(record, fields) {
  return fields
    .map((field) => {
      const rendered = renderValue(record[field]);
      if (!rendered) return '';
      return UNLABELED.has(field) ? rendered : `${label(field)}: ${rendered}`;
    })
    .filter(Boolean)
    .join('\n');
}

export function recordToChunk(record, cfg, ctx) {
  const rawTitle = record?.[cfg.titleField];
  if (!rawTitle || !String(rawTitle).trim()) return null;
  const title = stripHtml(rawTitle);

  const text = renderFacets(record, cfg.fields);
  if (!text.trim()) return null;

  const slug = cfg.idField && record[cfg.idField]
    ? slugify(record[cfg.idField])
    : slugify(title);

  return { id: `${ctx.page}/${slug}`, page: ctx.page, pageTitle: ctx.pageTitle, title, text, url: ctx.url };
}
