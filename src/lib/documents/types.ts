export type CitationStyle = 'mla9' | 'apa7';
export type SourceType = 'book' | 'journal' | 'website' | 'video';
export interface SourceAuthor { family: string; given: string }
export interface DocSource {
  id: string; type: SourceType; authors: SourceAuthor[];
  title: string; container?: string; publisher?: string; year?: string;
  volume?: string; issue?: string; pages?: string;
  url?: string; doi?: string; isbn?: string; accessed?: string;
}
export interface DocFootnote { id: string; text: string }
export interface PaperMeta {
  studentName?: string; instructor?: string; course?: string; date?: string;
  /** Page setup. Lives in paper_meta (a free jsonb column) rather than new
   *  columns, so page size and margins needed no migration. Absent = the
   *  historical defaults every existing doc was written against: US Letter,
   *  1in margins. */
  pageSize?: PageSize;
  marginIn?: number;
}

export type PageSize = 'letter' | 'a4';

/** Physical page dimensions, inches. */
export const PAGE_DIMENSIONS: Record<PageSize, { width: number; height: number; label: string }> = {
  letter: { width: 8.5, height: 11, label: 'US Letter' },
  a4: { width: 8.27, height: 11.69, label: 'A4' },
};

export const DEFAULT_PAGE_SIZE: PageSize = 'letter';
/** MLA and APA both want 1in; it's also what every existing doc was authored with. */
export const DEFAULT_MARGIN_IN = 1;
export const MARGIN_CHOICES = [0.5, 0.75, 1, 1.25, 1.5] as const;

/** CSS pixels per inch at the 96dpi the browser assumes for print units. */
export const PX_PER_IN = 96;
/** Twips (1/20 pt) per inch — the unit the docx package wants. */
export const TWIPS_PER_IN = 1440;

export function resolvePageSetup(meta: PaperMeta | undefined | null): { pageSize: PageSize; marginIn: number } {
  const pageSize = meta?.pageSize && meta.pageSize in PAGE_DIMENSIONS ? meta.pageSize : DEFAULT_PAGE_SIZE;
  const raw = typeof meta?.marginIn === 'number' ? meta.marginIn : DEFAULT_MARGIN_IN;
  // Clamp rather than trust: a hand-edited jsonb value of 8 would render a
  // page with no content column at all.
  const marginIn = Math.min(2, Math.max(0.25, raw));
  return { pageSize, marginIn };
}
