import type { CitationStyle, DocSource, SourceAuthor } from './types';

export interface RefSegment { text: string; italic?: boolean }

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

// Split the ISO date on '-' instead of `new Date(string)` to avoid timezone /
// locale parsing pitfalls.
function formatAccessed(iso: string): string {
  const [y, m, d] = iso.split('-');
  const day = parseInt(d, 10);
  const month = MONTH_ABBR[parseInt(m, 10) - 1];
  return `Accessed ${day} ${month}. ${y}.`;
}

function shortTitle(title: string): string {
  return title.trim().split(/\s+/).filter(Boolean).slice(0, 4).join(' ');
}

function authorListMLA(authors: SourceAuthor[]): string {
  if (authors.length === 0) return '';
  if (authors.length === 1) return `${authors[0].family}, ${authors[0].given}.`;
  if (authors.length === 2) {
    return `${authors[0].family}, ${authors[0].given}, and ${authors[1].given} ${authors[1].family}.`;
  }
  return `${authors[0].family}, ${authors[0].given}, et al.`;
}

function initials(given: string): string {
  return given
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => `${w[0].toUpperCase()}.`)
    .join(' ');
}

function authorListAPA(authors: SourceAuthor[]): string {
  if (authors.length === 0) return '';
  // initials() already terminates with a period, so parts never need one appended.
  const part = (a: SourceAuthor) => `${a.family}, ${initials(a.given)}`;
  if (authors.length === 1) return part(authors[0]);
  if (authors.length === 2) return `${part(authors[0])}, & ${part(authors[1])}`;
  const allButLast = authors.slice(0, -1).map(part).join(', ');
  const last = part(authors[authors.length - 1]);
  return `${allButLast}, & ${last}`;
}

/** Family-name-only author phrase used in in-text citations, shared by both styles. */
function inTextAuthorPart(authors: SourceAuthor[], ampersand: boolean): string | null {
  if (authors.length === 0) return null;
  if (authors.length === 1) return authors[0].family;
  if (authors.length === 2) {
    return `${authors[0].family} ${ampersand ? '&' : 'and'} ${authors[1].family}`;
  }
  return `${authors[0].family} et al.`;
}

export function formatInText(source: DocSource, style: CitationStyle, locator?: string): string {
  const authorPart = inTextAuthorPart(source.authors, style === 'apa7');

  if (style === 'mla9') {
    const subject = authorPart ?? `"${shortTitle(source.title)}"`;
    const loc = locator ? ` ${locator}` : '';
    return `(${subject}${loc})`;
  }

  // apa7
  const subject = authorPart ?? `"${shortTitle(source.title)}"`;
  const yearPart = source.year ? `, ${source.year}` : '';
  const pagePart = locator ? `, p. ${locator}` : '';
  return `(${subject}${yearPart}${pagePart})`;
}

/** The hosting platform for a video source. SourceForm's "Channel/Platform"
 * field writes `publisher`; `container` is read as a fallback because older
 * rows (and the auto-fill lookup) put it there. */
function videoPlatform(source: DocSource): string | undefined {
  return source.publisher ?? source.container;
}

function formatReferenceMLA(source: DocSource): RefSegment[] {
  const segs: RefSegment[] = [];
  const authorStr = authorListMLA(source.authors);
  if (authorStr) segs.push({ text: `${authorStr} ` });

  // MLA 9 italicizes the container, not the work, for anything published
  // inside something else — so a video's TITLE is quoted and the PLATFORM is
  // italic, exactly like a web page. Only a standalone book is italic.
  const italicTitle = source.type === 'book';
  if (italicTitle) {
    segs.push({ text: source.title, italic: true });
  } else {
    segs.push({ text: `"${source.title}."` });
  }

  if (source.type === 'book') {
    segs.push({ text: '.' });
    const tail = [source.publisher, source.year].filter(Boolean).join(', ');
    if (tail) segs.push({ text: ` ${tail}.` });
  } else if (source.type === 'video') {
    // "Last, First. "Title." Platform, Year, URL."
    const platform = videoPlatform(source);
    const rest: string[] = [];
    if (source.year) rest.push(source.year);
    if (source.url) rest.push(source.url);
    if (platform) {
      segs.push({ text: ' ' });
      segs.push({ text: platform, italic: true });
      segs.push({ text: rest.length ? `, ${rest.join(', ')}.` : '.' });
    } else if (rest.length) {
      segs.push({ text: ` ${rest.join(', ')}.` });
    }
  } else if (source.type === 'journal') {
    segs.push({ text: ' ' });
    if (source.container) segs.push({ text: source.container, italic: true });
    const rest: string[] = [];
    if (source.volume) rest.push(`vol. ${source.volume}`);
    if (source.issue) rest.push(`no. ${source.issue}`);
    if (source.year) rest.push(source.year);
    if (source.pages) rest.push(`pp. ${source.pages}`);
    segs.push({ text: rest.length ? `, ${rest.join(', ')}.` : '.' });
  } else if (source.type === 'website') {
    segs.push({ text: ' ' });
    if (source.container) segs.push({ text: source.container, italic: true });
    const rest: string[] = [];
    if (source.year) rest.push(source.year);
    if (source.url) rest.push(source.url);
    segs.push({ text: rest.length ? `, ${rest.join(', ')}.` : '.' });
    if (source.accessed) segs.push({ text: ` ${formatAccessed(source.accessed)}` });
  }

  return segs;
}

function formatReferenceAPA(source: DocSource): RefSegment[] {
  const segs: RefSegment[] = [];
  const authorStr = authorListAPA(source.authors);
  if (authorStr) segs.push({ text: `${authorStr} ` });

  if (source.year) segs.push({ text: `(${source.year}). ` });

  const italicTitle = source.type === 'book' || source.type === 'video';
  if (italicTitle) {
    segs.push({ text: source.title, italic: true });
  } else {
    segs.push({ text: source.title });
  }

  if (source.type === 'book') {
    segs.push({ text: '.' });
    if (source.publisher) segs.push({ text: ` ${source.publisher}.` });
  } else if (source.type === 'video') {
    // "Last, F. (Year). Title [Video]. Platform. URL"
    // APA 7 §10.12: the italic title is followed by a ROMAN bracketed
    // description of the medium, then the site/platform, then the URL.
    segs.push({ text: ' [Video].' });
    const platform = videoPlatform(source);
    if (platform) segs.push({ text: ` ${platform}.` });
    if (source.url) segs.push({ text: ` ${source.url}` });
  } else if (source.type === 'journal') {
    segs.push({ text: '.' });
    segs.push({ text: ' ' });
    if (source.container) segs.push({ text: source.container, italic: true });
    if (source.volume) {
      segs.push({ text: `, ${source.volume}`, italic: true });
      if (source.issue) segs.push({ text: `(${source.issue})` });
    }
    if (source.pages) segs.push({ text: `, ${source.pages}` });
    segs.push({ text: '.' });
  } else if (source.type === 'website') {
    segs.push({ text: '.' });
    if (source.container) segs.push({ text: ` ${source.container}.` });
    if (source.url) segs.push({ text: ` ${source.url}` });
  }

  return segs;
}

export function formatReference(source: DocSource, style: CitationStyle): RefSegment[] {
  return style === 'mla9' ? formatReferenceMLA(source) : formatReferenceAPA(source);
}

export function referenceSortKey(source: DocSource): string {
  return source.authors.length > 0 ? source.authors[0].family : source.title;
}

export function buildWorksCited(
  sources: DocSource[],
  style: CitationStyle
): { source: DocSource; segments: RefSegment[] }[] {
  return [...sources]
    .sort((a, b) => referenceSortKey(a).localeCompare(referenceSortKey(b)))
    .map(source => ({ source, segments: formatReference(source, style) }));
}
