// Live monitoring must trigger at Tone.immediate() (context.currentTime),
// NOT Tone.now() (currentTime + lookAhead, default 0.1s) — the lookahead
// is pure added latency for a live key-press. Regression for the
// 100ms-monitoring-latency bug.
import { describe, it, expect, vi } from 'vitest';

const calls = vi.hoisted(() => ({
  attacks: [] as Array<{ time: number }>,
  releases: [] as Array<{ time: number }>,
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
    triggerAttack(_n: string, time: number) { calls.attacks.push({ time }); }
    triggerRelease(_n: string, time: number) { calls.releases.push({ time }); }
    triggerAttackRelease() {}
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
    now: () => 100.1,        // currentTime + lookAhead
    immediate: () => 100.0,  // currentTime
  };
});

import { LiveVoices } from '../engine/liveVoices';
import type { Instrument } from '../session';

describe('LiveVoices latency', () => {
  it('triggers attack and release at Tone.immediate(), not Tone.now()', () => {
    const lv = new LiveVoices();
    lv.setInstrument({ type: 'synth_basic', preset_id: 'sine', params: {} } as Instrument);
    lv.noteOn(60, 0.8);
    lv.noteOff(60);
    expect(calls.attacks[0].time).toBe(100.0);
    expect(calls.releases[0].time).toBe(100.0);
  });

  it('pedal-up releases sustained notes at immediate time', () => {
    calls.releases.length = 0;
    const lv = new LiveVoices();
    lv.setInstrument({ type: 'synth_basic', preset_id: 'sine', params: {} } as Instrument);
    lv.sustain(true);
    lv.noteOn(64, 0.8);
    lv.noteOff(64);            // damper holds — no release yet
    expect(calls.releases.length).toBe(0);
    lv.sustain(false);
    expect(calls.releases[0].time).toBe(100.0);
  });
});
