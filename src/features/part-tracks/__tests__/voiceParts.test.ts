import { describe, expect, it } from 'vitest';
import { normalizeVoicePart, voicePartsMatch } from '../voiceParts';

describe('normalizeVoicePart', () => {
  it.each([
    ['soprano', 'S'], ['soprano_1', 'S1'], ['Soprano 2', 'S2'],
    ['S1', 'S1'], ['s2', 'S2'], ['alto', 'A'], ['A2', 'A2'],
    ['tenor_1', 'T1'], ['T1', 'T1'], ['bass', 'B'], ['B2', 'B2'],
    ['baritone', 'B'], ['piano', 'PIANO'], ['other', 'OTHER'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeVoicePart(input)).toBe(expected);
  });
  it('handles null/empty/junk', () => {
    expect(normalizeVoicePart(null)).toBeNull();
    expect(normalizeVoicePart('')).toBeNull();
    expect(normalizeVoicePart('conductor')).toBeNull();
  });
});

describe('voicePartsMatch', () => {
  it('exact and sectionless matches', () => {
    expect(voicePartsMatch('soprano_1', 'S1')).toBe(true);
    expect(voicePartsMatch('soprano', 'S1')).toBe(true);   // section-agnostic role
    expect(voicePartsMatch('S1', 'soprano')).toBe(true);
    expect(voicePartsMatch('S1', 'S2')).toBe(false);
    expect(voicePartsMatch('alto', 'S1')).toBe(false);
    expect(voicePartsMatch(null, 'S1')).toBe(false);
  });
});
