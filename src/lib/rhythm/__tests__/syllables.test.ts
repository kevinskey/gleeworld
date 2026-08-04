import { describe, it, expect } from 'vitest';
import { labelPattern } from '../syllables';
import type { RhythmPattern, Meter } from '../pattern';

const p = (meter: Meter, evs: Array<[number, number, string, boolean?]>): RhythmPattern => ({
  meter,
  pulsesPerMeasure: meter.beatType === 8 && meter.beats === 6 ? 2 : meter.beats,
  measures: 1,
  events: evs.map(([startPulse, durPulses, value, rest]) => ({ startPulse, durPulses, value: value as never, rest: !!rest })),
  totalPulses: evs.reduce((s, e) => s + e[1], 0),
});

describe('labelPattern', () => {
  const simple = p({ beats: 2, beatType: 4 }, [[0, 1, 'q'], [1, 0.5, 'e'], [1.5, 0.5, 'e']]);
  it('takadimi simple: ta / ta di', () => {
    expect(labelPattern(simple, 'takadimi')).toEqual(['ta', 'ta', 'di']);
  });
  it('kodaly simple: ta / ti ti', () => {
    expect(labelPattern(simple, 'kodaly')).toEqual(['ta', 'ti', 'ti']);
  });
  it('counting simple: 1 / 2 &', () => {
    expect(labelPattern(simple, 'counting')).toEqual(['1', '2', '&']);
  });
  const sixteenths = p({ beats: 1, beatType: 4 }, [[0, 0.25, 's'], [0.25, 0.25, 's'], [0.5, 0.25, 's'], [0.75, 0.25, 's']]);
  it('takadimi sixteenths: ta ka di mi', () => {
    expect(labelPattern(sixteenths, 'takadimi')).toEqual(['ta', 'ka', 'di', 'mi']);
  });
  it('counting sixteenths: 1 e & a', () => {
    expect(labelPattern(sixteenths, 'counting')).toEqual(['1', 'e', '&', 'a']);
  });
  const compound = p({ beats: 6, beatType: 8 }, [[0, 1 / 3, 'e'], [1 / 3, 1 / 3, 'e'], [2 / 3, 1 / 3, 'e'], [1, 1, 'q.']]);
  it('takadimi compound: ta ki da / ta', () => {
    expect(labelPattern(compound, 'takadimi')).toEqual(['ta', 'ki', 'da', 'ta']);
  });
  it('counting compound: 1 la li / 2', () => {
    expect(labelPattern(compound, 'counting')).toEqual(['1', 'la', 'li', '2']);
  });
  it('rests label as empty string', () => {
    const withRest = p({ beats: 2, beatType: 4 }, [[0, 1, 'q'], [1, 1, 'q', true]]);
    expect(labelPattern(withRest, 'takadimi')).toEqual(['ta', '']);
  });
});
