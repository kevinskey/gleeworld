// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { editorScoreToMusicXML } from './musicxmlWrite';
import { musicXmlToEditorScore } from './musicxmlRead';
import { emptyScore, noteOf, type EditorScore } from './model';

/**
 * Save → reopen, for a composed responsorial psalm.
 *
 * The library has always stored the MusicXML; nothing loaded it back, so
 * every visit to the composer started on a blank staff and saving filed a
 * second copy. Reopening now parses the stored document — which makes this
 * round trip the thing the feature rests on. If a detail does not survive it,
 * the user's setting quietly changes the moment they reopen it.
 *
 * jsdom, because the reader parses with DOMParser — a browser API. That is
 * correct for the app; it just means this test needs a DOM to run in.
 */

const psalm: EditorScore = {
  ...emptyScore(),
  title: 'Jeremiah 31:10-12,13',
  keyFifths: -3,
  mode: 'major',
  timeSig: { beats: 4, beatType: 4 },
  clef: 'treble',
  elements: [
    { ...noteOf({ step: 'E', octave: 4, alter: -1 }, 'quarter'), lyric: 'The' },
    { ...noteOf({ step: 'G', octave: 4, alter: 0 }, 'eighth'), lyric: 'Lord' },
    { ...noteOf({ step: 'A', octave: 4, alter: 0 }, 'quarter', 1), lyric: 'will' },
    { ...noteOf({ step: 'B', octave: 4, alter: -1 }, 'half'), lyric: 'guard' },
    { ...noteOf({ step: 'C', octave: 5, alter: 1 }, 'quarter'), lyric: 'us' },
  ],
};

const reopened = musicXmlToEditorScore(editorScoreToMusicXML(psalm));

describe('a composed psalm survives being saved and reopened', () => {
  it('keeps every note', () => {
    expect(reopened.elements).toHaveLength(psalm.elements.length);
  });

  it('keeps pitches, including the accidentals that carry the key', () => {
    const spell = (s: EditorScore) => s.elements
      .filter((e): e is Extract<typeof e, { kind: 'note' }> => e.kind === 'note')
      .map((e) => `${e.pitch.step}${e.pitch.alter}/${e.pitch.octave}`);
    expect(spell(reopened)).toEqual(spell(psalm));
  });

  // Lyrics are the reason this score exists; losing them on reopen would
  // leave a wordless tune and no obvious sign anything went missing.
  it('keeps the words', () => {
    const words = (s: EditorScore) => s.elements.map((e) => (e.kind === 'note' ? e.lyric : null));
    expect(words(reopened)).toEqual(words(psalm));
  });

  it('keeps durations and dots', () => {
    const rhythm = (s: EditorScore) => s.elements.map((e) => `${e.base}.${e.dots}`);
    expect(rhythm(reopened)).toEqual(rhythm(psalm));
  });

  it('keeps the key, mode, metre and clef', () => {
    expect(reopened.keyFifths).toBe(psalm.keyFifths);
    expect(reopened.timeSig).toEqual(psalm.timeSig);
    expect(reopened.clef).toBe(psalm.clef);
  });

  // A second trip catches anything that degrades progressively rather than
  // breaking outright — a setting is opened and saved many times.
  it('is stable across repeated saves', () => {
    const twice = musicXmlToEditorScore(editorScoreToMusicXML(reopened));
    expect(twice.elements).toEqual(reopened.elements);
  });
});

/**
 * The lyric nudge, through the same round trip.
 *
 * It rides in <miscellaneous-field> because gw_sheet_music has nowhere else to
 * put it: the score is stored as MusicXML in xml_content and there is no
 * metadata column beside it. That makes this round trip the whole persistence
 * mechanism — if the field does not survive it, the spacing silently reverts
 * to automatic the next time the setting is opened, on a score whose notes all
 * came back correctly, which is the hardest kind of loss to notice.
 */
describe('the lyric nudge is stored in the MusicXML itself', () => {
  const withOffset = (lyricOffset: number | undefined): EditorScore =>
    ({ ...psalm, lyricOffset });
  const trip = (s: EditorScore) => musicXmlToEditorScore(editorScoreToMusicXML(s));

  it('survives a save and reopen', () => {
    expect(trip(withOffset(6)).lyricOffset).toBe(6);
  });

  it('survives a NEGATIVE nudge — the words moved up, not down', () => {
    expect(trip(withOffset(-4)).lyricOffset).toBe(-4);
  });

  it('travels inside the document, not beside it', () => {
    const xml = editorScoreToMusicXML(withOffset(6));
    expect(xml).toContain('<miscellaneous-field name="gleeworld-lyric-offset">6</miscellaneous-field>');
    // Before <part-list>, where the DTD requires <identification> to sit.
    expect(xml.indexOf('<identification>')).toBeLessThan(xml.indexOf('<part-list>'));
  });

  it('leaves a score with no preference alone', () => {
    // Absent, not 0: the model distinguishes "never chosen" from "chosen, and
    // it happens to be the automatic placement", and every score written
    // before this feature existed is the former.
    expect(trip(withOffset(undefined)).lyricOffset).toBeUndefined();
    expect(editorScoreToMusicXML(withOffset(undefined))).not.toContain('miscellaneous');
  });

  it('writes nothing for an explicit zero either', () => {
    // Zero IS the automatic placement, so it has nothing to say — and a score
    // nudged and then nudged back must serialise as it did before it was
    // touched, or a no-op edit reads as a change.
    expect(editorScoreToMusicXML(withOffset(0))).not.toContain('miscellaneous');
    expect(trip(withOffset(0)).lyricOffset).toBeUndefined();
  });

  it('ignores a corrupt field rather than engraving at NaN', () => {
    // Every lyric coordinate is derived from this number. NaN would not throw;
    // it would silently stop painting the words, on a score that otherwise
    // loads perfectly.
    const broken = editorScoreToMusicXML(withOffset(6))
      .replace('>6</miscellaneous-field>', '>rather low</miscellaneous-field>');
    expect(musicXmlToEditorScore(broken).lyricOffset).toBeUndefined();
  });

  it('is stable across repeated saves', () => {
    expect(trip(trip(withOffset(8))).lyricOffset).toBe(8);
  });

  it('does not disturb the notes it travels with', () => {
    expect(trip(withOffset(6)).elements).toEqual(reopened.elements);
  });
});

/**
 * Bars per system, through the same round trip.
 *
 * This one only started mattering when the worship aid stopped printing the
 * JPEG made at save time and began engraving the stored score afresh. Before
 * that the choice could live in the composer dialog's own state, because the
 * dialog was the only thing that ever engraved. Now two surfaces do, months
 * apart — and if the request does not survive the save, the printed card
 * re-breaks its systems to an estimate of the lyric load rather than to the
 * layout its author chose and looked at.
 */
describe('the bars-per-system choice is stored in the MusicXML too', () => {
  const withBars = (barsPerLine: number | undefined): EditorScore => ({ ...psalm, barsPerLine });
  const trip = (s: EditorScore) => musicXmlToEditorScore(editorScoreToMusicXML(s));

  it('survives a save and reopen', () => {
    expect(trip(withBars(4)).barsPerLine).toBe(4);
    expect(trip(withBars(2)).barsPerLine).toBe(2);
  });

  it('travels inside the document, beside the lyric nudge', () => {
    const xml = editorScoreToMusicXML({ ...psalm, barsPerLine: 4, lyricOffset: 6 });
    expect(xml).toContain('<miscellaneous-field name="gleeworld-bars-per-line">4</miscellaneous-field>');
    expect(xml).toContain('<miscellaneous-field name="gleeworld-lyric-offset">6</miscellaneous-field>');
    // One <identification>, one <miscellaneous> — not two of each, which is
    // not valid MusicXML and would lose whichever the reader saw second.
    expect(xml.match(/<identification>/g)).toHaveLength(1);
    expect(xml.match(/<miscellaneous>/g)).toHaveLength(1);
    const both = trip({ ...psalm, barsPerLine: 4, lyricOffset: 6 });
    expect(both.barsPerLine).toBe(4);
    expect(both.lyricOffset).toBe(6);
  });

  it('leaves a score with no preference alone', () => {
    expect(trip(withBars(undefined)).barsPerLine).toBeUndefined();
    expect(editorScoreToMusicXML(withBars(undefined))).not.toContain('miscellaneous');
  });

  it('ignores a count below one bar rather than starving the packer', () => {
    // targetPerRow of 0 is not a smaller layout, it is no layout: the row
    // packer would fit nothing and the card would engrave empty.
    const broken = editorScoreToMusicXML(withBars(4))
      .replace('>4</miscellaneous-field>', '>0</miscellaneous-field>');
    expect(musicXmlToEditorScore(broken).barsPerLine).toBeUndefined();
    const nonsense = editorScoreToMusicXML(withBars(4))
      .replace('>4</miscellaneous-field>', '>as many as fit</miscellaneous-field>');
    expect(musicXmlToEditorScore(nonsense).barsPerLine).toBeUndefined();
  });

  it('is stable across repeated saves', () => {
    expect(trip(trip(withBars(4))).barsPerLine).toBe(4);
  });

  it('does not disturb the notes or the nudge it travels with', () => {
    expect(trip(withBars(4)).elements).toEqual(reopened.elements);
    expect(trip(withBars(4)).lyricOffset).toBeUndefined();
  });
});
