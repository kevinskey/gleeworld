import { describe, it, expect } from 'vitest';
import {
  GM_INSTRUMENTS, GM_GROUPED, GM_FAMILY_ORDER, GM_BY_NAME,
  gmSamplerConfig, toGmPresetId, fromGmPresetId,
} from './gmInstruments';

describe('GM catalog', () => {
  it('has all 128 General MIDI programs', () => {
    expect(GM_INSTRUMENTS).toHaveLength(128);
  });

  it('numbers programs 0..127 with no gaps, in family order', () => {
    expect(GM_INSTRUMENTS.map((g) => g.program)).toEqual(Array.from({ length: 128 }, (_, i) => i));
  });

  it('has 16 families of 8', () => {
    expect(GM_FAMILY_ORDER).toHaveLength(16);
    for (const group of GM_GROUPED) expect(group.instruments).toHaveLength(8);
  });

  it('places known instruments at their canonical program numbers', () => {
    expect(GM_BY_NAME['acoustic_grand_piano'].program).toBe(0);
    expect(GM_BY_NAME['violin'].program).toBe(40);
    expect(GM_BY_NAME['trumpet'].program).toBe(56);
    expect(GM_BY_NAME['flute'].program).toBe(73);
  });

  it('has unique instrument names and human labels', () => {
    const names = new Set(GM_INSTRUMENTS.map((g) => g.name));
    expect(names.size).toBe(128);
    expect(GM_BY_NAME['electric_piano_1'].label).toBe('Electric Piano 1');
    expect(GM_BY_NAME['acoustic_guitar_nylon'].label).toBe('Acoustic Guitar Nylon');
  });
});

describe('sampler config + preset ids', () => {
  it('builds a MusyngKite baseUrl and a flats-based note map', () => {
    const cfg = gmSamplerConfig('violin');
    expect(cfg.baseUrl).toBe('https://gleitz.github.io/midi-js-soundfonts/MusyngKite/violin-mp3/');
    expect(cfg.urls['C3']).toBe('C3.mp3');
    expect(cfg.urls['Eb4']).toBe('Eb4.mp3'); // flats, not sharps
    expect(Object.keys(cfg.urls)).toContain('Gb2');
  });

  it('round-trips the gm: preset id encoding', () => {
    expect(toGmPresetId('cello')).toBe('gm:cello');
    expect(fromGmPresetId('gm:cello')).toBe('cello');
    expect(fromGmPresetId('kit_basic')).toBeNull();
    expect(fromGmPresetId(undefined)).toBeNull();
  });
});
