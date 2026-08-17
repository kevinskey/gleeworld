// The grouped instrument catalog behind the collapsible picker.
import { describe, it, expect } from 'vitest';
import { buildInstrumentGroups, filterGroups } from '../InstrumentPicker';

describe('buildInstrumentGroups', () => {
  const groups = buildInstrumentGroups();

  it('leads with Studio, then Synth & Basic, then the GM families', () => {
    expect(groups[0].label).toBe('Studio');
    expect(groups[1].label).toBe('Synth & Basic');
    expect(groups.length).toBeGreaterThan(5);
  });

  it('keeps the exact value contract the old <select> had', () => {
    const studio = groups[0].items.map((i) => i.value);
    expect(studio).toContain('sampler:gw:grand_piano');
    expect(studio).toContain('sampler:gw:bass_808');
    expect(groups[1].items.map((i) => i.value)).toContain('synth_basic:sine');
    const all = groups.flatMap((g) => g.items.map((i) => i.value));
    expect(all).toContain('sampler:gm:bright_acoustic_piano');
    // Every value splits on the FIRST colon into a known type.
    for (const v of all) {
      expect(['sampler', 'synth_basic']).toContain(v.slice(0, v.indexOf(':')));
    }
  });

  it('has no duplicate values', () => {
    const all = groups.flatMap((g) => g.items.map((i) => i.value));
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('filterGroups', () => {
  const groups = buildInstrumentGroups();
  it('matches case-insensitively across every group and drops empty groups', () => {
    const hit = filterGroups(groups, 'piAno');
    expect(hit.length).toBeGreaterThan(0);
    for (const g of hit) {
      expect(g.items.length).toBeGreaterThan(0);
      for (const i of g.items) expect(i.label.toLowerCase()).toContain('piano');
    }
  });
  it('empty query returns everything unchanged', () => {
    expect(filterGroups(groups, '  ')).toBe(groups);
  });
});
