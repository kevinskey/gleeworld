// Half-page split view, staff-aware.
//
// Top panel shows the BOTTOM of the current page from its staff-system
// split-line down; bottom panel shows the TOP of the next page from the
// page header down to its staff-system split-line. The split is detected
// per-page by `findStaffSplitY` (looks for the darkest-to-brightest
// transition in the middle 30–70% of the page) so a system of staves is
// never bisected.
//
// We also paint the loaded annotations on a transparent overlay so any
// pencil/eraser/stamp marks the user has saved show up in this view.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PDFViewerHandle } from '@/components/PDFViewerWithAnnotations';
import { findStaffSplitY } from '@/lib/staffSplit';
import { useSheetMusicAnnotations, type Annotation } from '@/hooks/useSheetMusicAnnotations';

interface HalfPageViewProps {
  pdfRef: React.MutableRefObject<PDFViewerHandle | null>;
  sheetMusicId: string;
  currentPage: number;
  totalPages: number;
  onClose: () => void;
  onPageChange: (page: number) => void;
}

export function HalfPageView({
  pdfRef, sheetMusicId, currentPage, totalPages, onClose, onPageChange,
}: HalfPageViewProps) {
  const [pages, setPages] = useState<Record<number, string>>({});
  const [splits, setSplits] = useState<Record<number, number>>({});
  const [turning, setTurning] = useState(false);

  // Render the current ±1 pages at high resolution. We use 2× scale so the
  // annotations overlay can position itself with sub-pixel accuracy.
  useEffect(() => {
    let cancelled = false;
    const wanted = [currentPage, currentPage + 1, currentPage - 1].filter(
      (p) => p >= 1 && p <= totalPages,
    );
    (async () => {
      for (const p of wanted) {
        if (pages[p]) continue;
        const url = await pdfRef.current?.renderThumbnail(p, 2.0);
        if (cancelled) return;
        if (url) setPages((prev) => ({ ...prev, [p]: url }));
      }
    })();
    return () => { cancelled = true; };
  }, [currentPage, totalPages, pdfRef, pages]);

  // Compute split-y for each rendered page. Cache by page src so we don't
  // re-analyze on every render.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const todo = Object.entries(pages).filter(([k]) => splits[Number(k)] === undefined);
      for (const [k, src] of todo) {
        const p = Number(k);
        try {
          const split = await findStaffSplitY(src);
          if (cancelled) return;
          setSplits((prev) => ({ ...prev, [p]: split }));
        } catch {
          // Fall back to geometric middle on detection failure.
          if (!cancelled) setSplits((prev) => ({ ...prev, [p]: 0.5 }));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [pages, splits]);

  const turn = (dir: 1 | -1) => {
    const next = currentPage + dir;
    if (next < 1 || next > totalPages) return;
    setTurning(true);
    window.setTimeout(() => {
      onPageChange(next);
      setTurning(false);
    }, 180);
  };

  const currentSrc = pages[currentPage];
  const nextSrc = pages[currentPage + 1];
  const currentSplit = splits[currentPage] ?? 0.5;
  const nextSplit = splits[currentPage + 1] ?? 0.5;

  return (
    <div className="fixed inset-0 bg-background z-[60] flex flex-col">
      <div className="h-10 flex items-center gap-2 px-2 border-b bg-background/95 backdrop-blur shrink-0">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
        <div className="text-xs text-muted-foreground flex-1 text-center">
          Half-page · viewing {currentPage}–{Math.min(currentPage + 1, totalPages)} of {totalPages}
        </div>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => turn(-1)} disabled={currentPage <= 1}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => turn(1)} disabled={currentPage >= totalPages}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col bg-muted/30 overflow-hidden">
        {/* TOP half: from currentSplit to bottom of current page */}
        <HalfPanel
          src={currentSrc}
          sheetMusicId={sheetMusicId}
          pageNumber={currentPage}
          // Show the band from splitY → 1.0 of the page.
          fromFrac={currentSplit}
          toFrac={1}
          ariaLabel={`Bottom of page ${currentPage}, from staff split`}
          turning={turning}
          turnDir="up"
        />
        <div className="h-px bg-border" />
        {/* BOTTOM half: 0 → nextSplit of the next page (or nothing if EOF) */}
        <HalfPanel
          src={nextSrc}
          sheetMusicId={sheetMusicId}
          pageNumber={currentPage + 1 <= totalPages ? currentPage + 1 : null}
          fromFrac={0}
          toFrac={nextSplit}
          ariaLabel={
            currentPage + 1 <= totalPages
              ? `Top of page ${currentPage + 1}, to staff split`
              : 'End of score'
          }
          turning={turning}
          turnDir="up"
        />
      </div>
    </div>
  );
}

function HalfPanel({
  src, sheetMusicId, pageNumber, fromFrac, toFrac, ariaLabel, turning, turnDir,
}: {
  src: string | undefined;
  sheetMusicId: string;
  pageNumber: number | null;
  fromFrac: number;
  toFrac: number;
  ariaLabel: string;
  turning: boolean;
  turnDir: 'up' | 'down';
}) {
  // The panel is overflow:hidden; the inner image is positioned so only
  // the [fromFrac, toFrac] vertical band of the page is visible. Image
  // height is computed as panel height ÷ (toFrac - fromFrac); the image
  // is then translated up by fromFrac × image height.
  const slice = Math.max(0.05, toFrac - fromFrac);
  return (
    <div className="flex-1 min-h-0 overflow-hidden relative bg-white" aria-label={ariaLabel}>
      {pageNumber === null ? (
        <div className="h-full flex items-center justify-center">
          <span className="text-xs text-muted-foreground italic">End of score</span>
        </div>
      ) : !src ? (
        <div className="h-full flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div
          className={cn(
            'absolute left-0 right-0 top-0 bottom-0 overflow-hidden transition-transform duration-200 ease-out',
            turning && (turnDir === 'up' ? 'translate-y-[-12%]' : 'translate-y-[12%]'),
          )}
        >
          <SliceWithAnnotations
            src={src}
            sheetMusicId={sheetMusicId}
            pageNumber={pageNumber}
            fromFrac={fromFrac}
            slice={slice}
          />
        </div>
      )}
    </div>
  );
}

function SliceWithAnnotations({
  src, sheetMusicId, pageNumber, fromFrac, slice,
}: {
  src: string;
  sheetMusicId: string;
  pageNumber: number;
  fromFrac: number;
  slice: number;
}) {
  // Load every annotation for this score and filter to the page. The hook
  // exposes a manual fetch; trigger it on mount for the page we need.
  const { annotations, fetchAnnotations } = useSheetMusicAnnotations(sheetMusicId);
  useEffect(() => {
    if (sheetMusicId) fetchAnnotations(sheetMusicId, pageNumber);
  }, [sheetMusicId, pageNumber, fetchAnnotations]);
  const pageAnnotations = useMemo(
    () => annotations.filter((a) => a.page_number === pageNumber),
    [annotations, pageNumber],
  );

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [wrapperHeight, setWrapperHeight] = useState(0);
  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const t = e.currentTarget;
    setImgSize({ w: t.naturalWidth, h: t.naturalHeight });
  };

  // Measure wrapper height so we can decide whether to scale the image
  // by width (default — fills panel horizontally, may overflow vertically
  // and get clipped to the band) OR by height (when the band's natural
  // height exceeds the panel and we want the full band visible).
  useEffect(() => {
    const w = wrapperRef.current;
    if (!w) return;
    const update = () => setWrapperHeight(w.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(w);
    return () => ro.disconnect();
  }, []);

  // Image sizing strategy:
  //   • Default: width = 100% of the panel, height = auto (natural aspect).
  //   • Then translateY(-fromFrac × 100%) — CSS percent transforms are
  //     relative to the ELEMENT's own size, so this shifts the image up
  //     by fromFrac × rendered image height, landing the band's top edge
  //     at the panel's top edge.
  //   • overflow:hidden on the wrapper clips everything outside the band.
  //
  // The previous attempt used `height: 100/slice%` + `objectFit: contain`
  // which made the rendered image position unpredictable — translateY
  // was applied to the BOX, not the rendered image, so the band shifted
  // by an arbitrary amount and the score ended up cropped wrong. This
  // simpler width-only sizing is the standard pattern and what the
  // annotation overlay's math already assumes.
  const imgStyle = useMemo<React.CSSProperties>(() => ({
    width: '100%',
    height: 'auto',
    transform: `translateY(${-fromFrac * 100}%)`,
    transformOrigin: 'top left',
    display: 'block',
  }), [fromFrac]);

  return (
    <div ref={wrapperRef} className="relative w-full h-full overflow-hidden">
      <img src={src} alt="" onLoad={handleLoad} style={imgStyle} className="absolute left-0 top-0" />
      {imgSize && wrapperHeight > 0 && (
        <AnnotationOverlay
          annotations={pageAnnotations}
          containerRef={wrapperRef}
          imgWidth={imgSize.w}
          imgHeight={imgSize.h}
          fromFrac={fromFrac}
          slice={slice}
        />
      )}
    </div>
  );
}

function AnnotationOverlay({
  annotations, containerRef, imgWidth, imgHeight, fromFrac, slice,
}: {
  annotations: Annotation[];
  containerRef: React.RefObject<HTMLDivElement>;
  imgWidth: number;
  imgHeight: number;
  fromFrac: number;
  slice: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * (window.devicePixelRatio || 1);
    canvas.height = rect.height * (window.devicePixelRatio || 1);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Each annotation row stores annotation_data with paths drawn against
    // a canvas of canvasWidth × canvasHeight. We need to (a) scale those
    // coords to the IMAGE coords (the displayed image is sized to fill
    // width = rect.width and height = rect.width × imgH/imgW), then (b)
    // shift up by fromFrac × image height so they line up with the slice.
    const imgDisplayedW = rect.width;
    const imgDisplayedH = imgDisplayedW * imgHeight / imgWidth;
    const shiftY = -fromFrac * imgDisplayedH;

    for (const ann of annotations) {
      if (ann.annotation_type !== 'drawing') continue;
      const data: any = ann.annotation_data;
      const paths: any[] = data?.paths ?? [];
      const sourceW = data?.canvasWidth || imgWidth;
      const sourceH = data?.canvasHeight || imgHeight;
      const sx = imgDisplayedW / sourceW;
      const sy = imgDisplayedH / sourceH;
      for (const path of paths) {
        if (path.tool === 'stamp' && path.stamp) {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = path.color;
          const font = path.font === 'bravura' ? '"Bravura"' : 'Georgia, serif';
          const style = path.font === 'bravura' ? '' : 'italic 700 ';
          ctx.font = `${style}${path.size * sx}px ${font}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(path.stamp, path.x * sx, path.y * sy + shiftY);
          continue;
        }
        if (!path.points || path.points.length < 2) continue;
        ctx.globalCompositeOperation = path.tool === 'erase' ? 'destination-out' : 'source-over';
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.size * sx;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(path.points[0].x * sx, path.points[0].y * sy + shiftY);
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x * sx, path.points[i].y * sy + shiftY);
        }
        ctx.stroke();
      }
    }
  }, [annotations, containerRef, imgWidth, imgHeight, fromFrac, slice]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
