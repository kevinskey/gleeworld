// Renders already-paginated program pages at their TRUE printed size — one
// `.cp-sheet` per page, sized in real inches by inline style, exactly as
// the eventual print CSS will size it. Imposition (folding two half-fold
// panels onto one physical letter sheet) is a print-only concern for a
// later task; here every panel is its own sheet in reading order, which is
// what an editor needs to show.
//
// `pages` is expected to have already been produced by paginateProgram
// (Task 4) from measured heights (useBlockMeasurements) — this component
// does no measuring or flowing of its own.
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { PageItem } from '@/lib/concertProgram/paginate';
import { unitKey } from '@/lib/concertProgram/paginate';
import type { PrintDesign, ProgramFormat } from '@/lib/concertProgram/types';
import { LETTER, PANEL, PX_PER_IN } from '@/lib/concertProgram/geometry';
import { PageItemView, designClass, type RenderCtx } from './blocks/BlockRenderers';

export interface ProgramSheetViewProps {
  pages: PageItem[][];
  ctx: RenderCtx;
  design: PrintDesign;
  format: ProgramFormat;
  /** Editor: true (fit the pane). Print view renders at 100% — omit or false. */
  scaleToFit?: boolean;
  /** Screen-only per-page adornments (page number badge, etc.) — later tasks. */
  renderPageChrome?: (pageIndex: number) => ReactNode;
  children?: never;
}

/** Screen-only gap between stacked sheets — matches the `margin: 0 auto 1rem` chrome below. */
const SHEET_GAP_PX = 16;

export function ProgramSheetView({
  pages, ctx, design, format, scaleToFit = false, renderPageChrome,
}: ProgramSheetViewProps) {
  const halfFold = format === 'half-fold';
  const dims = halfFold ? PANEL : LETTER;
  const sheetWpx = dims.sheetW * PX_PER_IN;
  const sheetHpx = dims.sheetH * PX_PER_IN;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // AidStage pattern verbatim (AidStage.tsx:40-53): ResizeObserver, feature
  // detected since jsdom doesn't polyfill it — scale stays 1 there.
  useEffect(() => {
    if (!scaleToFit) return;
    const el = wrapperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      const available = el.clientWidth - 32;
      setScale(available > 0 ? Math.min(available / sheetWpx, 1.25) : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scaleToFit, sheetWpx]);

  const effectiveScale = scaleToFit ? scale : 1;

  const wrapperStyle: CSSProperties = {
    ['--cp-scale' as string]: String(effectiveScale),
    ...(scaleToFit
      ? {
          // `contain: paint` plus an explicit height reserved for the
          // SCALED size of every page: transform: scale() never changes an
          // element's box for layout purposes, so without this the
          // un-scaled (full-size) box of every shrunk sheet would still
          // claim its full height in the flow below it — a growing gap of
          // blank, scrollable "ghost" space under each page.
          contain: 'paint',
          height: `${pages.length * (sheetHpx * effectiveScale + SHEET_GAP_PX)}px`,
        }
      : {}),
  };

  const sheetClass = `cp-sheet cp-page ${designClass(design)}${halfFold ? ' cp-format-half-fold' : ''}`;
  const sheetStyle: CSSProperties = {
    width: `${dims.sheetW}in`,
    height: `${dims.sheetH}in`,
    padding: `${dims.pad}in`,
    background: '#fff',
    boxShadow: '0 1px 12px rgba(0,0,0,0.18)',
    margin: '0 auto 1rem',
    overflow: 'hidden',
  };

  return (
    <div ref={wrapperRef} className="cp-sheet-view" style={wrapperStyle}>
      {pages.map((pageItems, pageIndex) => {
        const sheet = (
          <div className={sheetClass} style={sheetStyle}>
            {pageItems.map((item) => (
              <PageItemView key={unitKey(item.unit)} item={item} ctx={ctx} />
            ))}
          </div>
        );
        const pageWrapperStyle: CSSProperties = scaleToFit
          ? { height: `${sheetHpx * effectiveScale + SHEET_GAP_PX}px`, overflow: 'hidden', position: 'relative' }
          : { position: 'relative' };
        return (
          <div key={pageIndex} className="cp-sheet-page" style={pageWrapperStyle} data-page={pageIndex}>
            {scaleToFit ? (
              <div style={{ transform: 'scale(var(--cp-scale, 1))', transformOrigin: 'top center' }}>
                {sheet}
              </div>
            ) : sheet}
            {renderPageChrome?.(pageIndex)}
          </div>
        );
      })}
    </div>
  );
}
