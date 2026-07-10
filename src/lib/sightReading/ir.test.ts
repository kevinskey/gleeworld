import { describe, it, expect } from 'vitest';
import { parsedScoreToIR, midiToSolfege } from './ir';
import type { ParsedScore } from './musicXMLParser';

const C4 = 261.63, D4 = 293.66, E4 = 329.63;

const score: ParsedScore = {
  tempo: 120,                                  // 120bpm => 1 beat = 0.5s
  timeSignature: { beats: 4, beatType: 4 },
  totalDuration: 1.5,
  measures: [{ number: 1, notes: [
    { step: 'C', octave: 4, frequency: C4, startTime: 0,   duration: 0.5 },
    { step: 'D', octave: 4, frequency: D4, startTime: 0.5, duration: 0.5 },
    { step: 'E', octave: 4, frequency: E4, startTime: 1.0, duration: 0.5 },
  ]}],
};

describe('parsedScoreToIR', () => {
  it('converts seconds to beats using the tempo', () => {
    const ir = parsedScoreToIR(score, 'C', 'major');
    expect(ir.notes.map(n => n.beatPos)).toEqual([0, 1, 2]);
    expect(ir.notes.map(n => n.durationBeats)).toEqual([1, 1, 1]);
  });
  it('derives MIDI from frequency', () => {
    const ir = parsedScoreToIR(score, 'C', 'major');
    expect(ir.notes.map(n => n.midi)).toEqual([60, 62, 64]);
  });
  it('labels solfege relative to the tonic, not to C', () => {
    const ir = parsedScoreToIR(score, 'C', 'major');
    expect(ir.notes.map(n => n.solfege)).toEqual(['do', 're', 'mi']);
  });
});

describe('midiToSolfege', () => {
  it('is movable-do: the tonic is always "do"', () => {
    expect(midiToSolfege(67, 67)).toBe('do');   // G major, G = do
    expect(midiToSolfege(69, 67)).toBe('re');
    expect(midiToSolfege(71, 67)).toBe('mi');
  });
  it('is octave-invariant', () => {
    expect(midiToSolfege(60, 60)).toBe('do');
    expect(midiToSolfege(72, 60)).toBe('do');
  });
  it('names the chromatic tendency tones', () => {
    expect(midiToSolfege(66, 60)).toBe('fi');   // raised 4
    expect(midiToSolfege(61, 60)).toBe('ra');   // lowered 2
  });
});
