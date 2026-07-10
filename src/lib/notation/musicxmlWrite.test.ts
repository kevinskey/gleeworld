// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { editorScoreToMusicXML } from './musicxmlWrite';
import { emptyScore, noteOf, restOf } from './model';

const C4 = { step: 'C' as const, octave: 4, alter: 0 };
const FS4 = { step: 'F' as const, octave: 4, alter: 1 };

describe('editorScoreToMusicXML', () => {
  const score = { ...emptyScore(), elements: [noteOf(C4, 'quarter'), noteOf(FS4, 'eighth', 1), restOf('eighth'), noteOf(C4, 'half')] };
  const xml = editorScoreToMusicXML(score);

  it('is a score-partwise document with divisions 480', () => {
    expect(xml).toContain('<score-partwise');
    expect(xml).toContain('<divisions>480</divisions>');
  });
  it('writes attributes once, on the first measure', () => {
    expect((xml.match(/<attributes>/g) || []).length).toBe(1);
    expect(xml).toContain('<sign>G</sign>');       // treble
    expect(xml).toContain('<beats>4</beats>');
  });
  it('encodes a sharp as <alter>1</alter> and a dot as <dot/>', () => {
    expect(xml).toContain('<step>F</step>');
    expect(xml).toContain('<alter>1</alter>');
    expect(xml).toContain('<dot/>');
  });
  it('encodes a rest', () => {
    expect(xml).toContain('<rest/>');
  });
  it('is well-formed XML (parses without error)', () => {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    expect(doc.getElementsByTagName('parsererror').length).toBe(0);
  });
});

describe('editorScoreToMusicXML — empty score', () => {
  const xml = editorScoreToMusicXML(emptyScore());

  it('still emits divisions, key, time, and clef via the single empty measure', () => {
    expect(xml).toContain('<divisions>480</divisions>');
    expect(xml).toContain('<sign>G</sign>');
    expect(xml).toContain('<beats>4</beats>');
    expect((xml.match(/<attributes>/g) || []).length).toBe(1);
  });
});

describe('editorScoreToMusicXML — tie round-trip', () => {
  const score = {
    ...emptyScore(),
    elements: [
      { ...noteOf(C4, 'quarter'), tie: 'start' as const },
      { ...noteOf(C4, 'quarter'), tie: 'stop' as const },
    ],
  };
  const xml = editorScoreToMusicXML(score);

  it('encodes both <tie> and <tied> start/stop pairs', () => {
    expect(xml).toContain('<tie type="start"/>');
    expect(xml).toContain('<tie type="stop"/>');
    expect(xml).toContain('<tied type="start"/>');
    expect(xml).toContain('<tied type="stop"/>');
  });
});
