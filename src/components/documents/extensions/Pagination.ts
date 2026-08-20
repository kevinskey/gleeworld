// Real pages for the Documents editor.
//
// Measures the natural height of each top-level block and inserts a gutter
// widget before any block that doesn't fit on the current page. Content after
// a gutter genuinely sits on the next sheet — this is not a rule drawn over a
// continuous flow (that was the first attempt; Kevin, 2026-08-20: "have pages
// and not just this?").
//
// Widget DECORATIONS, not nodes: the document is never modified, so comment
// anchors, find/replace positions, undo history and the CRDT's shared
// structure all keep addressing the same document they always did. Pagination
// is a view concern and stays entirely in the view.
//
// The loop this design has to avoid: inserting a gutter changes the layout,
// which changes the measurement, which changes where the gutters go. Solved
// by measuring each block's OWN height (offsetHeight, which excludes the
// sibling gutters) and never measuring cumulative offsets. Same document,
// same breaks, every time.
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { paginateBlocks } from '@/lib/documents/paginateBlocks';

export interface PaginationOptions {
  /** Usable height of one page in CSS px (sheet minus margins). */
  pageHeightPx: number;
  /** Height of the visual gap between sheets. */
  gutterPx: number;
  onPageCountChange?: (pages: number) => void;
}

export const paginationKey = new PluginKey<DecorationSet>('documentPagination');

/** Natural height of a top-level block, including its collapsed margins. */
function blockHeight(el: Element): number {
  const rect = (el as HTMLElement).getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return rect.height + parseFloat(style.marginTop || '0') + parseFloat(style.marginBottom || '0');
}

function computeDecorations(view: EditorView, options: PaginationOptions): DecorationSet {
  const children = Array.from(view.dom.children);
  if (children.length === 0) return DecorationSet.empty;

  const heights = children.map(blockHeight);
  const starts = paginateBlocks(heights, options.pageHeightPx);
  options.onPageCountChange?.(starts.length + 1);
  if (starts.length === 0) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  for (const index of starts) {
    const el = children[index] as HTMLElement;
    // posAtDOM with side -1 gives the position immediately BEFORE the block,
    // which is where the gutter belongs.
    let pos: number;
    try {
      pos = view.posAtDOM(el, 0) - 1;
    } catch {
      continue; // element left the tree between measure and read
    }
    if (pos < 0) continue;

    decorations.push(Decoration.widget(pos, () => {
      const gap = document.createElement('div');
      gap.className = 'gw-page-gap';
      gap.style.height = `${options.gutterPx}px`;
      gap.setAttribute('aria-hidden', 'true');
      // contenteditable=false so the caret can't land inside the gutter and
      // arrow keys step over it as one unit.
      gap.contentEditable = 'false';
      return gap;
    }, {
      // side -1 keeps the widget before the block when content is inserted
      // exactly at the boundary; ignoreSelection stops it swallowing clicks.
      side: -1,
      ignoreSelection: true,
      key: `page-gap-${index}`,
    }));
  }

  return DecorationSet.create(view.state.doc, decorations);
}

export const Pagination = Extension.create<PaginationOptions>({
  name: 'documentPagination',

  addOptions() {
    return { pageHeightPx: 864, gutterPx: 56, onPageCountChange: undefined };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin<DecorationSet>({
        key: paginationKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, value) {
            const next = tr.getMeta(paginationKey) as DecorationSet | undefined;
            if (next) return next;
            // Map through the change so gutters stay put while typing, until
            // the next measurement replaces them wholesale.
            return value.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return paginationKey.getState(state) ?? DecorationSet.empty;
          },
        },

        view(view) {
          let frame = 0;
          let lastKey = '';

          const measure = () => {
            frame = 0;
            const decorations = computeDecorations(view, options);
            // Only dispatch when the break positions actually changed.
            // Dispatching unconditionally from a view update is how this kind
            // of plugin ends up in an infinite transaction loop.
            const key = decorations.find().map((d) => d.from).join(',');
            if (key === lastKey) return;
            lastKey = key;
            view.dispatch(view.state.tr.setMeta(paginationKey, decorations));
          };

          const schedule = () => {
            if (frame) return;
            // rAF: measure after the browser has laid out this change, never
            // during a ProseMirror update.
            frame = requestAnimationFrame(measure);
          };

          // Height changes without the document changing — fonts finishing
          // loading, images decoding, the window narrowing and a paragraph
          // rewrapping.
          const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(schedule)
            : null;
          observer?.observe(view.dom);

          schedule();

          return {
            update: schedule,
            destroy() {
              if (frame) cancelAnimationFrame(frame);
              observer?.disconnect();
            },
          };
        },
      }),
    ];
  },
});
