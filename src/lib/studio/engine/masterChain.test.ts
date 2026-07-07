import { describe, it, expect } from 'vitest';
import {
  chainTopology,
  mapCompParams,
  mapLimiterParams,
  COMP_KNEE_DB,
  HPF_Q,
  AIR_SHELF_HZ,
} from './masterChain';
import { DEFAULT_MASTERING, type MasteringParams } from '../session';
import { dbToLinear } from '../dsp/faderTaper';

// Node-level tests only — pure adapters + param math. AudioWorkletNode /
// BaseAudioContext can't run in vitest (jsdom/node have no real Web
// Audio implementation), so `buildMasterChain` itself is covered by the
// manual smoke path documented in the task report, not here.

describe('chainTopology', () => {
  it('mastering disabled -> empty (bypass, no DSP nodes)', () => {
    const p: MasteringParams = { ...DEFAULT_MASTERING, enabled: false };
    expect(chainTopology(p, true)).toEqual([]);
    expect(chainTopology(p, false)).toEqual([]);
  });

  it('enabled + worklets failed to load -> degraded (HPF/shelf/comp only)', () => {
    const p: MasteringParams = { ...DEFAULT_MASTERING, enabled: true };
    expect(chainTopology(p, false)).toEqual(['hpf', 'shelf', 'comp']);
  });

  it('enabled + worklets loaded -> full chain incl. pregain/limiter/meter', () => {
    const p: MasteringParams = { ...DEFAULT_MASTERING, enabled: true };
    expect(chainTopology(p, true)).toEqual(['hpf', 'shelf', 'comp', 'pregain', 'limiter', 'meter']);
  });
});

describe('mapCompParams', () => {
  it('maps canonical attack_ms/release_ms straight to seconds (documented no-correction-factor)', () => {
    const mapped = mapCompParams({ threshold_db: -18, ratio: 2, attack_ms: 10, release_ms: 250 });
    expect(mapped.attack).toBeCloseTo(0.01, 10);
    expect(mapped.release).toBeCloseTo(0.25, 10);
  });

  it('passes threshold/ratio through unchanged', () => {
    const mapped = mapCompParams({ threshold_db: -18, ratio: 2, attack_ms: 10, release_ms: 250 });
    expect(mapped.threshold).toBe(-18);
    expect(mapped.ratio).toBe(2);
  });

  it('knee is always the fixed B1 constant (12), not user-configurable', () => {
    const mapped = mapCompParams(DEFAULT_MASTERING.comp);
    expect(mapped.knee).toBe(12);
    expect(mapped.knee).toBe(COMP_KNEE_DB);
  });
});

describe('mapLimiterParams', () => {
  it('ceiling maps via dbToLinear (the same taper conversion as faders)', () => {
    const mapped = mapLimiterParams({ ceiling_db: -1, release_ms: 200 });
    expect(mapped.ceilingLinear).toBeCloseTo(dbToLinear(-1), 10);
    expect(mapped.ceilingLinear).toBeLessThan(1);
    expect(mapped.ceilingLinear).toBeGreaterThan(0.89);
  });

  it('DEFAULT_MASTERING ceiling (-1 dB) round-trips through dbToLinear correctly', () => {
    const mapped = mapLimiterParams(DEFAULT_MASTERING.limiter);
    expect(mapped.ceilingLinear).toBeCloseTo(0.8912509381337456, 10);
  });

  it('release passes through in ms — the worklet computes its own exp coefficient', () => {
    const mapped = mapLimiterParams({ ceiling_db: -3, release_ms: 400 });
    expect(mapped.releaseMs).toBe(400);
  });

  it('0 dBFS ceiling maps to exactly linear 1', () => {
    expect(mapLimiterParams({ ceiling_db: 0, release_ms: 200 }).ceilingLinear).toBe(1);
  });
});

describe('fixed B1 constants', () => {
  it('HPF Q and air-shelf frequency match the spec', () => {
    expect(HPF_Q).toBe(0.707);
    expect(AIR_SHELF_HZ).toBe(8000);
  });
});
