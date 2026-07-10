import { useEffect, useRef, useState } from 'react';
import { Renderer, Stave, StaveNote, Accidental, Formatter, StaveTie, Dot } from 'vexflow';
import { EditorScore } from '@/lib/notation/model';
import { layoutMeasures } from '@/lib/notation/measures';
import { toVexKey, toVexDuration, vexAccidentalCode } from '@/lib/notation/toVexflow';

const VEX_CLEF = { treble: 'treble', bass: 'bass', alto: 'alto' } as const;

// Small, engraving-sized notation. Measures per line are fixed by viewport: 4 across on
// desktop/iPad, 2 on phones (below Tailwind's md breakpoint).
const SCALE = 1.0;
const PER_ROW_DESKTOP = 4;
const PER_ROW_PHONE = 2;
const PHONE_MAX_WIDTH = 768;

export function NotationView({ score, width, onNoteClick }: {
  score: EditorScore; width?: number; onNoteClick?: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onNoteClickRef = useRef(onNoteClick);
  // Responsive: fill the container. Measured from the host; re-renders on container resize
  // (sidebar toggle, window resize) so the staff never strands at a fixed 720px.
  const [measuredW, setMeasuredW] = useState(width ?? 720);

  useEffect(() => { onNoteClickRef.current = onNoteClick; }, [onNoteClick]);

  useEffect(() => {
    if (width) return;                    // explicit width wins; skip measuring
    const host = ref.current; if (!host) return;
    const update = () => setMeasuredW(Math.max(320, Math.floor(host.clientWidth || 720)));
    update();
    if (typeof ResizeObserver === 'undefined') return;   // jsdom / SSR safety
    const ro = new ResizeObserver(update);
    ro.observe(host);
    return () => ro.disconnect();
  }, [width]);

  useEffect(() => {
    const host = ref.current; if (!host) return;
    host.innerHTML = '';
    const cssWidth = width ?? measuredW;
    const measures = layoutMeasures(score);
    const renderer = new Renderer(host, Renderer.Backends.SVG);

    // The SVG is cssWidth CSS px wide; ctx.scale(SCALE) then draws everything SCALE× larger,
    // so we lay out in a logical space of cssWidth / SCALE.
    const logicalWidth = cssWidth / SCALE;
    // Wrap measures onto multiple lines (systems) so a long exercise flows top-to-bottom like
    // real sheet music. Measures per line: 4 on desktop/iPad, 2 on phones — capped to the
    // actual count so a short score fills the width instead of leaving empty slots.
    const isPhone = typeof window !== 'undefined' && window.innerWidth < PHONE_MAX_WIDTH;
    const perRow = Math.max(1, Math.min(isPhone ? PER_ROW_PHONE : PER_ROW_DESKTOP, measures.length));
    const measureWidth = (logicalWidth - 16) / perRow;
    const rows = Math.ceil(measures.length / perRow);
    const TOP = 20, SYSTEM_H = 100, BOTTOM = 16;
    const logicalHeight = TOP + rows * SYSTEM_H + BOTTOM;
    renderer.resize(cssWidth, Math.ceil(logicalHeight * SCALE));
    const ctx = renderer.getContext();
    ctx.scale(SCALE, SCALE);

    let globalIndex = 0;
    measures.forEach((m, mi) => {
      const row = Math.floor(mi / perRow);
      const col = mi % perRow;
      const stave = new Stave(8 + col * measureWidth, TOP + row * SYSTEM_H, measureWidth);
      if (col === 0) stave.addClef(VEX_CLEF[score.clef]);                                        // clef opens every system
      if (mi === 0) stave.addTimeSignature(`${score.timeSig.beats}/${score.timeSig.beatType}`); // time signature only once
      stave.setContext(ctx).draw();

      const notes = m.elements.map((el) => {
        if (el.kind === 'rest') {
          const r = new StaveNote({ keys: ['b/4'], duration: toVexDuration(el.base, el.dots) + 'r', clef: VEX_CLEF[score.clef] });
          if (el.dots > 0) Dot.buildAndAttach([r], { all: true });   // augmentation dot glyph(s)
          return r;
        }
        const sn = new StaveNote({ keys: [toVexKey(el.pitch)], duration: toVexDuration(el.base, el.dots), clef: VEX_CLEF[score.clef] });
        const acc = vexAccidentalCode(el.pitch.alter);
        if (acc) sn.addModifier(new Accidental(acc), 0);
        // A dotted duration string ('qd') sets the note's dot count but does NOT draw the dot;
        // the glyph must be attached explicitly.
        if (el.dots > 0) Dot.buildAndAttach([sn], { all: true });
        return sn;
      });
      if (notes.length) {
        Formatter.FormatAndDraw(ctx, stave, notes);
        // Wire click-to-select: attach the flat index to each drawn note's SVG group.
        notes.forEach((n, i) => {
          const idx = globalIndex + i;
          (n as any).getSVGElement?.()?.addEventListener('click', () => onNoteClickRef.current?.(idx));
        });
        // Draw tie curves between paired start/stop notes within this measure.
        try {
          m.elements.forEach((el, i) => {
            if (el.kind === 'note' && el.tie === 'start' && notes[i + 1]) {
              new StaveTie({ firstNote: notes[i], lastNote: notes[i + 1], firstIndexes: [0], lastIndexes: [0] })
                .setContext(ctx).draw();
            }
          });
        } catch { /* tie rendering is cosmetic; never let it break the score render */ }
      }
      globalIndex += m.elements.length;
    });
  }, [score, width, measuredW]);

  return <div ref={ref} className="w-full overflow-x-auto" />;
}
