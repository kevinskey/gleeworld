import type { EditorScore, Pitch } from '@/lib/notation/model';
// lyricSpacing is pure arithmetic — no React, no VexFlow, no imports of its
// own — so taking the lyric's size FROM it costs this module nothing and
// removes the one number that would otherwise have to be copied here.
import { LYRIC_POINT_SIZE } from '@/pages/notation/lyricSpacing';
import { AID_CONTENT_WIDTH_IN, AID_BODY_PT } from './aidPage';

/**
 * Pure logic behind the responsorial-psalm composer.
 *
 * Kept out of the dialog so the parts that are easy to get subtly wrong —
 * which pitch a scale degree means in a given key, how a psalm verse breaks
 * into singable syllables, how many measures fit on a 4-inch staff — are
 * testable without mounting VexFlow.
 */

/**
 * How wide the psalm card PRINTS.
 *
 * It used to be a flat four inches, and everything else was made to follow
 * from that. Nothing in the document was four inches: the aid's narrowest
 * text column is 4.30in, so a four-inch engraving sat in a band with a fifth
 * of an inch of dead margin down each side while its own notes were squeezed
 * to fit — small print bought to leave white space. Kevin: "the psalm is
 * rendered too small — it can be wider so the 4 measure clips can be bigger."
 *
 * So the card takes the column instead of a number. AID_CONTENT_WIDTH_IN is
 * derived from the panel width and margins in aidPage, which WorshipAidSheets
 * lays the page out from — so the engraved width and the slot it prints into
 * are the same measurement, not two that agree today.
 */
export const PSALM_WIDTH_IN = AID_CONTENT_WIDTH_IN;
export const CSS_DPI = 96;
/** The same width in CSS pixels, at the reference resolution of 96 dpi. */
export const PSALM_WIDTH_PX = PSALM_WIDTH_IN * CSS_DPI;

/**
 * One staff space in NotationView's engraving units — VexFlow's own
 * STAVE_LINE_DISTANCE. Restated here rather than imported so this module
 * stays free of React and VexFlow; psalmComposer.test.ts asserts it still
 * matches NotationView's exported STAFF_SPACE, so the two cannot drift.
 */
const STAFF_SPACE_UNITS = 10;

/**
 * How big the psalm's LYRICS print, in points.
 *
 * This is the number the whole card is now sized from, and it is not ours to
 * pick: it is the aid's own body type. A congregation reads the psalm off the
 * page the same way it reads the readings' summaries beside it, so the sung
 * words belong at the same reading size as the printed ones. Kevin: "the
 * psalm text size should match the other paragraph text on the worship aid."
 *
 * Taken FROM aidPage rather than restated, so the two cannot drift: the
 * paragraph and the engraving are set by one number, and a large-print aid is
 * a single edit. It replaces a chain that ran the other way — a staff height
 * was chosen, the lyric fell out of it as a ratio, and what the words actually
 * printed at (6.11pt beside 8pt body type) was nobody's decision.
 */
export const PSALM_LYRIC_PT = AID_BODY_PT;

/**
 * The engraving scale the psalm prints at — CSS pixels per engraving unit.
 *
 * Derived BACKWARDS from the printed point size, which is the only way this
 * can be got right. `scale` multiplies everything the renderer draws, so the
 * size the lyrics land at on paper is exactly the point size VexFlow's setFont
 * is given times this scale — LYRIC_POINT_SIZE × PSALM_ENGRAVING_SCALE. Solve
 * that for the scale and there is no constant left to tune by eye, and no
 * second place for engraving units and CSS pixels to be confused: the two unit
 * bugs behind the 10.6mm staff and the colliding lyrics were both a number
 * written in one unit and read in another, and a derivation cannot make that
 * mistake in silence — LYRIC_POINT_SIZE is in points, PSALM_LYRIC_PT is in
 * points, and the quotient is dimensionless by construction.
 *
 * What this replaces was a two-entry table whose four-per-line row was the
 * two-per-line row times 0.62 (#585), then a single scale taken from a chosen
 * quarter-inch staff height (#588). Both set the WORDS by accident.
 */
export const PSALM_ENGRAVING_SCALE = PSALM_LYRIC_PT / LYRIC_POINT_SIZE; // 8 / 12 = 0.667

/**
 * How tall the psalm's staff PRINTS, in inches — now a CONSEQUENCE, not a
 * choice.
 *
 * It used to be the input: a quarter of an inch, an ordinary small-score
 * rastral, with the lyric size falling out of it. That ordering is what put
 * 6.11pt words under 8pt headings. The staff and the words are one lever —
 * lyric size is a fixed multiple of staff space, the way engraving states it —
 * so only one of them can be chosen, and legibility of the WORDS is the
 * requirement a congregation actually has.
 *
 * At the house ratio (LYRIC_EM_PER_STAFF_SPACE = 1.6) 8pt words put the staff
 * at 0.278in / 7.06mm. That is the top of the hymnal range rather than the
 * middle of it — 6–7mm is the norm — and it is the honest price of the spec:
 * the only way to 8pt words on a smaller staff is a looser lyric-to-staff
 * ratio, which is a house-style change affecting every engraved score in the
 * app, not a psalm decision.
 */
export const PSALM_STAFF_HEIGHT_IN =
  (4 * STAFF_SPACE_UNITS * PSALM_ENGRAVING_SCALE) / CSS_DPI; // 0.278in ≈ 7.06mm

/**
 * The smallest size the psalm may print at — which is the size it asks for.
 *
 * #588 made this a real reduction: the renderer was allowed to shrink the
 * engraving, as far as 0.62×, so that the bars-per-line the user chose stayed
 * on one line. That trade is off the table now, and the reason is the spec.
 * Shrinking the engraving shrinks the words with it — that is what a scale
 * does — so any shrink at all prints the psalm below the aid's body size, and
 * the requirement that started this is precisely that it must not.
 *
 * So the floor and the ceiling coincide, and the LAYOUT gives way instead: the
 * packer drops a line that will not hold four bars to three and an orphan, or
 * to two lines, and `onLayout` tells the composer, which says "(fits N here)".
 * That is a visible, corrigible answer; words a third under reading size are
 * not. The floor is still passed to NotationView rather than dropped, because
 * it states the constraint at the point where the renderer would otherwise be
 * free to ignore it — raise the ceiling above it one day and the fitting comes
 * back to life correctly.
 */
export const PSALM_MIN_ENGRAVING_SCALE = PSALM_ENGRAVING_SCALE;

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
 * This only SEEDS the dialog's opening choice; the toggle then wins, and the
 * renderer sizes the staff to whatever count it is given. Lyrics are what
 * actually consume horizontal space — a bar of melismatic eighth notes under
 * long words needs far more room than a bar of half notes on "Lord". Rather
 * than a constant, this scales the count to the widest lyric load in the
 * piece.
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

  // TWO is the floor, not one. A single bar stretched across the whole card
  // is not a layout anyone would choose (Kevin: "i will never use one measure
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
