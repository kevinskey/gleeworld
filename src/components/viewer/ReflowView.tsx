// "Cheap" reflow mode — a horizontal teleprompter built by slicing every
// page into N equal-height strips and chaining them edge-to-edge. Works
// for most modern engraving since systems are roughly uniform height
// rows; if a score has wildly varying system heights you'll see slight
// crops, but the orientation problem (tiny vertical page on a tall phone)
// is solved 90% of the way without any image processing.
//
// Real forScore-style reflow needs staff-system detection (image
// processing or AI). Saving that for the next pass.

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import type { PDFViewerHandle } from '@/components/PDFViewerWithAnnotations';

interface ReflowViewProps {
  pdfRef: React.MutableRefObject<PDFViewerHandle | null>;
  totalPages: number;
  onClose: () => void;
  initialPage: number;
}

const STRIPS_PER_PAGE = 5;

export function ReflowView({ pdfRef, totalPages, onClose, initialPage }: ReflowViewProps) {
  const [pages, setPages] = useState<Record<number, string>>({});
  const [stripIndex, setStripIndex] = useState((initialPage - 1) * STRIPS_PER_PAGE);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy-render pages around the current strip. We always keep ±2 pages
  // worth of strips warm so swiping feels instant.
  useEffect(() => {
    const currentPage = Math.floor(stripIndex / STRIPS_PER_PAGE) + 1;
    const wanted = [currentPage - 1, currentPage, currentPage + 1, currentPage + 2].filter(
      (p) => p >= 1 && p <= totalPages,
    );
    let cancelled = false;
    (async () => {
      for (const p of wanted) {
        if (pages[p]) continue;
        const url = await pdfRef.current?.renderThumbnail(p, 1.5);
        if (cancelled) return;
        if (url) setPages((prev) => ({ ...prev, [p]: url }));
      }
    })();
    return () => { cancelled = true; };
  }, [stripIndex, totalPages, pdfRef, pages]);

  // Snap to the current strip when index changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const strip = el.querySelector<HTMLElement>(`[data-strip-index="${stripIndex}"]`);
    strip?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [stripIndex]);

  // Build the strip list. Each strip is "show only this row of this page".
  const strips: Array<{ page: number; row: number }> = [];
  for (let p = 1; p <= totalPages; p++) {
    for (let r = 0; r < STRIPS_PER_PAGE; r++) strips.push({ page: p, row: r });
  }

  return (
    <div className="fixed inset-0 bg-background z-[60] flex flex-col">
      <div className="h-10 flex items-center gap-2 px-2 border-b bg-background/95 backdrop-blur shrink-0">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
        <div className="text-xs text-muted-foreground flex-1 text-center">
          Reflow · strip {stripIndex + 1} / {strips.length}
          <span className="ml-2 opacity-70">page {Math.floor(stripIndex / STRIPS_PER_PAGE) + 1}</span>
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setStripIndex((i) => Math.max(0, i - 1))} disabled={stripIndex === 0}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setStripIndex((i) => Math.min(strips.length - 1, i + 1))} disabled={stripIndex >= strips.length - 1}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden flex bg-muted/30 snap-x snap-mandatory"
      >
        {strips.map((s, idx) => (
          <StripPanel
            key={idx}
            page={s.page}
            row={s.row}
            src={pages[s.page]}
            isCurrent={idx === stripIndex}
            stripIndex={idx}
            onClick={() => setStripIndex(idx)}
          />
        ))}
      </div>
    </div>
  );
}

function StripPanel({
  page, row, src, isCurrent, stripIndex, onClick,
}: {
  page: number;
  row: number;
  src: string | undefined;
  isCurrent: boolean;
  stripIndex: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-strip-index={stripIndex}
      onClick={onClick}
      className="h-full shrink-0 snap-center overflow-hidden bg-white relative border-r border-border focus:outline-none"
      style={{ width: 'min(90vw, 1200px)' }}
    >
      {src ? (
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={src}
            alt={`Page ${page} strip ${row + 1}`}
            className="absolute left-0 right-0 w-full"
            style={{
              top: `${-row * (100 / STRIPS_PER_PAGE) * STRIPS_PER_PAGE}%`,
              height: `${STRIPS_PER_PAGE * 100}%`,
              clipPath: 'none',
            }}
          />
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}
      {isCurrent && <div className="absolute inset-0 ring-2 ring-primary pointer-events-none" />}
      <div className="absolute bottom-1 right-2 text-[10px] text-muted-foreground bg-background/80 px-1 rounded">
        p.{page} · {row + 1}/{STRIPS_PER_PAGE}
      </div>
    </button>
  );
}
