import { describe, it, expect } from 'vitest';
import {
  chainTopology,
  mapCompParams,
  mapLimiterParams,
  buildMasterChain,
  COMP_KNEE_DB,
  HPF_Q,
  AIR_SHELF_HZ,
} from './masterChain';
import { DEFAULT_MASTERING, type MasteringParams } from '../session';
import { dbToLinear } from '../dsp/faderTaper';

// Node-level tests only — pure adapters + param math. AudioWorkletNode /
// BaseAudioContext can't run in vitest (jsdom/node have no real Web
// Audio implementation), so most of `buildMasterChain` is covered by the
// manual smoke path documented in the task report, not here.
//
// The getPreGainDb/setPreGainDb tests below are the one exception: the
// bypass (`enabled: false`) and degraded (`enabled: true`, worklets
// unavailable) topologies never touch AudioWorkletNode and only call
// ctx.createGain/-BiquadFilter/-DynamicsCompressor as plain node
// factories, so a hand-rolled object satisfying that narrow surface
// (no real Web Audio behavior, just `.connect`/`.disconnect`/param
// bags) exercises the real `buildMasterChain` code path without needing
// jsdom or a native AudioContext.
function fakeNode() {
  return { connect: () => {}, disconnect: () => {} };
}
function fakeAudioContext(): BaseAudioContext {
  return {
    audioWorklet: undefined, // -> tryLoadWorklets resolves false without touching addModule
    createGain: () => ({ ...fakeNode(), gain: { value: 1 } }),
    createBiquadFilter: () => ({ ...fakeNode(), type: '', frequency: { value: 0 }, Q: { value: 0 }, gain: { value: 0 } }),
    createDynamicsCompressor: () => ({
      ...fakeNode(), threshold: { value: 0 }, ratio: { value: 0 }, attack: { value: 0 }, release: { value: 0 }, knee: { value: 0 },
    }),
  } as unknown as BaseAudioContext;
}

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

// Spec §3: "Export applies the settled gain." exportRender.ts's
// renderWindow reads this getter right after buildMasterChain and
// forwards the loudness servo's settled dB into the offline chain via
// setPreGainDb — see exportRender.ts. These tests cover the handle's
// half of that contract.
describe('MasterChainHandle.getPreGainDb / setPreGainDb', () => {
  it('defaults to 0 (unity) before any setPreGainDb call', async () => {
    const p: MasteringParams = { ...DEFAULT_MASTERING, enabled: true };
    const handle = await buildMasterChain(fakeAudioContext(), p);
    expect(handle.getPreGainDb()).toBe(0);
  });

  it('getPreGainDb reflects the last value passed to setPreGainDb', async () => {
    const p: MasteringParams = { ...DEFAULT_MASTERING, enabled: true };
    const handle = await buildMasterChain(fakeAudioContext(), p);
    handle.setPreGainDb(-4.5);
    expect(handle.getPreGainDb()).toBe(-4.5);
    handle.setPreGainDb(2);
    expect(handle.getPreGainDb()).toBe(2);
  });

  it('setPreGainDb is a safe no-op (no throw) on a bypass chain (mastering disabled -> no pregain node)', async () => {
    const p: MasteringParams = { ...DEFAULT_MASTERING, enabled: false };
    const handle = await buildMasterChain(fakeAudioContext(), p);
    expect(() => handle.setPreGainDb(-6)).not.toThrow();
    // The dB is still recorded even though there's no node to apply it
    // to — export still wants the value threaded through consistently.
    expect(handle.getPreGainDb()).toBe(-6);
  });

  it('setPreGainDb is a safe no-op (no throw) on a degraded chain (worklets unavailable -> no pregain node)', async () => {
    const p: MasteringParams = { ...DEFAULT_MASTERING, enabled: true };
    const handle = await buildMasterChain(fakeAudioContext(), p);
    expect(handle.degraded).toBe(true); // fakeAudioContext has no audioWorklet
    expect(() => handle.setPreGainDb(3.25)).not.toThrow();
    expect(handle.getPreGainDb()).toBe(3.25);
  });
});
