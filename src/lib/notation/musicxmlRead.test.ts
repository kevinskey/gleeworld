// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { musicXmlToEditorScore } from './musicxmlRead';
import { editorScoreToMusicXML } from './musicxmlWrite';
import { emptyScore, noteOf, restOf } from './model';

const C4 = { step: 'C' as const, octave: 4, alter: 0 };
const FS4 = { step: 'F' as const, octave: 4, alter: 1 };
const BF3 = { step: 'B' as const, octave: 3, alter: -1 };

describe('musicXmlToEditorScore round-trips the writer', () => {
  const fixtures: Record<string, ReturnType<typeof emptyScore>> = {
    'four quarters': { ...emptyScore(), elements: [noteOf(C4,'quarter'), noteOf(C4,'quarter'), noteOf(C4,'quarter'), noteOf(C4,'quarter')] },
    'sharps flats dots rests': { ...emptyScore(), elements: [noteOf(FS4,'quarter',1), restOf('eighth'), noteOf(BF3,'half'), noteOf(C4,'eighth')] },
    'G major 3/4 bass': { ...emptyScore(), keyFifths: 1, timeSig: { beats: 3, beatType: 4 }, clef: 'bass', elements: [noteOf(C4,'quarter'), noteOf(C4,'half')] },
    'a tie': { ...emptyScore(), elements: [{ ...noteOf(C4,'half'), tie: 'start' as const }, { ...noteOf(C4,'half'), tie: 'stop' as const }] },
    'a non-120 tempo': { ...emptyScore(), tempo: 92, elements: [noteOf(C4,'quarter')] },
  };
  for (const [name, score] of Object.entries(fixtures)) {
    it(`round-trips: ${name}`, () => {
      expect(musicXmlToEditorScore(editorScoreToMusicXML(score))).toEqual(score);
    });
  }
});

describe('musicXmlToEditorScore reads foreign MusicXML', () => {
  it('reads a minimal hand-written file', () => {
    const xml = `<?xml version="1.0"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>V</part-name></score-part></part-list>`
      + `<part id="P1"><measure number="1"><attributes><divisions>480</divisions>`
      + `<key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time>`
      + `<clef><sign>G</sign><line>2</line></clef></attributes>`
      + `<note><pitch><step>C</step><octave>4</octave></pitch><duration>1920</duration><type>whole</type></note></measure></part></score-partwise>`;
    const s = musicXmlToEditorScore(xml);
    expect(s.timeSig).toEqual({ beats: 4, beatType: 4 });
    expect(s.elements).toEqual([noteOf(C4, 'whole')]);
  });

  it('defaults to tempo 120 when no <sound> element is present', () => {
    const xml = `<?xml version="1.0"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>V</part-name></score-part></part-list>`
      + `<part id="P1"><measure number="1"><attributes><divisions>480</divisions>`
      + `<key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time>`
      + `<clef><sign>G</sign><line>2</line></clef></attributes>`
      + `<note><pitch><step>C</step><octave>4</octave></pitch><duration>1920</duration><type>whole</type></note></measure></part></score-partwise>`;
    const s = musicXmlToEditorScore(xml);
    expect(s.tempo).toBe(120);
  });
});
