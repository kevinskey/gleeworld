import type { DocSource, SourceAuthor, SourceType } from './types';

function crossrefTypeToSourceType(type: string | undefined, containerTitle: string | undefined): SourceType {
  const t = `${type || ''} ${containerTitle || ''}`.toLowerCase();
  if (t.includes('journal')) return 'journal';
  if (t.includes('book') || t.includes('monograph')) return 'book';
  return 'website';
}

function splitOpenLibraryName(name: string): SourceAuthor {
  const trimmed = name.trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  if (lastSpace === -1) return { given: '', family: trimmed };
  return { given: trimmed.slice(0, lastSpace), family: trimmed.slice(lastSpace + 1) };
}

function extractYear(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  const match = dateStr.match(/\d{4}(?!.*\d{4})/);
  return match ? match[0] : undefined;
}

export async function lookupDOI(doi: string): Promise<Partial<DocSource> | null> {
  try {
    const res = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const m = data?.message;
    if (!m) return null;

    const authors: SourceAuthor[] = Array.isArray(m.author)
      ? m.author.map((a: any) => ({ family: a.family || '', given: a.given || '' }))
      : [];

    const year = m.issued?.['date-parts']?.[0]?.[0] != null
      ? String(m.issued['date-parts'][0][0])
      : undefined;

    const container = Array.isArray(m['container-title']) ? m['container-title'][0] : m['container-title'];

    return {
      type: crossrefTypeToSourceType(m.type, container),
      title: Array.isArray(m.title) ? m.title[0] : m.title,
      container,
      authors,
      year,
      volume: m.volume,
      issue: m.issue,
      pages: m.page,
      doi: m.DOI,
    };
  } catch {
    return null;
  }
}

export async function lookupISBN(isbn: string): Promise<Partial<DocSource> | null> {
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data?.[`ISBN:${isbn}`];
    if (!entry) return null;

    const authors: SourceAuthor[] = Array.isArray(entry.authors)
      ? entry.authors.map((a: any) => splitOpenLibraryName(a.name || ''))
      : [];

    return {
      type: 'book',
      title: entry.title,
      authors,
      publisher: Array.isArray(entry.publishers) ? entry.publishers[0]?.name : undefined,
      year: extractYear(entry.publish_date),
      isbn,
    };
  } catch {
    return null;
  }
}
