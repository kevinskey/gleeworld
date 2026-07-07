// Per-track EQ pure helpers (B1 task 5). Hermetic — no Tone, no
// AudioContext — matching the engine test suites' no-real-audio policy.
// The live BiquadFilter insertion itself is covered by the manual
// verification steps in .superpowers/sdd/task-5-report.md.

import { describe, it, expect } from 'vitest';
import { eqBandToBiquadOptions, enabledEqBands, trackEqSig } from './trackEq';
import type { TrackEqBand } from '../session';

const band = (over: Partial<TrackEqBand> = {}): TrackEqBand => ({
  type: 'peaking',
  freq_hz: 1000,
  gain_db: 3,
  q: 1.41,
  enabled: true,
  ...over,
});

describe('eqBandToBiquadOptions', () => {
  it('maps canonical fields 1:1 — canonical q IS Web Audio Q for these RBJ types', () => {
    const o = eqBandToBiquadOptions(band({ type: 'peaking', freq_hz: 2500, gain_db: -4.5, q: 0.9 }));
    expect(o).toEqual({ type: 'peaking', frequency: 2500, gain: -4.5, Q: 0.9 });
  });

  it('passes every supported band type through unchanged', () => {
    for (const type of ['highpass', 'lowshelf', 'peaking', 'highshelf'] as const) {
      expect(eqBandToBiquadOptions(band({ type })).type).toBe(type);
    }
  });
});

describe('enabledEqBands', () => {
  it('undefined eq (legacy pre-B1 session) -> no bands, no crash', () => {
    expect(enabledEqBands(undefined)).toEqual([]);
  });

  it('filters out disabled bands but preserves the order of enabled ones', () => {
    const a = band({ freq_hz: 60, type: 'highpass' });
    const b = band({ freq_hz: 1000, enabled: false });
    const c = band({ freq_hz: 8000, type: 'highshelf' });
    expect(enabledEqBands([a, b, c])).toEqual([a, c]);
  });
});

describe('trackEqSig (skeleton-diff signature)', () => {
  it('undefined and empty eq share the empty signature (no spurious rebuild on legacy load)', () => {
    expect(trackEqSig(undefined)).toBe('');
    expect(trackEqSig([])).toBe('');
  });

  it('changes when any band param changes', () => {
    const base = trackEqSig([band()]);
    expect(trackEqSig([band({ freq_hz: 1001 })])).not.toBe(base);
    expect(trackEqSig([band({ gain_db: 4 })])).not.toBe(base);
    expect(trackEqSig([band({ q: 2 })])).not.toBe(base);
    expect(trackEqSig([band({ type: 'highshelf' })])).not.toBe(base);
  });

  it('changes on enable-toggle, add, remove, and reorder', () => {
    const a = band({ freq_hz: 60, type: 'highpass' });
    const b = band({ freq_hz: 8000, type: 'highshelf' });
    const both = trackEqSig([a, b]);
    expect(trackEqSig([{ ...a, enabled: false }, b])).not.toBe(both);
    expect(trackEqSig([a])).not.toBe(both);
    expect(trackEqSig([a, b, band()])).not.toBe(both);
    expect(trackEqSig([b, a])).not.toBe(both);
  });

  it('is stable for identical inputs', () => {
    expect(trackEqSig([band()])).toBe(trackEqSig([band()]));
  });
});
