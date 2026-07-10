import { useEffect, useRef, useState } from 'react';
import { Renderer, Stave, StaveNote, Accidental, Formatter, StaveTie, Dot, Barline, Voice, VoiceMode, Beam, Annotation } from 'vexflow';
import { EditorScore } from '@/lib/notation/model';
import { layoutMeasures } from '@/lib/notation/measures';
import { toVexKey, toVexDuration } from '@/lib/notation/toVexflow';

const VEX_CLEF = { treble: 'treble', bass: 'bass', alto: 'alto' } as const;

// keyFifths (−7..7) → VexFlow major-key spec, used both for the drawn key signature and for
// the accidental engine (so an out-of-key note gets its natural/accidental automatically).
const FIFTHS_KEY: Record<number, string> = {
  0: 'C', 1: 'G', 2: 'D', 3: 'A', 4: 'E', 5: 'B', 6: 'F#', 7: 'C#',
  [-1]: 'F', [-2]: 'Bb', [-3]: 'Eb', [-4]: 'Ab', [-5]: 'Db', [-6]: 'Gb', [-7]: 'Cb',
};

// Small, engraving-sized notation. Measures per line are fixed by viewport: 4 across on
// desktop/iPad, 2 on phones (below Tailwind's md breakpoint).
const SCALE = 1.0;
const PER_ROW_DESKTOP = 4;
const PER_ROW_PHONE = 2;
const PHONE_MAX_WIDTH = 768;

const SELECTED_COLOR = '#ea580c'; // orange-600

export function NotationView({
  score, width, onNoteClick, selectedIndex,
  editingLyric, lyricValue, onLyricChange, onLyricAdvance, onLyricExit,
}: {
  score: EditorScore; width?: number; onNoteClick?: (index: number) => void; selectedIndex?: number | null;
  // Inline lyric editing: when on, a text cursor sits under the selected note (no dialog).
  editingLyric?: boolean; lyricValue?: string;
  onLyricChange?: (v: string) => void; onLyricAdvance?: () => void; onLyricExit?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onNoteClickRef = useRef(onNoteClick);
  // Responsive: fill the container. Measured from the host; re-renders on container resize
  // (sidebar toggle, window resize) so the staff never strands at a fixed 720px.
  const [measuredW, setMeasuredW] = useState(width ?? 720);
  // Pixel position (under the staff) of the selected note, for the inline lyric cursor.
  const [lyricPos, setLyricPos] = useState<{ x: number; y: number } | null>(null);

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
    const TOP = 20, SYSTEM_H = 120, BOTTOM = 16;
    const logicalHeight = TOP + rows * SYSTEM_H + BOTTOM;
    renderer.resize(cssWidth, Math.ceil(logicalHeight * SCALE));
    const ctx = renderer.getContext();
    ctx.scale(SCALE, SCALE);

    const keySpec = FIFTHS_KEY[score.keyFifths] ?? 'C';

    let globalIndex = 0;
    let selPos: { x: number; y: number } | null = null;   // captured position of the selected note
    measures.forEach((m, mi) => {
      const row = Math.floor(mi / perRow);
      const col = mi % perRow;
      const stave = new Stave(8 + col * measureWidth, TOP + row * SYSTEM_H, measureWidth);
      if (col === 0) {
        stave.addClef(VEX_CLEF[score.clef]);                                                     // clef opens every system
        if (score.keyFifths !== 0) stave.addKeySignature(keySpec);                               // key signature too
      }
      if (mi === 0) stave.addTimeSignature(`${score.timeSig.beats}/${score.timeSig.beatType}`); // time signature only once
      // Final barline (thin-thick) closes the last measure once the exercise has content.
      if (mi === measures.length - 1 && score.elements.length > 0) stave.setEndBarType(Barline.type.END);
      stave.setContext(ctx).draw();

      const notes = m.elements.map((el, i) => {
        const flatIndex = globalIndex + i;
        let sn: StaveNote;
        if (el.kind === 'rest') {
          sn = new StaveNote({ keys: ['b/4'], duration: toVexDuration(el.base, el.dots) + 'r', clef: VEX_CLEF[score.clef] });
          if (el.dots > 0) Dot.buildAndAttach([sn], { all: true });   // augmentation dot glyph(s)
        } else {
          // Pitch spelling (incl. sharp/flat) is encoded in the key string; the key-aware
          // accidental engine (applyAccidentals below) decides which glyphs actually draw.
          sn = new StaveNote({ keys: [toVexKey(el.pitch)], duration: toVexDuration(el.base, el.dots), clef: VEX_CLEF[score.clef] });
          // A dotted duration string ('qd') sets the note's dot count but does NOT draw the dot.
          if (el.dots > 0) Dot.buildAndAttach([sn], { all: true });
          // Sung syllable, rendered under the staff. Added as a modifier before formatting
          // so the Formatter accounts for its width.
          if (el.lyric) {
            const ann = new Annotation(el.lyric);
            ann.setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
            sn.addModifier(ann, 0);
          }
        }
        // Highlight the selected element in orange.
        if (selectedIndex != null && flatIndex === selectedIndex) {
          sn.setStyle({ fillStyle: SELECTED_COLOR, strokeStyle: SELECTED_COLOR });
        }
        return sn;
      });
      if (notes.length) {
        const voice = new Voice({ numBeats: score.timeSig.beats, beatValue: score.timeSig.beatType }).setMode(VoiceMode.SOFT);
        voice.addTickables(notes);
        // Given the key, draw sharps/flats that differ from the signature and naturals that
        // cancel it — and omit accidentals already implied by the signature.
        Accidental.applyAccidentals([voice], keySpec);
        // Auto-beam eighths (and shorter) into groups per the time signature so they
        // render with beams instead of individual flags.
        const beamGroups = Beam.getDefaultBeamGroups(`${score.timeSig.beats}/${score.timeSig.beatType}`);
        const beams = Beam.generateBeams(voice.getTickables(), { groups: beamGroups });
        // Justify the notes across the measure's note area (after clef/key/time) so they
        // fill the bar evenly instead of bunching at the left (formatToStave doesn't stretch).
        const justifyW = Math.max(60, stave.getNoteEndX() - stave.getNoteStartX() - 12);
        new Formatter().joinVoices([voice]).format([voice], justifyW);
        voice.draw(ctx, stave);
        beams.forEach((b) => b.setContext(ctx).draw());
        // Wire click-to-select: attach the flat index to each drawn note's SVG group.
        notes.forEach((n, i) => {
          const idx = globalIndex + i;
          (n as any).getSVGElement?.()?.addEventListener('click', () => onNoteClickRef.current?.(idx));
          // Record the selected note's on-screen position for the inline lyric cursor.
          if (idx === selectedIndex && m.elements[i].kind === 'note') {
            const yb = typeof (stave as any).getYForBottomText === 'function'
              ? (stave as any).getYForBottomText(1) : stave.getBottomY();
            selPos = { x: (n as any).getAbsoluteX() * SCALE, y: yb * SCALE };
          }
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
    setLyricPos(selPos);
  }, [score, width, measuredW, selectedIndex]);

  return (
    <div className="relative w-full overflow-x-auto">
      <div ref={ref} className="w-full" />
      {editingLyric && lyricPos && (
        <input
          key={selectedIndex}
          autoFocus
          aria-label="Lyric"
          value={lyricValue ?? ''}
          onChange={(e) => onLyricChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === '-') {
              // Hyphen = same-word continuation: mark this syllable hyphenated, then advance.
              e.preventDefault();
              onLyricChange?.((lyricValue ?? '') + '-');
              onLyricAdvance?.();
            } else if (e.key === ' ' || e.key === 'Tab' || e.key === 'Enter') {
              e.preventDefault();       // Space/Tab/Enter = next note (new word, no hyphen)
              onLyricAdvance?.();
            } else if (e.key === 'Escape') {
              onLyricExit?.();
            }
          }}
          style={{ position: 'absolute', left: lyricPos.x - 14, top: lyricPos.y, width: 44 }}
          className="rounded border border-orange-400 bg-white/95 px-1 py-0 text-center text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
        />
      )}
    </div>
  );
}
