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

/**
 * Split psalm text into the syllable-ish tokens a user assigns to notes.
 *
 * Deliberately word-level, not a hyphenation engine: English syllabification
 * is genuinely ambiguous ("ev-ery" vs "eve-ry"), and a cantor setting a psalm
 * makes that call themselves. What this DOES do is honour a hyphen the user
 * already typed, so "glo-ry" arrives as two tokens ready for two notes, and
 * drop the verse numbers and refrain markers that ride along in scraped text
 * and are never sung.
 */
export function psalmSyllables(text: string): string[] {
  return text
    .replace(/\r/g, '')
    // Bracketed verse refs and standalone verse numbers are apparatus.
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\(\s*[\d:,\s-]+\s*\)/g, ' ')
    .replace(/^\s*R[.:]?\s*/gim, ' ')
    .split(/\s+/)
    .flatMap((word) => word.split(/(?<=-)/))
    .map((t) => t.replace(/^[^\p{L}\p{N}'’-]+|[^\p{L}\p{N}'’-]+$/gu, ''))
    .filter((t) => t.length > 0 && !/^\d+$/.test(t));
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

  // Never fewer than 1, and more than 4 bars across 4 inches is unreadable
  // however sparse the notes are.
  return Math.max(1, Math.min(4, fit, Math.ceil(beatsPerMeasure >= 6 ? 2 : 4)));
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
