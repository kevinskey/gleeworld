import { useEffect, useRef, useState } from 'react';
// vexflow 5 ships its own types, but opensheetmusicdisplay drags in the stale
// @types/vexflow (1.x) whose ambient `declare module "vexflow"` shadows them,
// so every named import from 'vexflow' is a TS2305. Runtime is unaffected —
// Vite resolves the real v5 package — so import the module namespace and
// re-type it with the identical v5 typings exposed under 'vexflow/core'
// (a type-only import, fully erased at compile time; the runtime import
// below still uses the full 'vexflow' entry, fonts included).
import * as VexFlowExt from 'vexflow';
import type * as VexFlow5 from 'vexflow/core';
const { Renderer, Stave, StaveNote, Accidental, Formatter, StaveTie, Dot, Barline, Voice, VoiceMode, Beam, Annotation, Articulation, Tuplet, Curve } =
  VexFlowExt as unknown as typeof VexFlow5;
// The destructured consts above are value bindings only — re-expose the
// instance types for the annotations below.
type StaveNote = VexFlow5.StaveNote;
type Voice = VexFlow5.Voice;
type Beam = VexFlow5.Beam;
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

// Readable, print-ish notation. Higher SCALE = thicker staff lines, larger
// noteheads, and more presence overall — the earlier 1.0 rendered a
// wispy engraving-sized staff that was hard to read at desktop
// distances. 1.35 sits close to a real score's line weight without
// looking cartoonishly large. Everything scales proportionally: layout
// happens in a logicalWidth = cssWidth / SCALE space, then ctx.scale
// (SCALE) draws it back up to fill the container.
const SCALE = 1.35;
// Guardrails on the row-packing loop below. Desktop caps at 4 bars per
// system so a page of dense notes doesn't turn into an eye-chart; phones
// cap at 2 for the same reason at a smaller width. Dense bars can still
// force a lower per-row count via the width check, but never higher than
// these caps.
const MAX_PER_ROW_DESKTOP = 4;
const MAX_PER_ROW_PHONE = 2;
const PHONE_MAX_WIDTH = 768;

const SELECTED_COLOR = '#ea580c'; // orange-600

export function NotationView({
  score, width, onNoteClick, selectedIndex,
  editingLyric, lyricValue, onLyricChange, onLyricAdvance, onLyricExit,
  onToggleSystemBreak,
}: {
  score: EditorScore; width?: number; onNoteClick?: (index: number) => void; selectedIndex?: number | null;
  // Inline lyric editing: when on, a text cursor sits under the selected note (no dialog).
  editingLyric?: boolean; lyricValue?: string;
  onLyricChange?: (v: string) => void; onLyricAdvance?: () => void; onLyricExit?: () => void;
  /** Click-a-barline handler: fires with the measure index AFTER which the
   *  user wants to force a system break (or unforce, if already set). Only
   *  the editor wires this — read-only surfaces (result cards, previews)
   *  leave it undefined and the overlays don't render. */
  onToggleSystemBreak?: (measureIndex: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onNoteClickRef = useRef(onNoteClick);
  const onToggleSystemBreakRef = useRef(onToggleSystemBreak);
  useEffect(() => { onToggleSystemBreakRef.current = onToggleSystemBreak; }, [onToggleSystemBreak]);
  // Responsive: fill the container. Measured from the host; re-renders on container resize
  // (sidebar toggle, window resize) so the staff never strands at a fixed 720px.
  const [measuredW, setMeasuredW] = useState(width ?? 720);
  // Pixel position (under the staff) of the selected note, for the inline lyric cursor.
  const [lyricPos, setLyricPos] = useState<{ x: number; y: number } | null>(null);
  // Positions of every bar line in CSS pixel space, so the wrapping div can
  // render invisible click targets on top of them. Each entry maps a
  // measure's ENDING bar line to that measure's index. Recomputed on every
  // render.
  const [barTargets, setBarTargets] = useState<Array<{ x: number; y: number; h: number; measureIndex: number }>>([]);

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
    // Content-aware line wrapping. Instead of a fixed 4-measures-per-row,
    // walk the measures accumulating each one's minimum content width;
    // start a new system when the next measure wouldn't fit. This means
    // dense 16th-note bars automatically get fewer per row (each is
    // wider), while sparse whole-note bars pack more per row. Result:
    // every system's measures fill the width with roughly-consistent
    // note spacing — no more cramped busy bars next to over-stretched
    // sparse ones.
    const isPhone = typeof window !== 'undefined' && window.innerWidth < PHONE_MAX_WIDTH;
    const maxPerRow = isPhone ? MAX_PER_ROW_PHONE : MAX_PER_ROW_DESKTOP;
    // SYSTEM_H is the vertical stride between systems (staff to staff). Lower
    // = tighter score, more visible at once — the previous 130 was leaving
    // white space between systems bigger than the staves themselves.
    const TOP = 20, SYSTEM_H = 96, BOTTOM = 16;
    const MOD_RESERVE = 70; // clef (+ key sig) + time sig on a system's first bar
    const availableW = Math.max(1, logicalWidth - 16 - MOD_RESERVE);

    const keySpec = FIFTHS_KEY[score.keyFifths] ?? 'C';

    const beamSpec = `${score.timeSig.beats}/${score.timeSig.beatType}`;

    // Pass 1 — build each measure's tickables + its minimum content width, so a system can
    // size bars PROPORTIONALLY to their content (a busy bar gets more width than a sparse one)
    // instead of forcing every bar to the same width (which cramps busy bars).
    const built = measures.map((m) => {
      const notes = m.elements.map((el) => {
        let sn: StaveNote;
        if (el.kind === 'rest') {
          sn = new StaveNote({ keys: ['b/4'], duration: toVexDuration(el.base, el.dots) + 'r', clef: VEX_CLEF[score.clef] });
          if (el.dots > 0) Dot.buildAndAttach([sn], { all: true });
        } else {
          sn = new StaveNote({ keys: [toVexKey(el.pitch)], duration: toVexDuration(el.base, el.dots), clef: VEX_CLEF[score.clef] });
          if (el.dots > 0) Dot.buildAndAttach([sn], { all: true });
          if (el.lyric) {   // sung syllable, rendered under the staff
            const ann = new Annotation(el.lyric);
            ann.setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
            sn.addModifier(ann, 0);
          }
          // Staccato dot — VexFlow 'a.' glyph. Position ABOVE by default so
          // it clears the stem side; VexFlow flips it below when the note
          // is already up-stem, so we don't need to compute stem direction.
          if (el.articulation === 'staccato') {
            sn.addModifier(new Articulation('a.').setPosition(3 /* ABOVE */), 0);
          }
        }
        return sn;
      });
      let voice: Voice | null = null;
      let beams: Beam[] = [];
      let minW = 40;
      // Build tuplet groupings for this measure — every note tagged with
      // triplet === 'start' opens a run; the matching 'stop' closes it.
      // Passed to VexFlow's Tuplet class so the "3" bracket renders once
      // per group and the note spacing gets the 2:3 correction.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tuplets: any[] = [];
      {
        let runStart = -1;
        m.elements.forEach((el, k) => {
          if (el.kind !== 'note') return;
          if (el.triplet === 'start') runStart = k;
          if (el.triplet === 'stop' && runStart >= 0) {
            const group = notes.slice(runStart, k + 1);
            try {
              tuplets.push(new Tuplet(group, { numNotes: group.length, notesOccupied: group.length - 1 }));
            } catch { /* malformed group — skip rather than crash the score */ }
            runStart = -1;
          }
        });
      }
      if (notes.length) {
        voice = new Voice({ numBeats: score.timeSig.beats, beatValue: score.timeSig.beatType }).setMode(VoiceMode.SOFT);
        voice.addTickables(notes);
        Accidental.applyAccidentals([voice], keySpec);   // key-aware sharps/naturals
        beams = Beam.generateBeams(notes, { groups: Beam.getDefaultBeamGroups(beamSpec) });
        try { minW = new Formatter().joinVoices([voice]).preCalculateMinTotalWidth([voice]); }
        catch { minW = 44 * notes.length; }
      }
      return { m, notes, voice, beams, tuplets, minW };
    });

    // Row-packing pass. Greedily fill each system with as many measures
    // as their combined minW allows, using maxPerRow as a readability cap.
    // Rows always contain at least one measure — a bar wider than
    // availableW just overflows its own row rather than being dropped.
    // User-authored breaks (score.systemBreaks) take precedence over the
    // width heuristic: an entry `k` forces a new row starting at measure
    // k+1 regardless of remaining width.
    const forcedBreaks = new Set(score.systemBreaks ?? []);
    const rowsPacked: { start: number; end: number }[] = [];
    {
      let start = 0;
      let acc = 0;
      for (let i = 0; i < built.length; i++) {
        const w = (built[i].minW || 40) + 20;
        const inRow = i - start;
        const wouldOverflow = inRow > 0 && acc + w > availableW;
        const atCap = inRow >= maxPerRow;
        const userBreak = inRow > 0 && forcedBreaks.has(i - 1);
        if (wouldOverflow || atCap || userBreak) {
          rowsPacked.push({ start, end: i });
          start = i;
          acc = 0;
        }
        acc += w;
      }
      if (built.length > 0) rowsPacked.push({ start, end: built.length });
    }
    const rows = Math.max(1, rowsPacked.length);
    const logicalHeight = TOP + rows * SYSTEM_H + BOTTOM;
    renderer.resize(cssWidth, Math.ceil(logicalHeight * SCALE));
    const ctx = renderer.getContext();
    ctx.scale(SCALE, SCALE);

    // Pass 2 — lay out each system with proportional bar widths, then draw.
    let globalIndex = 0;
    let selPos: { x: number; y: number } | null = null;
    // Accumulate a clickable target per bar line (measure end). We render
    // invisible divs at these positions in the returned JSX so the user
    // can click a bar line to force/unforce a system break.
    const barTargetsBuf: Array<{ x: number; y: number; h: number; measureIndex: number }> = [];
    for (let r = 0; r < rowsPacked.length; r++) {
      const rowItems = built.slice(rowsPacked[r].start, rowsPacked[r].end);
      const weights = rowItems.map((b) => b.minW + 20);
      const totalW = weights.reduce((a, w) => a + w, 0) || 1;
      let x = 8;
      rowItems.forEach((b, i) => {
        const mi = rowsPacked[r].start + i;
        const w = (weights[i] / totalW) * availableW + (i === 0 ? MOD_RESERVE : 0);
        const stave = new Stave(x, TOP + r * SYSTEM_H, w);
        if (i === 0) {
          stave.addClef(VEX_CLEF[score.clef]);                                                     // clef opens every system
          if (score.keyFifths !== 0) stave.addKeySignature(keySpec);                               // key signature too
        }
        if (mi === 0) stave.addTimeSignature(`${score.timeSig.beats}/${score.timeSig.beatType}`); // time sig only once
        if (mi === measures.length - 1 && score.elements.length > 0) stave.setEndBarType(Barline.type.END);
        stave.setContext(ctx).draw();

        if (b.voice && b.notes.length) {
          b.notes.forEach((sn, k) => {   // highlight the selected element in orange (before draw)
            if (selectedIndex != null && globalIndex + k === selectedIndex) sn.setStyle({ fillStyle: SELECTED_COLOR, strokeStyle: SELECTED_COLOR });
          });
          const justifyW = Math.max(40, stave.getNoteEndX() - stave.getNoteStartX() - 10);
          new Formatter().joinVoices([b.voice]).format([b.voice], justifyW);
          b.voice.draw(ctx, stave);
          b.beams.forEach((bm) => bm.setContext(ctx).draw());
          b.notes.forEach((sn, k) => {
            const idx = globalIndex + k;
            (sn as any).getSVGElement?.()?.addEventListener('click', () => onNoteClickRef.current?.(idx));
            if (idx === selectedIndex && b.m.elements[k].kind === 'note') {   // inline lyric cursor position
              const yb = typeof (stave as any).getYForBottomText === 'function' ? (stave as any).getYForBottomText(1) : stave.getBottomY();
              selPos = { x: (sn as any).getAbsoluteX() * SCALE, y: yb * SCALE };
              // Auto-scroll the current measure into view. Uses the note's
              // own SVG element and `block: 'nearest'` so we only scroll
              // when the note is actually off-screen — never fights the
              // user's own scroll otherwise. Deferred to a microtask so
              // the DOM has settled after this render tick.
              const svgEl = (sn as any).getSVGElement?.();
              if (svgEl && typeof svgEl.scrollIntoView === 'function') {
                queueMicrotask(() => {
                  try { svgEl.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }
                  catch { /* older browsers without options object — no-op */ }
                });
              }
            }
          });
          try {   // tie curves between paired start/stop notes within this measure
            b.m.elements.forEach((el, k) => {
              if (el.kind === 'note' && el.tie === 'start' && b.notes[k + 1]) {
                new StaveTie({ firstNote: b.notes[k], lastNote: b.notes[k + 1], firstIndexes: [0], lastIndexes: [0] }).setContext(ctx).draw();
              }
            });
          } catch { /* tie rendering is cosmetic; never let it break the score render */ }
          try {   // slurs (legato) — curved line from slur='start' to matching 'stop'
            let slurStart = -1;
            b.m.elements.forEach((el, k) => {
              if (el.kind !== 'note') return;
              if (el.slur === 'start') slurStart = k;
              if (el.slur === 'stop' && slurStart >= 0 && b.notes[slurStart] && b.notes[k]) {
                new Curve(b.notes[slurStart], b.notes[k], {}).setContext(ctx).draw();
                slurStart = -1;
              }
            });
          } catch { /* slur rendering is cosmetic; never let it break the score render */ }
          try {   // triplet brackets — draw after beams so numbers sit above
            b.tuplets.forEach((t) => t.setContext(ctx).draw());
          } catch { /* tuplet rendering is cosmetic; never let it break the score render */ }
        }
        x += w;
        // Record the ending bar line as a click target — but only for
        // interior bar lines. Skip the very last measure of the score
        // (there's nothing to break onto a new line after) and skip the
        // end of a system that's already the last row (same reason).
        if (mi < measures.length - 1) {
          barTargetsBuf.push({
            x: x * SCALE,
            y: (TOP + r * SYSTEM_H - 4) * SCALE,
            h: 50 * SCALE,
            measureIndex: mi,
          });
        }
        globalIndex += b.m.elements.length;
      });
    }
    setLyricPos(selPos);
    setBarTargets(barTargetsBuf);
  }, [score, width, measuredW, selectedIndex]);

  const forcedBreakSet = new Set(score.systemBreaks ?? []);
  return (
    <div className="relative w-full overflow-x-auto">
      <div ref={ref} className="w-full" />
      {/* Clickable bar-line overlays. Only rendered when the editor
          passed onToggleSystemBreak (read-only surfaces get nothing).
          Invisible by default; a subtle blue tint appears on hover so
          the user can find the click target. Bar lines with a forced
          break already applied get a persistent purple pill so the
          user can see which breaks are theirs vs. auto. */}
      {onToggleSystemBreak && barTargets.map(({ x, y, h, measureIndex }) => {
        const forced = forcedBreakSet.has(measureIndex);
        return (
          <button
            key={measureIndex}
            type="button"
            onClick={() => onToggleSystemBreakRef.current?.(measureIndex)}
            style={{ position: 'absolute', left: x - 10, top: y, width: 20, height: h }}
            className={`group flex items-center justify-center rounded ${
              forced
                ? 'bg-primary/25 hover:bg-primary/40'
                : 'bg-transparent hover:bg-sky-500/20'
            }`}
            aria-label={forced ? `Remove line break after measure ${measureIndex + 1}` : `Break line after measure ${measureIndex + 1}`}
            title={forced ? 'Click to remove this line break' : 'Break line here'}
          >
            <span
              className={`pointer-events-none text-[10px] font-semibold ${
                forced ? 'text-primary' : 'text-sky-700 opacity-0 group-hover:opacity-100'
              }`}
            >↩</span>
          </button>
        );
      })}
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
