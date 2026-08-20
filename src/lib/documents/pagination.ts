// Page geometry for the Documents editor.
//
// The editor is one continuous ProseMirror flow — that is what makes
// collaboration, comments, and find/replace positions work — so this draws
// page BOUNDARIES over that flow rather than splitting the document into
// separate page nodes. You see where page 1 ends, how many pages you have,
// and where a hard break falls, and the print/.docx paths do the real
// pagination from the same numbers (see resolvePageSetup).
//
// The honest limitation: a paragraph can straddle a boundary line here, where
// a true paginated editor would push it whole onto the next page. Fixing that
// means re-measuring and re-laying out the document on every keystroke, which
// is the trade Google Docs makes with a custom layout engine and which
// ProseMirror does not give for free.
import { PAGE_DIMENSIONS, PX_PER_IN, resolvePageSetup, type PaperMeta } from './types';

/**
 * Usable content height of one page in CSS pixels — the sheet minus its top
 * and bottom margins. This is the number the boundary lines are spaced by.
 */
export function pageContentHeightPx(meta: PaperMeta | null | undefined): number {
  const { pageSize, marginIn } = resolvePageSetup(meta);
  const heightIn = PAGE_DIMENSIONS[pageSize].height - marginIn * 2;
  // Guard: resolvePageSetup clamps margins to 2in, so on the shortest page
  // this can't reach zero — but a future page size could, and a zero period
  // would mean an infinite boundary loop below.
  return Math.max(1, heightIn * PX_PER_IN);
}

/**
 * How many pages `contentHeightPx` of text occupies. Always at least 1: an
 * empty document is one blank page, not zero pages.
 */
export function pageCount(contentHeightPx: number, pageHeightPx: number): number {
  if (!Number.isFinite(contentHeightPx) || contentHeightPx <= 0) return 1;
  if (!Number.isFinite(pageHeightPx) || pageHeightPx <= 0) return 1;
  return Math.max(1, Math.ceil(contentHeightPx / pageHeightPx));
}

/**
 * Offsets, in CSS pixels from the top of the content box, where a page ends.
 *
 * The LAST page's end is deliberately omitted: the document simply stops
 * there, and drawing a rule under the final line would read as a horizontal
 * rule the user didn't insert. So N pages produce N-1 boundaries.
 */
export function pageBoundaries(contentHeightPx: number, pageHeightPx: number): number[] {
  const pages = pageCount(contentHeightPx, pageHeightPx);
  const boundaries: number[] = [];
  for (let i = 1; i < pages; i += 1) boundaries.push(i * pageHeightPx);
  return boundaries;
}

/** "Page 2 of 7" for the editor footer. */
export function describePagination(pages: number): string {
  return `${pages} page${pages === 1 ? '' : 's'}`;
}
