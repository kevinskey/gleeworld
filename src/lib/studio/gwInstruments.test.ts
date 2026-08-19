import { describe, expect, it } from 'vitest';
import {
  GW_BY_NAME, GW_INSTRUMENTS, GW_SAMPLE_BASE,
  fromGwPresetId, gwLayerIndexForVelocity, gwManifestUrl, gwSampleRelForFormat, gwSampleUrl,
  pickGwSampleFormat, toGwPresetId,
} from './gwInstruments';

describe('gwInstruments catalog', () => {
  it('has unique names and labels', () => {
    const names = GW_INSTRUMENTS.map((g) => g.name);
    expect(new Set(names).size).toBe(names.length);
    const labels = GW_INSTRUMENTS.map((g) => g.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it('names are valid folder names (lowercase snake_case)', () => {
    for (const g of GW_INSTRUMENTS) expect(g.name).toMatch(/^[a-z0-9_]+$/);
  });

  it('includes the six drum kits as kind=kit', () => {
    const kits = GW_INSTRUMENTS.filter((g) => g.kind === 'kit').map((g) => g.name);
    expect(kits).toEqual(['kit_studio', 'kit_rock', 'kit_jazz', 'kit_808', 'kit_trap', 'kit_909']);
  });

  it('bass_808 is pitched with a GM fallback (a pitched instrument without one would fall back to the basic KIT)', () => {
    const b = GW_INSTRUMENTS.find((g) => g.name === 'bass_808');
    expect(b?.kind).toBe('pitched');
    expect(b?.gmFallback).toBe('synth_bass_2');
  });

  it('GW_BY_NAME indexes every instrument', () => {
    for (const g of GW_INSTRUMENTS) expect(GW_BY_NAME[g.name]).toBe(g);
  });
});

describe('gw preset ids', () => {
  it('round-trips', () => {
    expect(fromGwPresetId(toGwPresetId('grand_piano'))).toBe('grand_piano');
  });

  it('rejects non-gw ids', () => {
    expect(fromGwPresetId('gm:violin')).toBeNull();
    expect(fromGwPresetId('kit_basic')).toBeNull();
    expect(fromGwPresetId(undefined)).toBeNull();
  });
});

describe('sample URLs', () => {
  it('manifest and sample URLs live under the instrument folder', () => {
    expect(gwManifestUrl('violin')).toBe(`${GW_SAMPLE_BASE}/violin/manifest.json`);
    expect(gwSampleUrl('violin', 'l1/C4.mp3')).toBe(`${GW_SAMPLE_BASE}/violin/l1/C4.mp3`);
  });

  it('honors a dir override (grand_piano v2 lives in its own immutable folder)', () => {
    expect(GW_BY_NAME['grand_piano'].dir).toBe('grand_piano_v2');
    expect(gwManifestUrl('grand_piano')).toBe(`${GW_SAMPLE_BASE}/grand_piano_v2/manifest.json`);
    expect(gwSampleUrl('grand_piano', 'l1/C4.mp3')).toBe(`${GW_SAMPLE_BASE}/grand_piano_v2/l1/C4.mp3`);
  });

  it('percent-encodes sharps so "#" cannot start a URL fragment', () => {
    expect(gwSampleUrl('violin', 'l0/C#4.mp3')).toBe(`${GW_SAMPLE_BASE}/violin/l0/C%234.mp3`);
    expect(gwSampleUrl('grand_piano', 'rel/F#2.mp3')).toBe(`${GW_SAMPLE_BASE}/grand_piano_v2/rel/F%232.mp3`);
  });

  it('rewrites .mp3 → .webm only for the webm format', () => {
    expect(gwSampleRelForFormat('l0/C#4.mp3', 'webm')).toBe('l0/C#4.webm');
    expect(gwSampleRelForFormat('l0/C#4.mp3', 'mp3')).toBe('l0/C#4.mp3');
  });

  it('falls back to mp3 without decode support or a webm listing', () => {
    // jsdom has no OfflineAudioContext, so the probe can never pass here.
    expect(pickGwSampleFormat({ formats: ['mp3', 'webm'] })).toBe('mp3');
    expect(pickGwSampleFormat({})).toBe('mp3');
  });

  it('every pitched instrument has a GM fallback; kits have none', () => {
    for (const g of GW_INSTRUMENTS) {
      if (g.kind === 'pitched') expect(g.gmFallback, g.name).toBeTruthy();
      else expect(g.gmFallback, g.name).toBeUndefined();
    }
  });
});

describe('gwLayerIndexForVelocity', () => {
  const layers = [{ maxVel: 42 }, { maxVel: 84 }, { maxVel: 127 }];

  it('routes each velocity to the first covering layer', () => {
    expect(gwLayerIndexForVelocity(layers, 1)).toBe(0);
    expect(gwLayerIndexForVelocity(layers, 42)).toBe(0);
    expect(gwLayerIndexForVelocity(layers, 43)).toBe(1);
    expect(gwLayerIndexForVelocity(layers, 84)).toBe(1);
    expect(gwLayerIndexForVelocity(layers, 85)).toBe(2);
    expect(gwLayerIndexForVelocity(layers, 127)).toBe(2);
  });

  it('clamps velocities past the last maxVel to the top layer', () => {
    expect(gwLayerIndexForVelocity([{ maxVel: 60 }, { maxVel: 100 }], 127)).toBe(1);
  });

  it('single-layer instruments always use layer 0', () => {
    expect(gwLayerIndexForVelocity([{ maxVel: 127 }], 1)).toBe(0);
    expect(gwLayerIndexForVelocity([{ maxVel: 127 }], 127)).toBe(0);
  });
});
