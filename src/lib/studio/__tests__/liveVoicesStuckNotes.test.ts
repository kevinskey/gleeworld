// Stuck-note regressions for the live MIDI monitor.
//
// 1) Duplicate note-on stacking: Komplete Kontrol hardware echoes every key
//    press on 2–3 ports, and the Studio subscribes to "All MIDI inputs" —
//    so ONE press arrives as 2–3 note-ons but only ONE note-off. Each extra
//    attack used to stack an unreleased voice that rang forever.
// 2) Instrument switch mid-note: disposeInst must silence voices (releaseAll)
//    before dispose so nothing can survive the swap still ringing.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls = vi.hoisted(() => ({
  attacks: [] as string[],
  releases: [] as string[],
  releaseAlls: 0,
  disposes: 0,
}));

vi.mock('tone', () => {
  class MockParam { value = 0; }
  class MockNode {
    volume = new MockParam();
    pan = new MockParam();
    gain = new MockParam();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(..._args: any[]) {}
    connect() { return this; }
    disconnect() { return this; }
    dispose() {}
  }
  class PolySynth extends MockNode {
    triggerAttack(n: string) { calls.attacks.push(n); }
    triggerRelease(n: string) { calls.releases.push(n); }
    triggerAttackRelease() {}
    releaseAll() { calls.releaseAlls++; }
    dispose() { calls.disposes++; }
  }
  return {
    PanVol: MockNode,
    Gain: MockNode,
    BiquadFilter: MockNode,
    PolySynth,
    Synth: MockNode,
    Sampler: MockNode,
    MembraneSynth: MockNode,
    NoiseSynth: MockNode,
    MetalSynth: MockNode,
    getDestination: () => new MockNode(),
    now: () => 100.1,
    immediate: () => 100.0,
  };
});

import { LiveVoices } from '../engine/liveVoices';
import type { Instrument } from '../session';

const SYNTH: Instrument = { type: 'synth_basic', preset_id: 'sine', params: {} } as Instrument;

beforeEach(() => {
  calls.attacks.length = 0;
  calls.releases.length = 0;
  calls.releaseAlls = 0;
  calls.disposes = 0;
});

describe('LiveVoices stuck-note protection', () => {
  it('a duplicate note-on releases the held voice before re-attacking — attacks never outnumber releases after note-off', () => {
    const lv = new LiveVoices();
    lv.setInstrument(SYNTH);
    // One physical press echoed on three ports:
    lv.noteOn(60, 0.8);
    lv.noteOn(60, 0.8);
    lv.noteOn(60, 0.8);
    // One physical release (only the first port's note-off matters —
    // held.delete makes the others no-ops):
    lv.noteOff(60);
    expect(calls.attacks).toHaveLength(3);
    // 2 pre-attack safety releases + 1 real note-off = every attack paired.
    expect(calls.releases).toHaveLength(3);
  });

  it('does not touch other held pitches when deduping one', () => {
    const lv = new LiveVoices();
    lv.setInstrument(SYNTH);
    lv.noteOn(60, 0.8);
    lv.noteOn(64, 0.8);
    lv.noteOn(60, 0.8); // echo of 60 only
    expect(calls.releases).toEqual(['C4']); // only the duplicated pitch released
  });

  it('setInstrument silences the old instrument (releaseAll) before disposing it', () => {
    const lv = new LiveVoices();
    lv.setInstrument(SYNTH);
    lv.noteOn(60, 0.8); // ringing when the switch happens
    lv.setInstrument({ type: 'synth_basic', preset_id: 'square', params: {} } as Instrument);
    expect(calls.releaseAlls).toBe(1);
    expect(calls.disposes).toBe(1);
  });

  it('dispose() silences before teardown too', () => {
    const lv = new LiveVoices();
    lv.setInstrument(SYNTH);
    lv.noteOn(60, 0.8);
    lv.dispose();
    expect(calls.releaseAlls).toBe(1);
    expect(calls.disposes).toBe(1);
  });
});
