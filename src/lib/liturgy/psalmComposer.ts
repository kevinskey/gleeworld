import type { EditorScore, Pitch } from '@/lib/notation/model';

/**
 * Pure logic behind the responsorial-psalm composer.
 *
 * Kept out of the dialog so the parts that are easy to get subtly wrong —
 * which pitch a scale degree means in a given key, how a psalm verse breaks
 * into singable syllables, how many measures fit on a 4-inch staff — are
 * testable without mounting VexFlow.
 */

/** 4 inches at the CSS reference resolution of 96 dpi. Kevin's spec: psalm
 *  cards print at a fixed 4-inch width, and everything else (measures per
 *  line, overall height) follows from that. */
export const PSALM_WIDTH_IN = 4;
export const CSS_DPI = 96;
export const PSALM_WIDTH_PX = PSALM_WIDTH_IN * CSS_DPI; // 384

/**
 * One staff space in NotationView's engraving units — VexFlow's own
 * STAVE_LINE_DISTANCE. Restated here rather than imported so this module
 * stays free of React and VexFlow; psalmComposer.test.ts asserts it still
 * matches NotationView's exported STAFF_SPACE, so the two cannot drift.
 */
const STAFF_SPACE_UNITS = 10;

/**
 * How tall the psalm's staff PRINTS, in inches.
 *
 * The spec fixed the psalm card's WIDTH at four inches and left its staff
 * size to fall out of the renderer — and what fell out was VexFlow's screen
 * default. One engraving unit was one CSS pixel, a staff space is ten units,
 * so the staff printed 40/96 of an inch: 10.6mm, half again bigger than a
 * hymnal's, on a 5.5×8.5 leaflet whose body text is 8pt. Nothing chose that
 * number. Width in inches and height in screen pixels is not a print spec.
 *
 * So the height is now stated, in the same units as the width. A quarter of
 * an inch — 6.35mm — is an ordinary small-score rastral: comfortably readable
 * in a pew, and small enough that two systems of a psalm tone occupy about an
 * inch and a half of a panel instead of a third of it.
 */
export const PSALM_STAFF_HEIGHT_IN = 0.25;

/**
 * Engraving scale per measures-per-line choice.
 *
 * `scale` is how many CSS pixels one engraving unit is worth, so it sets the
 * staff's printed SIZE and, inversely, how much layout room four inches
 * buys — the two are the same lever, which is why they have to be set from
 * the size that matters and the other allowed to follow.
 *
 * Two per line is the psalm card's real case, and it is pinned to
 * PSALM_STAFF_HEIGHT_IN exactly. Four per line keeps the reduction it always
 * had relative to it (0.62×): four bars of lyrics in four inches genuinely
 * cannot be set at reading size, and small print is the honest consequence of
 * asking for them, not a regression. The renderer still drops below the
 * requested count when even that will not fit.
 */
export const PSALM_ENGRAVING_SCALE: Record<2 | 4, number> = {
  2: (PSALM_STAFF_HEIGHT_IN * CSS_DPI) / (4 * STAFF_SPACE_UNITS), // 0.6
  4: ((PSALM_STAFF_HEIGHT_IN * CSS_DPI) / (4 * STAFF_SPACE_UNITS)) * 0.62,
};

const STEPS: Pitch['step'][] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
/** Semitones above the tonic for each major-scale degree. */
const MAJOR_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
/** Natural-minor offsets. Psalm tones are frequently modal/minor, and a
 *  degree that silently meant the major third there would be wrong in a way
 *  the user would have to fix note by note. */
const MINOR_OFFSETS = [0, 2, 3, 5, 7, 8, 10];

/** Semitone of each natural step within an octave, C = 0. */
const STEP_SEMITONE: Record<Pitch['step'], number> = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

/**
 * The tonic implied by a key signature.
 *
 * Fifths run C G D A E B F# C# sharpward and C F Bb Eb Ab Db Gb flatward;
 * a minor key uses the same signature as its relative major, so the tonic
 * sits a minor third below.
 */
export function tonicOf(keyFifths: number, mode: 'major' | 'minor'): Pitch {
  const sharpOrder: Pitch['step'][] = ['C', 'G', 'D', 'A', 'E', 'B', 'F'];
  const flatOrder: Pitch['step'][] = ['C', 'F', 'B', 'E', 'A', 'D', 'G'];
  const f = Math.max(-7, Math.min(7, Math.trunc(keyFifths)));
  let step: Pitch['step'];
  let alter = 0;
  if (f >= 0) {
    step = sharpOrder[f % 7];
    // The 6th and 7th sharp keys (F#, C#) raise their letter.
    if (f >= 6) alter = 1;
  } else {
    step = flatOrder[(-f) % 7];
    // From 2 flats on, the tonic letter itself is flattened (Bb, Eb, Ab…).
    if (-f >= 2) alter = -1;
  }
  if (mode === 'minor') {
    // Down a minor third from the relative major, staying in letter space.
    const idx = STEPS.indexOf(step);
    const lowered = STEPS[(idx + 5) % 7];
    const wantSemitone = ((STEP_SEMITONE[step] + alter) - 3 + 12) % 12;
    alter = normalizeAlter(wantSemitone - STEP_SEMITONE[lowered]);
    step = lowered;
  }
  return { step, octave: 4, alter };
}

/** Fold an accidental into [-2, 2] across the octave wrap. */
function normalizeAlter(raw: number): number {
  let a = raw;
  while (a > 6) a -= 12;
  while (a < -6) a += 12;
  return a;
}

/**
 * Scale degree (1-7) → concrete pitch in the score's key.
 *
 * This is what makes numeric entry mean what a musician expects: in Eb major,
 * `3` is G, not E. `octaveShift` moves the whole degree an octave at a time so
 * a psalm tone that dips below the tonic is still reachable from the number
 * row.
 */
export function degreeToPitch(
  degree: number,
  keyFifths: number,
  mode: 'major' | 'minor',
  octaveShift = 0,
): Pitch {
  const d = Math.trunc(degree);
  if (d < 1 || d > 7) throw new RangeError(`scale degree must be 1-7, got ${degree}`);
  const tonic = tonicOf(keyFifths, mode);
  const offsets = mode === 'minor' ? MINOR_OFFSETS : MAJOR_OFFSETS;

  const tonicIdx = STEPS.indexOf(tonic.step);
  const letterIdx = (tonicIdx + (d - 1)) % 7;
  const step = STEPS[letterIdx];
  // Each degree crosses into the next octave once its letter wraps past B.
  const wrapped = tonicIdx + (d - 1) >= 7 ? 1 : 0;

  const tonicSemitone = STEP_SEMITONE[tonic.step] + tonic.alter;
  const wantSemitone = (tonicSemitone + offsets[d - 1]) % 12;
  const alter = normalizeAlter(wantSemitone - STEP_SEMITONE[step]);

  return { step, octave: tonic.octave + wrapped + octaveShift, alter };
}

/** One line of the psalm, with the tokens a user assigns to notes. */
export interface PsalmLine {
  /** Display text, with the "R." marker and verse apparatus removed. */
  text: string;
  /** Refrains are the sung response — set apart, and repeated between verses. */
  isRefrain: boolean;
  /** Singable tokens on this line. */
  tokens: string[];
  /** Index of this line's first token in the flat psalmSyllables() list, so a
   *  word can be highlighted from the same cursor that drives note entry. */
  startIndex: number;
}

/** Strip what is printed but never sung: bracketed refs, bare verse numbers
 *  in parentheses, and the leading "R." response marker. */
function cleanLine(line: string): string {
  return line
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\(\s*[\d:,\s-]+\s*\)/g, ' ')
    .replace(/^\s*R[.:]?\s*/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(line: string): string[] {
  return line
    .split(/\s+/)
    // A hyphen the user typed is them choosing the syllable break; keep it on
    // the leading token so the engraved lyric still reads "glo-".
    .flatMap((word) => word.split(/(?<=-)/))
    .map((t) => t.replace(/^[^\p{L}\p{N}'\u2019-]+|[^\p{L}\p{N}'\u2019-]+$/gu, ''))
    .filter((t) => t.length > 0 && !/^\d+$/.test(t));
}

/**
 * Parse psalm text into refrain and verse lines.
 *
 * A responsorial psalm is not prose: the assembly sings a refrain, a cantor
 * sings a verse, the refrain returns. Run together as one paragraph it is
 * unusable for setting music, because the shape IS the form.
 *
 * The refrain is found by RECURRENCE rather than by its "R." marker, because
 * the scraped text usually has no marker — the same line simply comes back
 * between verses. Both signals are accepted.
 */
export function psalmLines(text: string): PsalmLine[] {
  const cleaned = (text ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => ({ raw: l.trim(), text: cleanLine(l) }))
    .filter((l) => l.text.length > 0);

  const counts = new Map<string, number>();
  for (const l of cleaned) counts.set(l.text.toLowerCase(), (counts.get(l.text.toLowerCase()) ?? 0) + 1);

  let cursor = 0;
  return cleaned.map(({ raw, text: lineText }) => {
    const tokens = tokenize(lineText);
    const line: PsalmLine = {
      text: lineText,
      isRefrain: /^\s*R[.:]?\s/i.test(raw) || (counts.get(lineText.toLowerCase()) ?? 0) > 1,
      tokens,
      startIndex: cursor,
    };
    cursor += tokens.length;
    return line;
  });
}

/**
 * The flat list of singable tokens, in order.
 *
 * Derived from psalmLines rather than parsed separately, so the word the
 * display highlights is by construction the word the next note will take.
 * Two independent parsers would drift the moment either changed.
 */
export function psalmSyllables(text: string): string[] {
  return psalmLines(text).flatMap((l) => l.tokens);
}

/**
 * How many measures to put on a line.
 *
 * The staff is a fixed 4 inches, so measures per line is the only lever for
 * legibility, and lyrics are what actually consume horizontal space — a bar
 * of melismatic eighth notes under long words needs far more room than a bar
 * of half notes on "Lord". Rather than a constant, this scales the count to
 * the widest lyric load in the piece, then lets the caller's renderer fall
 * back further if a bar genuinely cannot fit.
 */
export function measuresPerLine(score: EditorScore): number {
  const notes = score.elements.filter((e) => e.kind === 'note');
  if (notes.length === 0) return 2;

  const beatsPerMeasure = score.timeSig.beats || 4;
  const notesPerMeasure = Math.max(1, notes.length / Math.max(1, measureCount(score)));
  const lyricChars = notes.reduce((sum, n) => sum + ((n as { lyric?: string }).lyric?.length ?? 0), 0);
  const avgLyric = lyricChars / notes.length;

  // Rough width budget: each note needs room for its glyph plus its syllable.
  // ~7px per character at the engraved size, ~26px of glyph + spacing.
  const perMeasurePx = notesPerMeasure * (26 + avgLyric * 7);
  const fit = Math.floor((PSALM_WIDTH_PX - 40) / Math.max(1, perMeasurePx));

  // TWO is the floor, not one. A single bar stretched across four inches is
  // not a layout anyone would choose (Kevin: "i will never use one measure
  // wide on a four inch wide space") — engravers would rather cramp a busy
  // bar than leave that much air. Four is the ceiling: past that the lyrics
  // collide at this width.
  const ceiling = beatsPerMeasure >= 6 ? 3 : 4;
  return Math.max(2, Math.min(ceiling, Math.max(2, fit)));
}

/** Number of (possibly partial) measures the elements occupy. */
export function measureCount(score: EditorScore): number {
  const perMeasure = score.timeSig.beats * (4 / score.timeSig.beatType);
  if (perMeasure <= 0) return 1;
  const quarters = score.elements.reduce((sum, el) => {
    const base = { whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25, '32nd': 0.125 }[el.base];
    const dotted = base * (2 - Math.pow(0.5, el.dots));
    const trip = el.kind === 'note' && el.triplet ? (2 / 3) : 1;
    return sum + dotted * trip;
  }, 0);
  return Math.max(1, Math.ceil(quarters / perMeasure));
}

/**
 * Title for a composed psalm.
 *
 * Leads with the citation because that is how a musician looks one up
 * ("do we have a setting of Psalm 34?"), and carries the liturgical day so
 * two settings of the same psalm for different Sundays stay distinguishable.
 */
export function psalmScoreTitle(citation: string | null, observation: string | null): string {
  const cite = (citation ?? '').trim();
  const day = (observation ?? '').trim();
  if (cite && day) return `${cite} — ${day}`;
  if (cite) return cite;
  if (day) return `Responsorial Psalm — ${day}`;
  return 'Responsorial Psalm';
}

/** The tag that files a score under Responsorial Psalms in the library. */
export const PSALM_TAG = 'responsorial-psalm';
