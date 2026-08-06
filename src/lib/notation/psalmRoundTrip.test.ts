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
