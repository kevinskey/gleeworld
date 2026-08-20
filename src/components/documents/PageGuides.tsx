// Page boundaries drawn over the editor's continuous flow.
//
// The document stays ONE ProseMirror document — that's what keeps
// collaboration, comment anchors, and find/replace positions valid — so this
// measures the rendered content and paints a rule wherever a physical page
// would end, with the page number beside it. Print and .docx do the real
// pagination from the same page setup, so what comes out matches what the
// rules predict.
import { useEffect, useState } from 'react';
import { pageBoundaries, pageCount } from '@/lib/documents/pagination';

interface PageGuidesProps {
  /** The element whose height is the document's content height. */
  contentEl: HTMLElement | null;
  /** Usable height of one page, in CSS pixels. */
  pageHeightPx: number;
  /** Top inset of the content box — the page's top margin. */
  offsetTopPx: number;
  onPageCountChange?: (pages: number) => void;
}

export function PageGuides({ contentEl, pageHeightPx, offsetTopPx, onPageCountChange }: PageGuidesProps) {
  const [contentHeight, setContentHeight] = useState(0);

  // ResizeObserver rather than an editor update handler: height changes for
  // reasons the document doesn't know about — a font loading, an image
  // decoding, the window narrowing and a paragraph rewrapping.
  useEffect(() => {
    if (!contentEl || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.height ?? 0;
      setContentHeight((prev) => (Math.abs(prev - next) < 1 ? prev : next));
    });
    observer.observe(contentEl);
    setContentHeight(contentEl.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, [contentEl]);

  const pages = pageCount(contentHeight, pageHeightPx);
  const boundaries = pageBoundaries(contentHeight, pageHeightPx);

  useEffect(() => { onPageCountChange?.(pages); }, [pages, onPageCountChange]);

  if (boundaries.length === 0) return null;

  return (
    // aria-hidden and pointer-events-none: these are a drawing, not content.
    // A click near a rule must land in the text underneath it, and a screen
    // reader should hear the document, not a list of rules.
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0" aria-hidden="true">
      {boundaries.map((offset, i) => (
        <div
          key={offset}
          className="absolute inset-x-0 flex items-center gap-2"
          style={{ top: offsetTopPx + offset }}
        >
          <div className="h-px flex-1 border-t border-dashed border-border" />
          <span className="shrink-0 pr-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            Page {i + 2}
          </span>
        </div>
      ))}
    </div>
  );
}
