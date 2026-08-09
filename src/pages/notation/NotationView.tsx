import { useEffect, useRef, useState } from 'react';
import { Renderer, Stave, StaveNote, Accidental, Formatter, StaveTie, Dot, Barline, Voice, VoiceMode, Beam, Annotation } from 'vexflow';
// VexFlow's TS shim doesn't declare Articulation / Tuplet / Curve as named
// exports (they exist at runtime — the shim is just incomplete), so pull
// them via a cast on the module namespace rather than a `named import` that
// would TS2305 in the typecheck baseline forever. Kept in a separate import
// from the rest so the older baselined imports don't churn.
import * as VexFlowExt from 'vexflow';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { Articulation, Tuplet, Curve } = VexFlowExt as any;
import { EditorScore } from '@/lib/notation/model';
import { layoutMeasures } from '@/lib/notation/measures';
import { toVexKey, toVexDuration } from '@/lib/notation/toVexflow';
import { packRows } from './packRows';

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

/** Width of a syllable at the engraved size. Falls back to a per-character
 *  estimate where no canvas is available (jsdom, older WebViews). */
function measureLyric(ctx: CanvasRenderingContext2D | null, text: string): number {
  const w = ctx?.measureText(text).width;
  return typeof w === 'number' && w > 0 ? w : text.length * (LYRIC_SIZE * 0.5);
}

/** How far down (SVG y — larger is lower on the page) a note's own drawn
 *  shape reaches: notehead(s) plus stem tip when it has one. Deliberately
 *  NOT StaveNote.getBoundingBox(), which also merges in every attached
 *  modifier — including the invisible lyric Annotation each note below
 *  carries purely to reserve horizontal width. That annotation positions
 *  itself relative to its OWN note (the exact per-note "wandering" the
 *  shared baseline exists to avoid), so folding it back in here would
 *  reintroduce that same noise into the one number a whole system shares.
 *  Sticks to the public geometry VexFlow 5 actually exposes
 *  (getNoteHeadBounds, getStemExtents) and is defensive about either
 *  returning something other than a finite number — one odd note should
 *  never poison the whole row's baseline. */
function noteBottomY(sn: StaveNote): number {
  let bottom = -Infinity;
  const { yBottom } = sn.getNoteHeadBounds();
  if (Number.isFinite(yBottom)) bottom = yBottom;
  if (!sn.isRest() && sn.hasStem()) {
    const extents = sn.getStemExtents();
    if (extents) {
      if (Number.isFinite(extents.topY)) bottom = Math.max(bottom, extents.topY);
      if (Number.isFinite(extents.baseY)) bottom = Math.max(bottom, extents.baseY);
    }
  }
  return bottom;
}
// Which text line below the stave the lyrics sit on, and their size. One
// value for the whole system is the entire point — see the draw loop.
const LYRIC_LINE = 1;
const LYRIC_SIZE = 10;
/** Minimum clear space between one syllable and the next. Below about this
 *  the words read as a single run even when they technically do not touch. */
const LYRIC_GUTTER = 6;
/** Minimum gap between the lowest ink in a system — a notehead or a stem
 *  tip, whichever descends further — and the lyric baseline drawn below
 *  it. getYForBottomText(LYRIC_LINE) alone assumes notes sit on or above
 *  the staff; a reciting tone can put every note in a system BELOW the
 *  staff, inside the space that fixed line reserves, so the baseline has
 *  to be pushed clear of whatever is actually there. 12px is roughly the
 *  serif face's own ascent at LYRIC_SIZE (~7-8px for a 10px face) plus a
 *  few px of real visible daylight — any smaller and the tops of tall
 *  letters ("T", "L", ...) would still graze the notehead. */
const LYRIC_CLEARANCE = 12;
/** Below-baseline allowance for descenders (g, j, p, q, y) when deciding
 *  whether the engraved system fits inside the SVG's own height — the
 *  baseline is text's anchor point, not a line's true visual bottom. */
const LYRIC_DESCENT_PAD = 4;

export function NotationView({
  score, width, onNoteClick, selectedIndex,
  editingLyric, lyricValue, onLyricChange, onLyricAdvance, onLyricExit,
  onToggleSystemBreak, targetPerRow, scale = SCALE, onLayout,
}: {
  score: EditorScore; width?: number; onNoteClick?: (index: number) => void; selectedIndex?: number | null;
  /** Prefer full rows of this many measures (phones still cap at 2): the fit
   *  check drops its per-measure breathing room so rows fill to the target,
   *  falling back to fewer only when the measures' true minimum widths cannot
   *  fit. Sight-reading exercises pass 4; the editor leaves it unset and keeps
   *  the looser content-aware wrap. */
  targetPerRow?: number;
  /** Engraving size. Lower fits more bars in a narrow staff at the cost of
   *  note size — a 4-inch psalm card cannot hold two bars of lyrics at the
   *  default reading size. Defaults to SCALE. */
  scale?: number;
  /** Reports what the packer ACTUALLY did. targetPerRow is a request: the
   *  fit check drops below it whenever the measures' minimum widths don't
   *  fit, so a caller that prints "N measures per line" needs the real
   *  number rather than the one it asked for. */
  onLayout?: (info: { rows: number; perRow: number }) => void;
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
  const onLayoutRef = useRef(onLayout);
  useEffect(() => { onLayoutRef.current = onLayout; }, [onLayout]);

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

    // The SVG is cssWidth CSS px wide; ctx.scale(scale) then draws everything
    // scale× larger, so we lay out in a logical space of cssWidth / scale.
    const logicalWidth = cssWidth / scale;
    // Content-aware line wrapping. Instead of a fixed 4-measures-per-row,
    // walk the measures accumulating each one's minimum content width;
    // start a new system when the next measure wouldn't fit. This means
    // dense 16th-note bars automatically get fewer per row (each is
    // wider), while sparse whole-note bars pack more per row. Result:
    // every system's measures fill the width with roughly-consistent
    // note spacing — no more cramped busy bars next to over-stretched
    // sparse ones.
    const isPhone = typeof window !== 'undefined' && window.innerWidth < PHONE_MAX_WIDTH;
    const maxPerRow = isPhone
      ? (targetPerRow != null ? Math.min(MAX_PER_ROW_PHONE, targetPerRow) : MAX_PER_ROW_PHONE)
      : (targetPerRow ?? MAX_PER_ROW_DESKTOP);
    // SYSTEM_H is the vertical stride between systems (staff to staff). Lower
    // = tighter score, more visible at once — the previous 130 was leaving
    // white space between systems bigger than the staves themselves.
    const TOP = 20, SYSTEM_H = 96, BOTTOM = 16;
    const MOD_RESERVE = 70; // clef (+ key sig) + time sig on a system's first bar
    const availableW = Math.max(1, logicalWidth - 16 - MOD_RESERVE);

    const keySpec = FIFTHS_KEY[score.keyFifths] ?? 'C';

    const beamSpec = `${score.timeSig.beats}/${score.timeSig.beatType}`;

    // A canvas 2D context used only to MEASURE lyric widths during pass 1.
    // The renderer's own context is not usable yet — it is created and scaled
    // after the row packing, which is precisely what these widths decide.
    const ctxProbe = document.createElement('canvas').getContext('2d');
    if (ctxProbe) ctxProbe.font = `${LYRIC_SIZE}px "Times New Roman", Times, serif`;

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
          // Lyrics get an INVISIBLE Annotation, and are drawn by hand below.
          //
          // Both halves are needed and neither works alone. The formatter
          // only reserves horizontal space for things attached to a note, so
          // without an annotation adjacent syllables collide — "The" and
          // "Lord" printed as "TheLord". But an annotation positions itself
          // relative to its OWN note's extents, so a low note drags its word
          // down and the text wanders instead of sitting on a line.
          //
          // So: attach one to buy the width, render it transparent, and paint
          // the visible word ourselves at a y taken from the STAVE, which is
          // constant across the system. Widening the measure alone was not
          // enough — that spaces bars, while collisions happen between notes
          // inside a bar.
          if (el.lyric) {
            const ann = new Annotation(el.lyric);
            ann.setVerticalJustification(Annotation.VerticalJustify.BOTTOM);
            ann.setFont('Times New Roman, Times, serif', LYRIC_SIZE);
            // Its DRAW is suppressed, not its style. setStyle does not reach
            // the emitted <text> — checked, the element came out with no fill
            // attribute and would have printed in black at the note-relative
            // y, doubling every word at two different heights. Formatting
            // reads a modifier's metrics, and drawing is a separate step, so
            // removing the draw keeps the reserved width and emits nothing.
            (ann as unknown as { draw: () => void }).draw = () => {};
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
              tuplets.push(new Tuplet(group, { num_notes: group.length, notes_occupied: group.length - 1 }));
            } catch { /* malformed group — skip rather than crash the score */ }
            runStart = -1;
          }
        });
      }
      if (notes.length) {
        voice = new Voice({ numBeats: score.timeSig.beats, beatValue: score.timeSig.beatType }).setMode(VoiceMode.SOFT);
        voice.addTickables(notes);
        Accidental.applyAccidentals([voice], keySpec);   // key-aware sharps/naturals
        beams = Beam.generateBeams(voice.getTickables(), { groups: Beam.getDefaultBeamGroups(beamSpec) });
        try { minW = new Formatter().joinVoices([voice]).preCalculateMinTotalWidth([voice]); }
        catch { minW = 44 * notes.length; }

        // A floor for the whole measure, on top of the per-note space the
        // annotations above already reserve. The two do different jobs: the
        // annotations stop syllables colliding INSIDE a bar, this stops a bar
        // full of long words being squeezed by the row packer.
        //
        // Measured at the real lyric size rather than estimated per
        // character, because "O" and "shepherd" differ by a factor of six and
        // an average would over-space one and collide the other.
        const lyricW = m.elements.reduce((sum, el) => (
          el.kind === 'note' && el.lyric
            ? sum + measureLyric(ctxProbe, el.lyric) + LYRIC_GUTTER
            : sum
        ), 0);
        minW = Math.max(minW, lyricW);
      }
      return { m, notes, voice, beams, tuplets, minW };
    });

    // Row-packing pass — see packRows. With targetPerRow set, the per-measure
    // breathing room drops to 0 so rows fill to the target whenever the
    // measures' minimum widths genuinely fit.
    const rowsPacked = packRows({
      widths: built.map((b) => b.minW),
      availableW,
      maxPerRow,
      pad: targetPerRow != null ? 0 : 20,
      forcedBreaks: new Set(score.systemBreaks ?? []),
    });
    const rows = Math.max(1, rowsPacked.length);
    onLayoutRef.current?.({
      rows,
      perRow: rowsPacked.length
        ? Math.max(...rowsPacked.map((r) => r.end - r.start + 1))
        : 0,
    });
    const logicalHeight = TOP + rows * SYSTEM_H + BOTTOM;
    renderer.resize(cssWidth, Math.ceil(logicalHeight * scale));
    const ctx = renderer.getContext();
    ctx.scale(scale, scale);

    // Pass 2 — lay out each system with proportional bar widths, then draw.
    let globalIndex = 0;
    let selPos: { x: number; y: number } | null = null;
    // Accumulate a clickable target per bar line (measure end). We render
    // invisible divs at these positions in the returned JSX so the user
    // can click a bar line to force/unforce a system break.
    const barTargetsBuf: Array<{ x: number; y: number; h: number; measureIndex: number }> = [];
    // The lowest a lyric baseline actually reached this render, in logical
    // (pre-scale) SVG coordinates. Starts at what the fixed row stride
    // already assumed fits (TOP + rows*SYSTEM_H, i.e. logicalHeight minus
    // its BOTTOM margin) so a normal score with no low-lying notes never
    // shrinks the canvas — only a system whose baseline is pushed past
    // that grows it, below.
    let maxContentBottom = logicalHeight - BOTTOM;
    for (let r = 0; r < rowsPacked.length; r++) {
      const rowItems = built.slice(rowsPacked[r].start, rowsPacked[r].end);
      const weights = rowItems.map((b) => b.minW + 20);
      const totalW = weights.reduce((a, w) => a + w, 0) || 1;
      let x = 8;
      const rowY = TOP + r * SYSTEM_H;
      // One shared lyric baseline for the whole system — but WHERE that
      // baseline sits can only be decided once every measure in the row
      // has reported how far down its own notes reach (see noteBottomY
      // above), so painting the lyric text itself is deferred to a second
      // loop below, after rowLowestBottom is final. Everything else
      // (notes, beams, ties, slurs, click targets, bar lines) still draws
      // in the single pass here — only the words move.
      let rowLowestBottom = -Infinity;
      let rowStave: Stave | null = null;
      const lyricJobs: typeof built = [];
      let selPosXPending: number | null = null;
      rowItems.forEach((b, i) => {
        const mi = rowsPacked[r].start + i;
        const w = (weights[i] / totalW) * availableW + (i === 0 ? MOD_RESERVE : 0);
        const stave = new Stave(x, rowY, w);
        rowStave ??= stave;
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

          // This measure's notes are in their final drawn position now
          // (stem extensions from the beam draw above included) — fold
          // its lowest point into the row's running minimum.
          b.notes.forEach((sn) => { rowLowestBottom = Math.max(rowLowestBottom, noteBottomY(sn)); });
          lyricJobs.push(b);

          b.notes.forEach((sn, k) => {
            const idx = globalIndex + k;
            (sn as any).getSVGElement?.()?.addEventListener('click', () => onNoteClickRef.current?.(idx));
            if (idx === selectedIndex && b.m.elements[k].kind === 'note') {   // inline lyric cursor position
              selPosXPending = (sn as any).getAbsoluteX() * scale;
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
            x: x * scale,
            y: (rowY - 4) * scale,
            h: 50 * scale,
            measureIndex: mi,
          });
        }
        globalIndex += b.m.elements.length;
      });

      // Paint the row's lyrics now that every measure in it has reported
      // its lowest note. getYForBottomText(LYRIC_LINE) is the floor — a
      // system with nothing below the staff sits exactly where it always
      // did — but a reciting tone whose notes descend past it pushes the
      // baseline down to clear them instead of drawing straight through.
      if (lyricJobs.length && rowStave) {
        const lyricY = Math.max(rowStave.getYForBottomText(LYRIC_LINE), rowLowestBottom + LYRIC_CLEARANCE);
        maxContentBottom = Math.max(maxContentBottom, lyricY + LYRIC_DESCENT_PAD);
        ctx.save();
        ctx.setFont('Times New Roman, serif', LYRIC_SIZE);
        lyricJobs.forEach((b) => {
          b.notes.forEach((sn, k) => {
            const el = b.m.elements[k];
            if (el?.kind !== 'note' || !el.lyric) return;
            // Centre each syllable on its notehead, the way engraved lyrics
            // sit. measureText is approximate for a proportional face, which
            // is fine — being a pixel off centre is invisible; being on a
            // different line is not.
            const w = ctx.measureText(el.lyric).width;
            ctx.fillText(el.lyric, sn.getAbsoluteX() - w / 2, lyricY);
          });
        });
        ctx.restore();
        if (selPosXPending != null) selPos = { x: selPosXPending, y: lyricY * scale };
      }
    }
    // A low reciting tone can push a system's lyric baseline below what
    // the fixed row stride assumed when the canvas was first sized above
    // — grow the SVG to fit rather than clip the words. Renderer.resize()
    // / ctx.scale() recompute the viewBox by MULTIPLYING the context's
    // cumulative scale state, so calling either a second time here
    // (ctx.scale(scale, scale) already ran once, above) would square the
    // scale and corrupt every coordinate already drawn. Patching the
    // <svg> height/viewBox directly changes only how much of the same
    // logical space is shown — nothing already drawn moves.
    if (maxContentBottom + BOTTOM > logicalHeight) {
      const grownHeight = maxContentBottom + BOTTOM;
      const svgCtx = ctx as unknown as { svg?: SVGSVGElement; setViewBox?: (x: number, y: number, w: number, h: number) => void };
      if (svgCtx.svg && typeof svgCtx.setViewBox === 'function') {
        const physicalHeight = Math.ceil(grownHeight * scale);
        svgCtx.svg.setAttribute('height', String(physicalHeight));
        svgCtx.svg.style.height = String(physicalHeight);
        svgCtx.setViewBox(0, 0, logicalWidth, grownHeight);
      }
    }
    setLyricPos(selPos);
    setBarTargets(barTargetsBuf);
  }, [score, width, measuredW, selectedIndex, targetPerRow, scale]);

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
