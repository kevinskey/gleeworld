import { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Accidental, Formatter } from 'vexflow';
import { EditorScore } from '@/lib/notation/model';
import { layoutMeasures } from '@/lib/notation/measures';
import { toVexKey, toVexDuration } from '@/lib/notation/toVexflow';

const VEX_CLEF = { treble: 'treble', bass: 'bass', alto: 'alto' } as const;

export function NotationView({ score, width = 720, onNoteClick }: {
  score: EditorScore; width?: number; onNoteClick?: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = ref.current; if (!host) return;
    host.innerHTML = '';
    const measures = layoutMeasures(score);
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(width, 160);
    const ctx = renderer.getContext();

    const measureWidth = Math.max(180, (width - 20) / Math.max(measures.length, 1));
    let x = 10, globalIndex = 0;
    measures.forEach((m, mi) => {
      const stave = new Stave(x, 20, measureWidth);
      if (mi === 0) stave.addClef(VEX_CLEF[score.clef]).addTimeSignature(`${score.timeSig.beats}/${score.timeSig.beatType}`);
      stave.setContext(ctx).draw();

      const notes = m.elements.map((el) => {
        if (el.kind === 'rest') {
          return new StaveNote({ keys: ['b/4'], duration: toVexDuration(el.base, el.dots) + 'r', clef: VEX_CLEF[score.clef] });
        }
        const sn = new StaveNote({ keys: [toVexKey(el.pitch)], duration: toVexDuration(el.base, el.dots), clef: VEX_CLEF[score.clef] });
        if (el.pitch.alter === 1) sn.addModifier(new Accidental('#'), 0);
        if (el.pitch.alter === -1) sn.addModifier(new Accidental('b'), 0);
        return sn;
      });
      if (notes.length) {
        Formatter.FormatAndDraw(ctx, stave, notes);
        // Wire click-to-select: attach the flat index to each drawn note's SVG group.
        notes.forEach((n, i) => {
          const idx = globalIndex + i;
          (n as any).getSVGElement?.()?.addEventListener('click', () => onNoteClick?.(idx));
        });
      }
      globalIndex += m.elements.length;
      x += measureWidth;
    });
  }, [score, width, onNoteClick]);

  return <div ref={ref} className="overflow-x-auto" />;
}
