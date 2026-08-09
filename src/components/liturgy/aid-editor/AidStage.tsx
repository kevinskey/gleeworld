import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import type { PanelId } from '@/lib/liturgy/worshipAid';
import { AID_VIEW_ATTR, PANEL_LABEL } from './aidView';

/** A single panel is half of an 11in sheet. */
const PANEL_WIDTH_IN = 5.5;
/** Browsers lay out CSS inches at 96px regardless of the real display. */
const PX_PER_IN = 96;

export interface AidStageProps {
  focusPanel: PanelId;
  overflowLines: number;
  dropped: number;
  /**
   * The single node AidStage exposes. It is BOTH the view wrapper — the
   * element carrying `AID_VIEW_ATTR`, `data-aid-focus`, and `--aid-scale` —
   * and the capture root `worshipAidToPdf`/`withFullView` must act on.
   * There is deliberately no second, inner ref: a capture call that toggled
   * `AID_VIEW_ATTR` on a different node than this one would leave the focus
   * CSS matching through the capture and file a one-panel PDF.
   */
  sheetsRef: RefObject<HTMLDivElement>;
  children: ReactNode;
}

/**
 * The right-hand pane: the sheet, held still while the rail is used.
 *
 * Scaling is a CSS custom property rather than a width, because the sheets
 * are laid out in real inches on purpose — a folded document whose preview
 * disagrees with the print is worse than no preview. Scale transforms the
 * rendered result; it never re-flows it.
 */
export function AidStage({
  focusPanel, overflowLines, dropped, sheetsRef, children,
}: AidStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      // 32px of breathing room so the sheet never touches the pane edges.
      const available = el.clientWidth - 32;
      const natural = PANEL_WIDTH_IN * PX_PER_IN;
      setScale(available > 0 ? Math.min(available / natural, 1.6) : 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasOverflow = overflowLines > 0 || dropped > 0;

  return (
    <div ref={stageRef} className="flex h-full min-w-0 flex-col">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur print:hidden">
        <span className="text-sm font-semibold">{PANEL_LABEL[focusPanel]}</span>
        {hasOverflow && (
          <span className="text-xs font-medium text-destructive">
            {overflowLines > 0 && `${overflowLines} line${overflowLines === 1 ? '' : 's'} over`}
            {overflowLines > 0 && dropped > 0 && ' · '}
            {dropped > 0 && `${dropped} dropped`}
          </span>
        )}
      </div>

      {/* AID_VIEW_ATTR is written as a literal, never from a prop or state.
          `withFullView` flips it imperatively for the duration of a PDF
          capture; a React re-render landing inside that `await` would write
          'focus' back over 'full' mid-capture and silently file a one-panel
          archive. Keeping it out of React's hands means withFullView is the
          only writer for as long as a capture is running. */}
      <div
        ref={sheetsRef}
        className="aid-stage-scroll min-h-0 flex-1 overflow-auto p-4"
        {...{ [AID_VIEW_ATTR]: 'focus' }}
        data-aid-focus={focusPanel}
        style={{ ['--aid-scale' as string]: String(scale) }}
      >
        {children}
      </div>

      <style>{`
        @media screen {
          /* Focus: show only the sheet holding the focused panel, only that
             panel within it, and scale the result to the pane.
             Everything here is screen-only — print resets in the sheets'
             own @media print block, which this must never duplicate. */
          [${AID_VIEW_ATTR}="focus"] .worship-aid-sheet { display: none; }
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="front"] .worship-aid-sheet:has([data-panel="front"]),
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="back"] .worship-aid-sheet:has([data-panel="back"]),
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="insideLeft"] .worship-aid-sheet:has([data-panel="insideLeft"]),
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="insideRight"] .worship-aid-sheet:has([data-panel="insideRight"]) {
            display: flex;
            width: ${PANEL_WIDTH_IN}in;
            transform: scale(var(--aid-scale, 1));
            transform-origin: top left;
            margin: 0;
          }
          /* !important is required: FrontPanel (WorshipAidSheets.tsx) renders
             its root with an inline style={{ display: 'flex', ... }}, and an
             inline style beats any stylesheet rule at equal or higher
             specificity unless that rule is !important. Without it, focusing
             "back" cannot hide the front/Cover panel — verified in real
             Chrome, where Cover rendered beside Back at half width each. */
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="front"] [data-panel]:not([data-panel="front"]),
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="back"] [data-panel]:not([data-panel="back"]),
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="insideLeft"] [data-panel]:not([data-panel="insideLeft"]),
          [${AID_VIEW_ATTR}="focus"][data-aid-focus="insideRight"] [data-panel]:not([data-panel="insideRight"]) {
            display: none !important;
          }
          /* The fold guide means nothing with one panel showing. */
          [${AID_VIEW_ATTR}="focus"] .worship-aid-fold { display: none; }
        }
        /* There is deliberately NO @media print block here. Every focus rule
           above is already inside @media screen, so none of it can reach the
           printer — and a "belt and braces" print reset is not harmless:
           forcing display:flex on [data-panel] laid the Mass's sibling
           blocks out in a row across the panel, and width:auto overrode the
           sheet's declared 11in, which is the dimension that decides where
           the fold lands. Printed output must not change; leave this alone. */
      `}</style>
    </div>
  );
}
