// Which top-level blocks start a new page.
//
// Pure, because this is the part that has to be right: it decides where the
// page gutters get inserted, and getting it wrong either loses a page or
// oscillates forever as inserting a gutter changes the measurement that
// produced it.
//
// The inputs are the NATURAL heights of the document's top-level blocks —
// measured without any gutters present — so the answer never depends on the
// decorations it produces. That is what makes it stable: same document, same
// page breaks, no feedback loop.

/**
 * Indices of the blocks that begin a page after the first.
 *
 * A block goes on the current page if it fits. If it doesn't, it starts the
 * next one — the block-level equivalent of Word's "keep lines together",
 * which is also what makes this cheap: nothing is split.
 *
 * A block TALLER than a whole page (a long table, a full-page image) gets a
 * page to itself and overflows it, rather than triggering a break before
 * every subsequent block forever.
 */
export function paginateBlocks(heights: number[], pageHeightPx: number): number[] {
  if (!Number.isFinite(pageHeightPx) || pageHeightPx <= 0) return [];

  const starts: number[] = [];
  let used = 0;

  for (let i = 0; i < heights.length; i += 1) {
    const height = Number.isFinite(heights[i]) ? Math.max(0, heights[i]) : 0;

    // Nothing on this page yet: the block goes here whatever its height,
    // because moving it would leave a blank page behind it.
    if (used === 0) {
      used = height;
      continue;
    }

    if (used + height <= pageHeightPx) {
      used += height;
    } else {
      starts.push(i);
      used = height;
    }
  }

  return starts;
}

/** Total pages for a set of block heights. Always at least 1. */
export function pageCountForBlocks(heights: number[], pageHeightPx: number): number {
  return paginateBlocks(heights, pageHeightPx).length + 1;
}
