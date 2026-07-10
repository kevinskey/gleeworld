import { describe, it, expect } from 'vitest';
import { DIVISIONS, baseTicks, dottedTicks, musicXmlType, ticksToDur } from './duration';

describe('duration', () => {
  it('quarter = one division-unit', () => {
    expect(DIVISIONS).toBe(480);
    expect(baseTicks('quarter')).toBe(480);
    expect(baseTicks('whole')).toBe(1920);
    expect(baseTicks('eighth')).toBe(240);
    expect(baseTicks('32nd')).toBe(60);
  });
  it('a dot adds half; two dots add three-quarters', () => {
    expect(dottedTicks('quarter', 1)).toBe(720);   // 480 + 240
    expect(dottedTicks('half', 1)).toBe(1440);      // 960 + 480
    expect(dottedTicks('quarter', 2)).toBe(840);    // 480 + 240 + 120
    expect(dottedTicks('quarter', 0)).toBe(480);
  });
  it('maps base durations to MusicXML <type> names', () => {
    expect(musicXmlType('16th')).toBe('16th');
    expect(musicXmlType('whole')).toBe('whole');
  });
  it('inverts ticks back to base + dots for clean values', () => {
    expect(ticksToDur(720)).toEqual({ base: 'quarter', dots: 1 });
    expect(ticksToDur(480)).toEqual({ base: 'quarter', dots: 0 });
    expect(ticksToDur(1920)).toEqual({ base: 'whole', dots: 0 });
  });
  it('returns null for a tick count that is not a base+dots value', () => {
    expect(ticksToDur(500)).toBeNull();
    expect(ticksToDur(0)).toBeNull();
  });
});
