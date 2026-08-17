// True-paper Print / Save-PDF overlay for the Concert Planner (Task 13).
// PrintPaperView (src/components/documents/PrintPaperView.tsx) pattern,
// adapted: portal to document.body (sibling of #root), `printing-program`
// on <body>, an imperative `@page` <style> injected on mount and removed
// on unmount, Esc to close.
//
// This overlay is READ-ONLY — it renders `ctx` (RenderCtx) as handed to it,
// never adds an `edit` (ProgramEditCtx). The caller (ConcertPlannerEditorPage)
// is responsible for passing its measurement `ctx` (which already has no
// `edit`), not the on-page `viewCtx`.
//
// Letter format: one `.cp-sheet` per page, true 8.5x11in size, exactly what
// ProgramSheetView shows on screen (minus the editor's scale-to-fit).
//
// Half-fold format: `pages` here are PANELS — the editor's paginateProgram
// already flows content at panel content height (Task 6), so `pages.length`
// IS the panel count. `imposeHalfFold(pages.length)` (src/lib/concertProgram/impose.ts)
// returns 0-based front/back panel index pairs per physical 11x8.5in sheet;
// an index >= pages.length is a padding blank (booklets impose in
// multiples of 4). Each physical sheet renders as TWO `.cp-print-sheet`s
// (front, then back) so duplex printing (flip on short edge) folds correctly.
import { Fragment, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { unitKey, type PageItem } from '@/lib/concertProgram/paginate';
import type { PrintDesign, ProgramFormat } from '@/lib/concertProgram/types';
import { imposeHalfFold } from '@/lib/concertProgram/impose';
import { PageItemView, designClass, type RenderCtx } from './blocks/BlockRenderers';
import '@/styles/concert-program-print.css';

export interface ConcertProgramPrintViewProps {
  pages: PageItem[][];
  ctx: RenderCtx;
  design: PrintDesign;
  format: ProgramFormat;
  onClose: () => void;
}

// `boxSizing: 'border-box'` is explicit on every sheet/panel dimension
// below (not just the half-fold panel) — Tailwind's preflight reset
// happens to set border-box globally today, but a *physical* 8.5x11in (or
// 5.5x8.5in) page size must not silently depend on that global staying in
// place; padding must be carved OUT of the stated width/height, never
// added on top of it.
const LETTER_SHEET_STYLE = {
  width: '8.5in', height: '11in', padding: '0.75in', background: '#fff', boxSizing: 'border-box',
} as const;
const HALF_FOLD_SHEET_STYLE = {
  width: '11in', height: '8.5in', display: 'flex', position: 'relative', background: '#fff', boxSizing: 'border-box',
} as const;
const HALF_FOLD_PANEL_STYLE = {
  width: '5.5in', height: '8.5in', padding: '0.5in', overflow: 'hidden', boxSizing: 'border-box',
} as const;
const FOLD_LINE_STYLE = {
  position: 'absolute', left: '5.5in', top: 0, bottom: 0, borderLeft: '1px dashed #bbb',
} as const;

function PanelContent({ idx, pages, ctx }: { idx: number; pages: PageItem[][]; ctx: RenderCtx }) {
  if (idx >= pages.length) return null; // padding blank panel
  return (
    <>
      {pages[idx].map((item) => (
        <PageItemView key={unitKey(item.unit)} item={item} ctx={ctx} />
      ))}
    </>
  );
}

function HalfFoldPrintSheet({
  panelIdxs, pages, ctx, design,
}: { panelIdxs: [number, number]; pages: PageItem[][]; ctx: RenderCtx; design: PrintDesign }) {
  return (
    <div className={`cp-print-sheet cp-page ${designClass(design)} cp-format-half-fold`} style={HALF_FOLD_SHEET_STYLE}>
      {panelIdxs.map((idx, i) => (
        <div key={i} data-panel-idx={idx} style={HALF_FOLD_PANEL_STYLE}>
          <PanelContent idx={idx} pages={pages} ctx={ctx} />
        </div>
      ))}
      <div className="no-print" style={FOLD_LINE_STYLE} />
    </div>
  );
}

export function ConcertProgramPrintView({ pages, ctx, design, format, onClose }: ConcertProgramPrintViewProps) {
  const halfFold = format === 'half-fold';

  // Esc closes, matching PrintPaperView. Attached to `window`, not the
  // portaled subtree, so it works regardless of where in the DOM the
  // overlay actually lives.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // `body.printing-program` is what concert-program-print.css's
  // `body.printing-program #root { display: none }` rule needs to hide the
  // whole dashboard shell during print — added/removed only while this
  // overlay is actually mounted so a crash can't strand the app hidden.
  useEffect(() => {
    document.body.classList.add('printing-program');
    return () => document.body.classList.remove('printing-program');
  }, []);

  // `@page` is a document-level at-rule — it can't be scoped under a class
  // selector, so it can't live in concert-program-print.css without leaking
  // page size onto every other print job for the rest of the session.
  // Injected as its own <style> element only while this overlay is
  // mounted, and re-injected whenever `format` changes.
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = format === 'half-fold'
      ? '@page { size: 11in 8.5in; margin: 0; }'
      : '@page { size: 8.5in 11in; margin: 0; }';
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [format]);

  const handlePrint = async () => {
    if ('fonts' in document) {
      try { await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready; } catch { /* print anyway */ }
    }
    if (typeof window.print === 'function') window.print();
  };

  const checklist = halfFold
    ? 'In the print dialog: 100% scale (no fit-to-page), margins None. Save as PDF here = the PDF export. Print double-sided, flip on short edge.'
    : 'In the print dialog: 100% scale (no fit-to-page), margins None. Save as PDF here = the PDF export.';

  const sheets = useMemo(
    () => (halfFold ? imposeHalfFold(pages.length) : null),
    [halfFold, pages.length],
  );

  return createPortal(
    <div className="cp-print-overlay">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
        <span className="text-xs text-muted-foreground">{checklist}</span>
        <div className="flex items-center gap-2 shrink-0">
          <Button type="button" size="sm" className="text-xs" onClick={() => { void handlePrint(); }}>Print</Button>
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onClose}>Close</Button>
        </div>
      </div>

      {halfFold ? (
        // Every label + `.cp-print-sheet` is a FLAT sibling inside this one
        // container (Fragment, not a per-sheet wrapper div) — CSS's
        // `.cp-print-sheet:last-child { page-break-after: auto }` (see
        // concert-program-print.css) only exempts the true final sheet from
        // a forced break this way. A per-sheet wrapper div would make every
        // sheet :last-child OF ITS OWN wrapper, silencing every forced break.
        <div className="cp-print-body">
          {sheets!.map((sheet, sheetIdx) => (
            <Fragment key={sheetIdx}>
              <p className="no-print text-center text-xs text-muted-foreground pt-3 pb-1">Sheet {sheetIdx + 1} — front</p>
              <HalfFoldPrintSheet panelIdxs={sheet.front} pages={pages} ctx={ctx} design={design} />
              <p className="no-print text-center text-xs text-muted-foreground pt-3 pb-1">Sheet {sheetIdx + 1} — back</p>
              <HalfFoldPrintSheet panelIdxs={sheet.back} pages={pages} ctx={ctx} design={design} />
            </Fragment>
          ))}
        </div>
      ) : (
        // Same flat-siblings requirement as the half-fold branch above —
        // see that comment.
        <div className="cp-print-body">
          {pages.map((pageItems, pageIndex) => (
            <Fragment key={pageIndex}>
              <p className="no-print text-center text-xs text-muted-foreground pt-3 pb-1">Page {pageIndex + 1}</p>
              <div className={`cp-sheet cp-page ${designClass(design)}`} style={LETTER_SHEET_STYLE}>
                {pageItems.map((item) => (
                  <PageItemView key={unitKey(item.unit)} item={item} ctx={ctx} />
                ))}
              </div>
            </Fragment>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

export default ConcertProgramPrintView;
