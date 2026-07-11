import { describe, it, expect } from 'vitest';
import { midiClipToMusicXml, decomposeTicks } from './midiToMusicXml';
import type { MidiClip, MidiNote } from '@/lib/studio/session';

const note = (pitch: number, start: number, dur: number): MidiNote =>
  ({ pitch, velocity: 100, start_seconds: start, duration_seconds: dur });

const clip = (notes: MidiNote[]): MidiClip => ({
  id: 'c1', kind: 'midi', start_seconds: 0, duration_seconds: 8, notes, cc: [],
} as unknown as MidiClip);

// 120bpm 4/4: quarter = 0.5s, 16th tick = 0.125s, measure = 2s = 16 ticks.
const OPTS = { tempoBpm: 120, numerator: 4, denominator: 4, partName: 'Test' };

describe('decomposeTicks', () => {
  it('maps exact symbols', () => {
    expect(decomposeTicks(16)).toEqual([{ ticks: 16, type: 'whole', dots: 0 }]);
    expect(decomposeTicks(6)).toEqual([{ ticks: 6, type: 'quarter', dots: 1 }]);
  });
  it('decomposes odd runs greedily', () => {
    // 5 sixteenths = dotted quarter... no: 5 → quarter(4) + 16th(1)
    expect(decomposeTicks(5)).toEqual([
      { ticks: 4, type: 'quarter', dots: 0 },
      { ticks: 1, type: '16th', dots: 0 },
    ]);
  });
});

describe('midiClipToMusicXml', () => {
  it('renders an empty clip as one whole-measure rest', () => {
    const xml = midiClipToMusicXml(clip([]), OPTS);
    expect(xml).toContain('<rest measure="yes"/>');
    expect(xml.match(/<measure /g)!.length).toBe(1);
  });

  it('quantizes a quarter note at beat 1 and pads the measure with rests', () => {
    const xml = midiClipToMusicXml(clip([note(60, 0, 0.5)]), OPTS);
    expect(xml).toContain('<step>C</step>');
    expect(xml).toContain('<octave>4</octave>');
    expect(xml).toContain('<type>quarter</type>');
    expect(xml).toContain('<rest/>');
  });

  it('groups simultaneous notes into a chord', () => {
    const xml = midiClipToMusicXml(clip([note(60, 0, 0.5), note(64, 0, 0.5), note(67, 0, 0.5)]), OPTS);
    expect(xml.match(/<chord\/>/g)!.length).toBe(2);
  });

  it('ties a note across the measure boundary', () => {
    // Starts at beat 4 (1.5s), lasts a half note (1s) → crosses the barline.
    const xml = midiClipToMusicXml(clip([note(62, 1.5, 1.0)]), OPTS);
    expect(xml).toContain('<tie type="start"/>');
    expect(xml).toContain('<tie type="stop"/>');
    expect(xml.match(/<measure /g)!.length).toBe(2);
  });

  it('truncates an overlap into the next onset (single-voice flatten)', () => {
    // First note 2s long, second starts 0.5s in — first must shrink to a quarter.
    const xml = midiClipToMusicXml(clip([note(60, 0, 2.0), note(62, 0.5, 0.5)]), OPTS);
    const first = xml.slice(xml.indexOf('<note>'), xml.indexOf('</note>'));
    expect(first).toContain('<duration>4</duration>');
  });

  it('uses bass clef for low material and escapes the part name', () => {
    const xml = midiClipToMusicXml(clip([note(40, 0, 0.5)]), { ...OPTS, partName: 'Bass & Cello' });
    expect(xml).toContain('<sign>F</sign>');
    expect(xml).toContain('Bass &amp; Cello');
  });

  it('spells black keys as sharps', () => {
    const xml = midiClipToMusicXml(clip([note(61, 0, 0.5)]), OPTS);
    expect(xml).toContain('<step>C</step><alter>1</alter>');
  });
});
