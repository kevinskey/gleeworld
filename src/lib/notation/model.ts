import { BaseDur, dottedTicks } from './duration';

export interface Pitch { step: 'A'|'B'|'C'|'D'|'E'|'F'|'G'; octave: number; alter: number }
export interface EditorNote {
  kind: 'note';
  pitch: Pitch;
  base: BaseDur;
  dots: number;
  tie: 'start'|'stop'|'none';
  lyric?: string;
  /** Articulation glyph attached above/below the note. 'staccato' draws
   *  a small dot; extended later with 'accent' / 'tenuto' as needed. */
  articulation?: 'staccato';
  /** Slur (legato) grouping — `'start'` on the first note under the slur,
   *  `'stop'` on the last. Notes in between with `'inside'` sit under the
   *  same curve. Undefined = not slurred. */
  slur?: 'start' | 'inside' | 'stop';
  /** Triplet grouping — first note is `'start'`, middle notes `'inside'`,
   *  last is `'stop'`. Ticks for a triplet-tagged note are 2/3 of the
   *  base value (three triplet eighths fit in two normal eighths). */
  triplet?: 'start' | 'inside' | 'stop';
}
export interface EditorRest { kind: 'rest'; base: BaseDur; dots: number }
export type EditorElement = EditorNote | EditorRest;

export interface EditorScore {
  title: string;
  keyFifths: number;
  mode: 'major' | 'minor';
  timeSig: { beats: number; beatType: number };
  clef: 'treble' | 'bass' | 'alto';
  tempo: number;
  elements: EditorElement[];
  /** Zero-based measure indices AFTER which to force a system break. The
   *  auto-packing in NotationView respects each entry — so a user who wants
   *  measure 4 on its own line adds `3` here. Optional; when absent, the
   *  auto-packer decides breaks on its own. */
  systemBreaks?: number[];
  /** Per-score nudge of the lyric line, in engraving units, ADDED to the
   *  baseline NotationView computes for itself (see its draw loop). 0 or
   *  absent means "wherever the automatic placement puts it"; positive moves
   *  the words DOWN, away from the notes; negative moves them UP, closer.
   *
   *  A taste control, not a correction: the automatic baseline already clears
   *  the notes, but how much air a psalm card wants between tone and text is
   *  a judgement the person engraving it makes, and it differs per psalm.
   *  Optional; unset scores engrave exactly as they always did. */
  lyricOffset?: number;
}

export function emptyScore(): EditorScore {
  return {
    title: 'Untitled exercise',
    keyFifths: 0,
    mode: 'major',
    timeSig: { beats: 4, beatType: 4 },
    clef: 'treble',
    tempo: 120,
    elements: [],
  };
}

export function noteOf(pitch: Pitch, base: BaseDur, dots = 0): EditorNote {
  return { kind: 'note', pitch, base, dots, tie: 'none' };
}

export function restOf(base: BaseDur, dots = 0): EditorRest {
  return { kind: 'rest', base, dots };
}

export function elementTicks(el: EditorElement): number {
  const base = dottedTicks(el.base, el.dots);
  // Triplet notes occupy 2/3 of their base value so 3 of them fit in the
  // space of 2. DIVISIONS = 480 was chosen partly for this — 480, 240,
  // 120, 60 all divide by 3 cleanly, so triplet ticks stay integer at
  // every subdivision from whole to 32nd. Rests can't be triplet-tagged
  // (rests inside a triplet are still just rests in the model; the
  // grouping is a property of the surrounding notes only).
  if (el.kind === 'note' && el.triplet) return (base * 2) / 3;
  return base;
}
