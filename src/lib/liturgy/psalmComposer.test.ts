import { describe, it, expect } from 'vitest';
import {
  degreeToPitch, tonicOf, psalmSyllables, psalmLines, measuresPerLine, psalmBarsPerLine, measureCount,
  psalmScoreTitle, PSALM_WIDTH_PX, PSALM_WIDTH_IN,
} from './psalmComposer';
import { AID_CONTENT_WIDTH_IN } from './aidPage';
import { emptyScore, noteOf, type EditorScore, type Pitch } from '@/lib/notation/model';

const name = (p: Pitch) => `${p.step}${p.alter > 0 ? '#'.repeat(p.alter) : p.alter < 0 ? 'b'.repeat(-p.alter) : ''}${p.octave}`;

describe('tonicOf', () => {
  it('reads the sharp side of the circle', () => {
    expect(name(tonicOf(0, 'major'))).toBe('C4');
    expect(name(tonicOf(1, 'major'))).toBe('G4');
    expect(name(tonicOf(2, 'major'))).toBe('D4');
    expect(name(tonicOf(5, 'major'))).toBe('B4');
    expect(name(tonicOf(6, 'major'))).toBe('F#4');
  });

  it('reads the flat side', () => {
    expect(name(tonicOf(-1, 'major'))).toBe('F4');
    expect(name(tonicOf(-2, 'major'))).toBe('Bb4');
    expect(name(tonicOf(-3, 'major'))).toBe('Eb4');
    expect(name(tonicOf(-4, 'major'))).toBe('Ab4');
  });

  it('puts a minor key on its own tonic, not the relative major', () => {
    expect(name(tonicOf(0, 'minor'))).toBe('A4');   // no signature = A minor
    expect(name(tonicOf(-1, 'minor'))).toBe('D4');  // one flat = D minor
    expect(name(tonicOf(1, 'minor'))).toBe('E4');   // one sharp = E minor
  });
});

describe('degreeToPitch — a number means the same thing a musician means', () => {
  it('walks the C major scale', () => {
    const got = [1, 2, 3, 4, 5, 6, 7].map((d) => name(degreeToPitch(d, 0, 'major')));
    expect(got).toEqual(['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4']);
  });

  // The whole point of keying the numbers: in Eb, "3" is G, not E.
  it('respects the key signature', () => {
    const eFlat = [1, 2, 3, 4, 5, 6, 7].map((d) => name(degreeToPitch(d, -3, 'major')));
    expect(eFlat).toEqual(['Eb4', 'F4', 'G4', 'Ab4', 'Bb4', 'C5', 'D5']);
  });

  it('uses natural-minor degrees in a minor key', () => {
    const dMinor = [1, 2, 3, 4, 5, 6, 7].map((d) => name(degreeToPitch(d, -1, 'minor')));
    expect(dMinor).toEqual(['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5']);
  });

  it('crosses into the next octave when the letter wraps past B', () => {
    expect(name(degreeToPitch(1, 1, 'major'))).toBe('G4');
    expect(name(degreeToPitch(3, 1, 'major'))).toBe('B4');
    expect(name(degreeToPitch(4, 1, 'major'))).toBe('C5');
  });

  it('shifts whole octaves for tones that dip below the tonic', () => {
    expect(name(degreeToPitch(5, 0, 'major', -1))).toBe('G3');
    expect(name(degreeToPitch(1, 0, 'major', 1))).toBe('C5');
  });

  it('rejects anything that is not a degree', () => {
    expect(() => degreeToPitch(0, 0, 'major')).toThrow(RangeError);
    expect(() => degreeToPitch(8, 0, 'major')).toThrow(RangeError);
  });
});

describe('psalmSyllables', () => {
  it('splits a verse into singable tokens', () => {
    expect(psalmSyllables('I will bless the Lord at all times'))
      .toEqual(['I', 'will', 'bless', 'the', 'Lord', 'at', 'all', 'times']);
  });

  // A hyphen is the user telling us where the syllable break goes; the split
  // keeps it on the leading token so the engraved lyric still reads "glo-".
  it('honours hyphens the user already typed', () => {
    expect(psalmSyllables('glo-ry')).toEqual(['glo-', 'ry']);
  });

  it('drops verse apparatus that is never sung', () => {
    expect(psalmSyllables('R. Taste and see (34:2-3)')).toEqual(['Taste', 'and', 'see']);
    expect(psalmSyllables('[Refrain] Bless the Lord')).toEqual(['Bless', 'the', 'Lord']);
  });

  it('strips punctuation but keeps apostrophes inside words', () => {
    expect(psalmSyllables("the Lord's name.")).toEqual(['the', "Lord's", 'name']);
  });

  it('is empty for empty input', () => {
    expect(psalmSyllables('   ')).toEqual([]);
  });
});

// The real text, as Universalis actually delivers it: no "R." marker, the
// refrain simply recurring between verses.
const REAL_PSALM = [
  'The Lord will guard us, as a shepherd guards his flock.',
  'O nations, hear the word of the Lord,',
  'proclaim it to the far-off coasts.',
  'The Lord will guard us, as a shepherd guards his flock.',
  'For the Lord has ransomed Jacob,',
].join('\n');

describe('psalmLines — the refrain/verse shape IS the form', () => {
  it('keeps one line per line rather than one paragraph', () => {
    expect(psalmLines(REAL_PSALM)).toHaveLength(5);
  });

  it('finds the refrain by recurrence, with no "R." marker to go on', () => {
    const lines = psalmLines(REAL_PSALM);
    expect(lines.map((l) => l.isRefrain)).toEqual([true, false, false, true, false]);
  });

  it('still honours an explicit R. marker on a line that appears once', () => {
    const lines = psalmLines('R. Taste and see\nI will bless the Lord');
    expect(lines[0].isRefrain).toBe(true);
    expect(lines[0].text).toBe('Taste and see');   // marker not sung
    expect(lines[1].isRefrain).toBe(false);
  });

  it('indexes each line into the flat token list the notes consume', () => {
    const lines = psalmLines(REAL_PSALM);
    const flat = psalmSyllables(REAL_PSALM);
    for (const line of lines) {
      expect(flat.slice(line.startIndex, line.startIndex + line.tokens.length))
        .toEqual(line.tokens);
    }
  });

  // The guarantee that makes the highlight trustworthy: the word shown as
  // "next" is the word the next note actually takes.
  it('flattens to exactly psalmSyllables, in order', () => {
    expect(psalmLines(REAL_PSALM).flatMap((l) => l.tokens)).toEqual(psalmSyllables(REAL_PSALM));
  });

  it('is empty for empty text', () => {
    expect(psalmLines('')).toEqual([]);
    expect(psalmLines('   \n  ')).toEqual([]);
  });
});

describe('measureCount', () => {
  it('counts a bar of four quarters as one measure', () => {
    const s: EditorScore = { ...emptyScore(), elements: Array.from({ length: 4 }, () => noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter')) };
    expect(measureCount(s)).toBe(1);
  });

  it('rolls into a second measure on the fifth quarter', () => {
    const s: EditorScore = { ...emptyScore(), elements: Array.from({ length: 5 }, () => noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter')) };
    expect(measureCount(s)).toBe(2);
  });
});

describe('measuresPerLine — the aid\'s column is the constraint, lyrics are the load', () => {
  const withLyrics = (count: number, lyric: string): EditorScore => ({
    ...emptyScore(),
    elements: Array.from({ length: count }, () => ({ ...noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter'), lyric })),
  });

  it('is the aid\'s own column wide, at 96 dpi', () => {
    // Not a number typed in twice. The card's width IS the narrowest text
    // column the printed aid has; the point of the constant is that the
    // engraving and the slot it drops into cannot disagree.
    expect(PSALM_WIDTH_PX).toBe(AID_CONTENT_WIDTH_IN * 96);
    expect(PSALM_WIDTH_IN).toBe(AID_CONTENT_WIDTH_IN);
  });

  it('fits more bars per line when the words are short', () => {
    const short = measuresPerLine(withLyrics(8, 'Lord'));
    const long = measuresPerLine(withLyrics(8, 'everlasting'));
    expect(short).toBeGreaterThanOrEqual(long);
  });

  // A single bar stretched across the whole card is not a layout anyone would
  // choose — two is the floor even when the bar is dense.
  it('never puts one lone measure on a printed line', () => {
    for (const text of ['a', 'Lord', 'incomprehensibilities', 'supercalifragilistic']) {
      const n = measuresPerLine(withLyrics(32, text));
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(4);
    }
  });

  it('holds the floor for compound metres too', () => {
    const compound: EditorScore = {
      ...withLyrics(24, 'everlasting'),
      timeSig: { beats: 6, beatType: 8 },
    };
    expect(measuresPerLine(compound)).toBeGreaterThanOrEqual(2);
  });

  it('handles an empty score without dividing by zero', () => {
    expect(measuresPerLine(emptyScore())).toBe(2);
  });
});

describe('psalmBarsPerLine — one answer for two surfaces engraving the same score', () => {
  const withLyrics = (count: number, lyric: string): EditorScore => ({
    ...emptyScore(),
    elements: Array.from({ length: count }, () => ({ ...noteOf({ step: 'C', octave: 4, alter: 0 }, 'quarter'), lyric })),
  });

  it('returns what the author recorded, not what the lyric load suggests', () => {
    // The whole reason the field exists. A dense setting estimates low; if
    // the estimate could override the recorded choice, the printed card
    // would re-break its systems behind its author's back the first time the
    // worship aid engraved it.
    const dense = withLyrics(32, 'incomprehensibilities');
    expect(measuresPerLine(dense)).toBe(2);
    expect(psalmBarsPerLine({ ...dense, barsPerLine: 4 })).toBe(4);
  });

  it('falls back to the estimate when nothing was recorded', () => {
    const score = withLyrics(8, 'Lord');
    expect(psalmBarsPerLine(score)).toBe(measuresPerLine(score) >= 3 ? 4 : 2);
    expect(psalmBarsPerLine(emptyScore())).toBe(2);
  });

  it('ignores a count that would engrave nothing', () => {
    // Zero bars per system is not a denser layout, it is no layout.
    const score = withLyrics(8, 'Lord');
    expect(psalmBarsPerLine({ ...score, barsPerLine: 0 })).toBe(psalmBarsPerLine(score));
    expect(psalmBarsPerLine({ ...score, barsPerLine: Number.NaN })).toBe(psalmBarsPerLine(score));
  });
});

describe('psalmScoreTitle', () => {
  it('leads with the citation and keeps the day', () => {
    expect(psalmScoreTitle('Psalm 34:2-9', '19th Sunday in Ordinary Time'))
      .toBe('Psalm 34:2-9 — 19th Sunday in Ordinary Time');
  });

  it('degrades sensibly when one side is missing', () => {
    expect(psalmScoreTitle('Psalm 34', null)).toBe('Psalm 34');
    expect(psalmScoreTitle(null, 'Easter Sunday')).toBe('Responsorial Psalm — Easter Sunday');
    expect(psalmScoreTitle(null, null)).toBe('Responsorial Psalm');
  });
});
