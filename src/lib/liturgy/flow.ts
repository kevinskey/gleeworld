import type { RenderedBlock } from './aidEdits';

/**
 * Flowing a worship aid across its pages, the way a word processor does.
 *
 * The aid is one landscape letter sheet folded once: four 5.5×8.5 pages,
 * read 1 → 4. Content is a single stream, not four separate buckets — when a
 * page fills, the remainder moves to the next page rather than being cut off
 * at the fold. Page 1 is the cover (name and artwork only), so the stream
 * runs through pages 2, 3 and 4.
 *
 * Measured in LINES rather than pixels, deliberately. Pixel measurement can
 * only happen after a render, which makes the layout depend on when images
 * happen to load and produces a different result in the print pipeline than
 * on screen. A line budget is decided before anything is drawn, is identical
 * in both, and can be tested without a DOM.
 */

/** Usable height of a page: 8.5in less the 0.42in padding top and bottom. */
export const PAGE_HEIGHT_IN = 8.5 - 0.84;
/** One line of body text at the engraved size, including leading. */
export const LINE_HEIGHT_IN = 0.16;
/** Lines a single page can hold. */
export const LINES_PER_PAGE = Math.floor(PAGE_HEIGHT_IN / LINE_HEIGHT_IN);

/** Pages the stream runs through, in reading order. Page 1 is the cover. */
export const FLOW_PAGES = ['insideLeft', 'insideRight', 'back'] as const;
export type FlowPage = typeof FLOW_PAGES[number];

/** Characters of prose that fit on one line of a 5.5in page. */
const CHARS_PER_LINE = 52;

/**
 * How many lines a block occupies.
 *
 * Approximate by nature — a proportional face makes any character count an
 * estimate — so it is deliberately biased to OVER-count. Over-counting moves
 * a block to the next page one line early, which prints correctly; under-
 * counting overruns the fold, which does not.
 */
export function blockLines(block: RenderedBlock): number {
  const { entry } = block;
  let lines = 0;

  if (entry.notice) {
    // Boxed, centred, with its own border and padding: the text plus about a
    // line and a half of box.
    lines += Math.ceil((entry.notice.length || 1) / CHARS_PER_LINE) + 2;
  } else if (entry.divider) {
    // A rule with a centred heading, set larger, with air above and below.
    lines += 3;
  } else {
    if (entry.label) lines += 1;
    if (entry.title) lines += 1;
    if (entry.summary) lines += Math.ceil(entry.summary.length / CHARS_PER_LINE);
  }

  if (entry.imageUrl) {
    // An engraved setting is capped at 2.6in tall by the renderer, and a
    // psalm at the composer's default proportions lands near that. Budget the
    // cap: reserving too much space costs a line, reserving too little runs
    // the music over the fold.
    lines += Math.ceil(2.6 / LINE_HEIGHT_IN);
  }

  lines += Math.ceil(block.gapAfter / LINE_HEIGHT_IN);
  return Math.max(1, lines);
}

export interface FlowResult {
  /** Blocks assigned to each page, in reading order. */
  pages: Record<FlowPage, RenderedBlock[]>;
  /** Lines that did not fit in the whole document. 0 when everything fits. */
  overflowLines: number;
  /** Blocks that could not be placed at all. */
  dropped: RenderedBlock[];
}

/**
 * A heading alone at the foot of a page is an orphan: the reader turns the
 * fold to find what it introduced. Anything with this many lines or fewer
 * left beneath it moves with its content instead.
 */
const ORPHAN_GUARD = 2;

/**
 * Distribute blocks across the pages.
 *
 * The document cannot grow — four pages is the format — so when the stream
 * exceeds the total budget the surplus is REPORTED rather than silently
 * truncated. The editor turns that into a count the user can act on.
 */
export function flowBlocks(
  blocks: RenderedBlock[],
  linesPerPage: number = LINES_PER_PAGE,
): FlowResult {
  const pages: Record<FlowPage, RenderedBlock[]> = {
    insideLeft: [], insideRight: [], back: [],
  };
  const dropped: RenderedBlock[] = [];
  let overflowLines = 0;

  let pageIndex = 0;
  let used = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const cost = blockLines(block);
    const remaining = linesPerPage - used;

    // A block taller than a whole page cannot be moved anywhere better —
    // place it and let it be the page.
    const oversized = cost > linesPerPage;

    // Would this leave a SECTION heading stranded with nothing under it?
    //
    // Dividers only — "LITURGY OF THE EUCHARIST" introduces what follows, so
    // stranding it sends the reader across the fold to find it. A bare label
    // like HOMILY or OUR FATHER looks similar but is a complete entry in
    // itself, and treating those as headings pushed content to the next page
    // for no reason, wasting most of a panel.
    const isHeading = !!block.entry.divider;
    const orphaned = isHeading && remaining - cost <= ORPHAN_GUARD && i < blocks.length - 1;

    if (!oversized && (cost > remaining || orphaned)) {
      pageIndex += 1;
      used = 0;
      if (pageIndex >= FLOW_PAGES.length) {
        // Out of pages. Everything from here on is surplus.
        for (let j = i; j < blocks.length; j++) {
          overflowLines += blockLines(blocks[j]);
          dropped.push(blocks[j]);
        }
        break;
      }
    }

    pages[FLOW_PAGES[pageIndex]].push(block);
    used += cost;
  }

  return { pages, overflowLines, dropped };
}

/** Lines still free on each page — what the editor shows as room left. */
export function pageRoom(result: FlowResult, linesPerPage: number = LINES_PER_PAGE): Record<FlowPage, number> {
  const room = {} as Record<FlowPage, number>;
  for (const page of FLOW_PAGES) {
    const used = result.pages[page].reduce((sum, b) => sum + blockLines(b), 0);
    room[page] = Math.max(0, linesPerPage - used);
  }
  return room;
}
