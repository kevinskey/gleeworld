// Off-screen measurement of every flowable unit in a program, at the exact
// width/design/format it will actually print at. paginateProgram (Task 4)
// needs REAL heights, not estimates — this hook is the only thing allowed
// to produce them. Presentational rendering stays delegated to
// PageItemView/designClass (BlockRenderers.tsx) so the measured markup is
// byte-for-byte what the real page renders, fonts and all.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ProgramBlock, PrintDesign, ProgramFormat } from '@/lib/concertProgram/types';
import { blocksToUnits, unitKey } from '@/lib/concertProgram/paginate';
import { contentWidthIn, PX_PER_IN } from '@/lib/concertProgram/geometry';
import { PageItemView, designClass, type RenderCtx } from './blocks/BlockRenderers';

export interface UseBlockMeasurementsArgs {
  blocks: ProgramBlock[];
  ctx: RenderCtx;
  design: PrintDesign;
  format: ProgramFormat;
  rosterSectionIds: string[];
}

export interface UseBlockMeasurementsResult {
  heights: Map<string, number> | null;
  measureHost: ReactNode;
}

function mapsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, value] of b) {
    const prev = a.get(key);
    if (prev === undefined || Math.abs(prev - value) > 0.001) return false;
  }
  return true;
}

export function useBlockMeasurements({
  blocks, ctx, design, format, rosterSectionIds,
}: UseBlockMeasurementsArgs): UseBlockMeasurementsResult {
  const hostRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<Map<string, number> | null>(null);

  const units = useMemo(
    () => blocksToUnits(blocks, rosterSectionIds),
    [blocks, rosterSectionIds],
  );

  // Only the fields that actually change what's painted feed the signature:
  // the block list itself (order/config), design, format, the piece fields
  // PieceLine renders (never duration — it's deliberately never printed),
  // and roster names. Anything else changing must not trigger a re-measure.
  const signature = useMemo(() => {
    const pieceFields = Array.from(ctx.piecesById.values()).map((p) => [
      p.id, p.title, p.composer, p.arranger, p.voicing, p.soloists,
    ]);
    const rosterNames = ctx.roster.map((s) => [
      s.id, s.section_name, s.members.map((m) => m.member_name),
    ]);
    return JSON.stringify([blocks, design, format, pieceFields, rosterNames]);
  }, [blocks, design, format, ctx.piecesById, ctx.roster]);

  useEffect(() => {
    let cancelled = false;
    // Debounced so a burst of edits (which also drive autosave) settles
    // once, not once per keystroke.
    const timer = window.setTimeout(() => {
      const wait = 'fonts' in document ? document.fonts.ready : Promise.resolve();
      wait
        .then(() => {
          if (cancelled) return;
          const host = hostRef.current;
          const next = new Map<string, number>();
          const nodes = host ? host.querySelectorAll<HTMLElement>('[data-unit]') : null;
          if (nodes && nodes.length) {
            nodes.forEach((el) => {
              const key = el.dataset.unit;
              if (key) next.set(key, el.offsetHeight / PX_PER_IN);
            });
          } else {
            for (const u of units) next.set(unitKey(u), 0);
          }
          setHeights((prev) => {
            // Render-loop guard: only commit a new Map when something
            // actually changed by more than float noise. Without this,
            // remeasuring on every render that this very setState causes
            // would loop forever (cf. WorshipAidSheets.tsx:416-419).
            if (prev && mapsEqual(prev, next)) return prev;
            return next;
          });
        })
        .catch(() => {
          // document.fonts.ready doesn't reject in practice, but a defensive
          // no-op keeps a font-loading failure from ever throwing here.
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const halfFold = format === 'half-fold';
  const measureHost = (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`cp-page ${designClass(design)}${halfFold ? ' cp-format-half-fold' : ''}`}
      style={{
        position: 'fixed',
        left: '-9999px',
        top: 0,
        visibility: 'hidden',
        pointerEvents: 'none',
        width: `${contentWidthIn(format)}in`,
      }}
    >
      {units.map((u) => (
        <div key={unitKey(u)} data-unit={unitKey(u)}>
          <PageItemView item={{ unit: u }} ctx={ctx} />
        </div>
      ))}
    </div>
  );

  return { heights, measureHost };
}
