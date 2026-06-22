// Open-book two-page mode for iPad landscape and large desktops.
// Shows pages N and N+1 side-by-side, then "next" advances by 2 pages
// the way a physical music stand turns a spread. Renders at hi-DPI via
// the PDFViewer's existing renderThumbnail handle.

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import type { PDFViewerHandle } from '@/components/PDFViewerWithAnnotations';

interface TwoPageViewProps {
  pdfRef: React.MutableRefObject<PDFViewerHandle | null>;
  currentPage: number;
  totalPages: number;
  onClose: () => void;
  onPageChange: (page: number) => void;
}

export function TwoPageView({ pdfRef, currentPage, totalPages, onClose, onPageChange }: TwoPageViewProps) {
  // Snap the leading page to an odd number so the spread shows e.g. 1|2,
  // 3|4 — the layout most engravings expect.
  const leftPage = currentPage % 2 === 0 ? currentPage - 1 : currentPage;
  const rightPage = leftPage + 1;
  const [pages, setPages] = useState<Record<number, string>>({});

  useEffect(() => {
    const wanted = [leftPage, rightPage, leftPage + 2, leftPage - 2].filter(
      (p) => p >= 1 && p <= totalPages,
    );
    let cancelled = false;
    (async () => {
      for (const p of wanted) {
        if (pages[p]) continue;
        const url = await pdfRef.current?.renderThumbnail(p, 1.4);
        if (cancelled) return;
        if (url) setPages((prev) => ({ ...prev, [p]: url }));
      }
    })();
    return () => { cancelled = true; };
  }, [leftPage, rightPage, totalPages, pdfRef, pages]);

  const turn = (dir: 1 | -1) => {
    const step = 2 * dir;
    const target = Math.max(1, Math.min(totalPages, leftPage + step));
    onPageChange(target);
  };

  return (
    <div className="fixed inset-0 bg-background z-[60] flex flex-col">
      <div className="h-10 flex items-center gap-2 px-2 border-b bg-background/95 backdrop-blur shrink-0">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
        <div className="text-xs text-muted-foreground flex-1 text-center">
          Two-page · {leftPage}–{Math.min(rightPage, totalPages)} of {totalPages}
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => turn(-1)} disabled={leftPage <= 1}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => turn(1)} disabled={leftPage >= totalPages - 1}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-2 bg-muted/30">
        <PagePanel src={pages[leftPage]} page={leftPage} side="left" />
        <PagePanel
          src={rightPage <= totalPages ? pages[rightPage] : null}
          page={rightPage <= totalPages ? rightPage : null}
          side="right"
        />
      </div>
    </div>
  );
}

function PagePanel({ src, page, side }: { src: string | null | undefined; page: number | null; side: 'left' | 'right' }) {
  return (
    <div className={`relative min-h-0 bg-white flex items-center justify-center overflow-hidden ${side === 'left' ? 'border-r border-border' : ''}`}>
      {page === null ? (
        <span className="text-xs text-muted-foreground italic">End of score</span>
      ) : src ? (
        <img src={src} alt={`Page ${page}`} className="max-w-full max-h-full object-contain" />
      ) : (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      )}
      {page !== null && (
        <span className="absolute bottom-2 right-2 text-[10px] tabular-nums text-muted-foreground bg-background/80 px-1 rounded">
          {page}
        </span>
      )}
    </div>
  );
}
