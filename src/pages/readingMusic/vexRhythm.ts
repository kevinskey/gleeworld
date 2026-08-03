import * as VexFlowNS from 'vexflow';
import type { RhythmEvent, RhythmPattern, NoteValue } from '@/lib/rhythm/pattern';

// VexFlow 5's own type declarations are shadowed in this repo by a stale
// transitive @types/vexflow@1.x (which declares VexFlow 1's `Vex` namespace and
// none of the modern classes), so `import { Stave } from 'vexflow'` is a
// permanent TS2305 even though it works at runtime. NotationView.tsx hits the
// same wall; take the classes off the module namespace instead of adding to the
// typecheck baseline.
/* eslint-disable @typescript-eslint/no-explicit-any */
const { Barline, BarlineType, Beam, Dot, ModifierContext, Renderer, Stave, StaveNote, Stem, TickContext } =
  VexFlowNS as any;
type VexAny = any;

// Real engraving for the Rhythm Machine. Both rhythm surfaces (RhythmStrip's
// read/result view and ClapBlastStage's scrolling game) draw through here, so
// they cannot drift apart again.
//
// TIMING CONTRACT — the whole reason this module hand-places notes instead of
// letting VexFlow's Formatter justify them: the Clap Blast stage scrolls the
// notation by `HIT_X - nowSec * (PX_PER_PULSE / secondsPerPulse)`, so a note's
// x IS its time. Every note head therefore lands at exactly
//   PAD_LEFT + startPulse * PX_PER_PULSE
// and nothing (dots, rests, accidentals, beam slant) is allowed to nudge it.
// We give each note its own TickContext and set that context's x directly;
// VexFlow still owns every glyph, stem, flag and beam it draws from there.

export const PX_PER_PULSE = 72;
/** Space before the first note: begin barline + time signature, with margin. */
export const PAD_LEFT = 64;
/** Space after the final barline. */
export const PAD_RIGHT = 32;

// A default Stave is 5 lines at 10px with 4 lines of headroom, so its middle
// line sits 60px below stave.y. We draw a one-line rhythm staff by hiding the
// other four rather than by setNumLines(1): VexFlow derives barline height,
// time-signature placement and rest positions from the FULL staff box, and a
// literal 1-line stave collapses barlines to 1px tall and drops the time
// signature below the line. Hiding lines keeps a real staff's geometry and
// shows exactly one line.
const MIDDLE_LINE_OFFSET = 60;
const HIDDEN_LINES = [
  { visible: false }, { visible: false }, { visible: true }, { visible: false }, { visible: false },
];
/** Key whose treble-clef position is the middle line — i.e. our single line. */
const RHYTHM_KEY = 'b/4';

export const DEFAULT_NOTE_COLOR = '#0f172a';
const STAFF_LINE_COLOR = '#94a3b8';
const BARLINE_COLOR = '#475569';
const SYLLABLE_COLOR = '#334155';

// NoteValue → VexFlow base duration. The dot is a real Dot modifier, never
// baked into the duration string, so VexFlow places it off the note head.
const VEX_DUR: Record<NoteValue, string> = {
  w: 'w', h: 'h', 'h.': 'h', q: 'q', 'q.': 'q', e: '8', 'e.': '8', s: '16',
};

export interface DrawnRhythm {
  /** Total drawn width — what a caller should size its SVG/scroll box to. */
  width: number;
  /** y of the single staff line, in the same coordinate space the caller asked for. */
  lineY: number;
  /** Per-event <g>, indexed by RhythmPattern.events index. */
  noteEls: SVGGElement[];
  /** x of each event's note-head centre (for hit-line alignment / overlays). */
  noteCenterX: number[];
  /** Beam groups, so a caller can recolour or hide a beam with its notes. */
  beams: Array<{ el: SVGGElement; indexes: number[] }>;
  /** Half a note head, so a caller can centre the hit line on the head. */
  headHalfWidth: number;
}

export interface DrawRhythmOptions {
  /** y the staff line should land on inside the caller's coordinate space. */
  lineY: number;
  /** Per-event colour; falls back to DEFAULT_NOTE_COLOR. */
  colors?: Array<string | null | undefined>;
  /** Syllable text under each note (''/undefined draws nothing). */
  syllables?: string[];
  /**
   * Draw the staff line. The Clap Blast stage turns this off: it owns a
   * full-width static rule, and a second one scrolling past would show its ends.
   * The stave itself still exists either way — every glyph's y comes from it.
   */
  staffLine?: boolean;
}

/** Width drawRhythm will produce — deterministic, so callers can size up-front. */
export function rhythmWidth(pattern: RhythmPattern): number {
  return PAD_LEFT + pattern.totalPulses * PX_PER_PULSE + PAD_RIGHT;
}

/** x of a pulse position, matching the timing contract above. */
export function pulseX(startPulse: number): number {
  return PAD_LEFT + startPulse * PX_PER_PULSE;
}

// 'e.' beams too: a dotted-eighth/sixteenth pair inside one pulse is a beamed
// unit in real engraving, and VexFlow draws the broken secondary beam for it.
const isBeamable = (e: RhythmEvent) => !e.rest && (e.value === 'e' || e.value === 'e.' || e.value === 's');
const pulseOf = (e: RhythmEvent) => Math.floor(e.startPulse + 1e-6);

/**
 * Runs of 2+ beamable notes inside one pulse. Beaming by PULSE (not by
 * notated beat) is what makes compound meter come out right: in 6/8 a pulse is
 * a dotted quarter, so three eighths beam as one group.
 */
export function beamGroups(pattern: RhythmPattern): number[][] {
  const groups: number[][] = [];
  let current: number[] = [];
  pattern.events.forEach((e, i) => {
    if (isBeamable(e) && current.length > 0 && pulseOf(pattern.events[current[0]]) === pulseOf(e)) {
      current.push(i);
    } else {
      if (current.length > 1) groups.push(current);
      current = isBeamable(e) ? [i] : [];
    }
  });
  if (current.length > 1) groups.push(current);
  return groups;
}

const PAINTABLE = 'path,rect,ellipse,circle,line,polygon,polyline,text';

/**
 * Recolour an already-drawn note/beam group.
 *
 * VexFlow's SVG backend only emits a fill/stroke attribute when it differs from
 * the enclosing group, so most glyphs INHERIT colour — setting fill+stroke on
 * the wrapper is what actually recolours a note head (fill) and its stem/beam
 * (stroke) together. The leaf sweep then catches the few elements that did get
 * an explicit colour, and leaves `none` alone so hollow heads stay hollow.
 *
 * Cheap (a handful of nodes) and only called when an event's state actually
 * changes — never once per animation frame.
 */
export function paintRhythmEl(el: SVGGElement, color: string): void {
  el.setAttribute('data-color', color);
  el.setAttribute('fill', color);
  el.setAttribute('stroke', color);
  el.querySelectorAll<SVGElement>(PAINTABLE).forEach((n) => {
    const fill = n.getAttribute('fill');
    const stroke = n.getAttribute('stroke');
    if (fill && fill !== 'none') n.setAttribute('fill', color);
    if (stroke && stroke !== 'none') n.setAttribute('stroke', color);
  });
}

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

/**
 * Engrave `pattern` into `parent` (an <svg> or a <g> — the Clap Blast stage
 * passes its scrolling <g>). Returns DOM handles so callers can restyle single
 * events without re-running VexFlow.
 */
export function drawRhythm(parent: SVGElement, pattern: RhythmPattern, opts: DrawRhythmOptions): DrawnRhythm {
  const width = rhythmWidth(pattern);
  const staveY = opts.lineY - MIDDLE_LINE_OFFSET;

  // VexFlow's SVG backend insists on an HTMLDivElement host and makes its own
  // <svg>. We draw into a detached one and then adopt its children into the
  // caller's node, which keeps the caller's viewBox/transform in charge.
  const holder = document.createElement('div');
  const renderer = new Renderer(holder, Renderer.Backends.SVG);
  renderer.resize(width, Math.max(1, Math.ceil(staveY + 100)));
  const ctx = renderer.getContext();
  const vfSvg: SVGSVGElement = ctx.svg;

  // The staff rule stops at the closing barline (set once that x is known
  // below); the remaining PAD_RIGHT is margin inside the SVG box, not staff.
  const stave = new Stave(0, staveY, width, { leftBar: false, rightBar: false });
  const showLine = opts.staffLine !== false;
  stave.setConfigForLines(HIDDEN_LINES.map((l) => ({ visible: l.visible && showLine })));
  stave.addTimeSignature(`${pattern.meter.beats}/${pattern.meter.beatType}`);

  // Build every note first (VexFlow's Beam has to own its notes before they
  // draw — that's how flags get suppressed and stems get extended).
  const notes: VexAny[] = pattern.events.map((e) => {
    const duration = VEX_DUR[e.value] + (e.rest ? 'r' : '');
    const note = new StaveNote({ keys: [RHYTHM_KEY], duration });
    if (e.value.endsWith('.')) Dot.buildAndAttach([note], { all: true });
    if (!e.rest) note.setStemDirection(Stem.UP);
    note.setStave(stave);
    return note;
  });

  const groups = beamGroups(pattern);
  const beams: VexAny[] = groups.map((g) => new Beam(g.map((i) => notes[i])));

  // Proportional placement. getAbsoluteX() = tickContext.x + stave note-start
  // offset, and that offset is a VexFlow internal, so we measure it once from a
  // context parked at 0 rather than hard-coding it.
  const noteCenterX: number[] = [];
  notes.forEach((note: VexAny, i: number) => {
    const mc = new ModifierContext();
    note.addToModifierContext(mc);
    const tc = new TickContext();
    tc.addTickable(note);
    mc.preFormat();
    tc.preFormat();
    tc.setX(0);
    tc.setX(pulseX(pattern.events[i].startPulse) - note.getAbsoluteX());
    noteCenterX.push(note.getAbsoluteX() + note.getGlyphWidth() / 2);
  });
  // Note-head width, taken from the first real note (a rest's glyph is a
  // different width and would bias the stage's hit-line offset).
  const firstNote = notes.find((_: VexAny, i: number) => !pattern.events[i].rest);
  const headWidth = firstNote ? firstNote.getGlyphWidth() : 10;

  // Barline positions. Proportional spacing means the room before a downbeat
  // varies — a whole pulse after a quarter, a third of one after the last eighth
  // of a 6/8 bar — so a line takes its preferred 14px of air before the downbeat
  // but yields to whatever the previous note actually leaves.
  const barX = Array.from({ length: pattern.measures + 1 }, (_, m) => {
    if (m === 0) return 1;
    const boundary = m * pattern.pulsesPerMeasure;
    const prev = pattern.events.filter((e) => e.startPulse < boundary - 1e-6).pop();
    const prevRight = prev
      ? pulseX(prev.startPulse) + headWidth + (prev.value.endsWith('.') ? 7 : 0)
      : PAD_LEFT;
    return Math.max(prevRight + 8, pulseX(boundary) - 14);
  });

  // The staff rule stops at the closing barline; the rest of the SVG box is margin.
  stave.setWidth(barX[pattern.measures] + 3);
  stave.setContext(ctx).draw();
  // Recolour after the fact rather than via setStyle: Stave.drawWithStyle would
  // tint its modifiers too, and the time signature has to stay ink-dark while
  // the staff line stays a light rule.
  vfSvg.querySelector('.vf-stave')?.setAttribute('stroke', STAFF_LINE_COLOR);
  vfSvg.querySelector('.vf-timesignature')?.setAttribute('fill', DEFAULT_NOTE_COLOR);

  // The stave's own begin/end bars are off (they'd be untaggable and pinned to
  // the stave edges), so every measure line is drawn here — real VexFlow
  // Barlines, taking their height from the stave's top/bottom geometry.
  barX.forEach((bx, m) => {
    const g: SVGGElement = ctx.openGroup('rhythm-barline');
    g.setAttribute('data-role', 'barline');
    const bar = new Barline(m === pattern.measures ? BarlineType.END : BarlineType.SINGLE);
    bar.setX(bx);
    bar.setStyle({ strokeStyle: BARLINE_COLOR, fillStyle: BARLINE_COLOR });
    bar.setContext(ctx).setStave(stave).drawWithStyle();
    ctx.closeGroup();
  });

  const noteEls: SVGGElement[] = [];
  notes.forEach((note: VexAny, i: number) => {
    const e = pattern.events[i];
    const color = opts.colors?.[i] || DEFAULT_NOTE_COLOR;
    const g: SVGGElement = ctx.openGroup('rhythm-event');
    g.setAttribute('data-role', e.rest ? 'rest' : 'note');
    g.setAttribute('data-index', String(i));
    note.setContext(ctx).draw();
    ctx.closeGroup();
    paintRhythmEl(g, color);
    noteEls.push(g);
  });

  const beamEls = beams.map((beam: VexAny, bi: number) => {
    const idxs = groups[bi];
    const g: SVGGElement = ctx.openGroup('rhythm-beam');
    g.setAttribute('data-role', 'beam');
    beam.setContext(ctx).draw();
    ctx.closeGroup();
    // VexFlow draws a beamed note's STEM from the Beam, not the note (that's how
    // it extends stems to a common slant), so the stems land in this group in
    // note order. Re-home each one under its own note: then a stem is coloured
    // and hidden with the head it belongs to, instead of taking the beam's
    // colour and outliving an exploded note.
    const stems = Array.from(g.querySelectorAll('.vf-stem'));
    stems.forEach((stem, k) => { if (idxs[k] !== undefined) noteEls[idxs[k]].appendChild(stem); });
    const colors = idxs.map((i) => opts.colors?.[i] || DEFAULT_NOTE_COLOR);
    // The beam itself spans several notes, so it only takes a verdict colour
    // when every note under it agrees — otherwise it stays neutral rather than
    // claiming a verdict that isn't shared.
    paintRhythmEl(g, colors.every((c) => c === colors[0]) ? colors[0] : DEFAULT_NOTE_COLOR);
    idxs.forEach((i) => paintRhythmEl(noteEls[i], opts.colors?.[i] || DEFAULT_NOTE_COLOR));
    return { el: g, indexes: idxs };
  });

  // Syllable underlay. Plain SVG text: VexFlow Annotations would be positioned
  // off the note head's bounding box and drift with dots/flags, and these have
  // to line up in a column under the beat.
  if (opts.syllables) {
    opts.syllables.forEach((text, i) => {
      if (!text) return;
      const t = svgEl('text');
      t.setAttribute('data-role', 'syllable');
      t.setAttribute('x', String(noteCenterX[i]));
      t.setAttribute('y', String(opts.lineY + 34));
      // Explicit family: these <text> nodes live under the wrapper that carries
      // VexFlow's Bravura font-family, and a syllable set in Bravura is gibberish.
      t.setAttribute('font-family', 'ui-sans-serif, system-ui, sans-serif');
      t.setAttribute('font-size', '12');
      t.setAttribute('font-weight', '400');
      t.setAttribute('stroke', 'none');   // else it inherits the wrapper's stroke and reads bold
      t.setAttribute('fill', SYLLABLE_COLOR);
      t.setAttribute('text-anchor', 'middle');
      t.textContent = text;
      vfSvg.appendChild(t);
    });
  }

  // Adopt VexFlow's output into the caller's SVG. Everything must land inside a
  // wrapper that carries the presentation attributes VexFlow put on ITS <svg>
  // root — above all font-family: VexFlow writes an attribute only when it
  // differs from the enclosing element, so every glyph <text> inherits the
  // Bravura family from that root. Drop the root and the glyphs re-render in the
  // page's UI font as stacks of black bars.
  const root = svgEl('g');
  for (const name of ['font-family', 'font-size', 'font-weight', 'font-style', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray']) {
    const v = vfSvg.getAttribute(name);
    if (v !== null) root.setAttribute(name, v);
  }
  while (vfSvg.firstChild) root.appendChild(vfSvg.firstChild);
  parent.appendChild(root);

  return {
    width,
    lineY: opts.lineY,
    noteEls,
    noteCenterX,
    beams: beamEls,
    headHalfWidth: headWidth / 2,
  };
}
