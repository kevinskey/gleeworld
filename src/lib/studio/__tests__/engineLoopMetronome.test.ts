// Regression test for the loop-repeat metronome drift: the click is a
// wall-clock setInterval, so when the loop watchdog wraps the transport
// back to loopStart the interval must be re-phased or the click keeps
// its old phase and drifts further off the downbeat on every repeat.
//
// The engine is exercised against a scripted Tone mock: fake timers
// drive the watchdog/metronome intervals while the test advances the
// mock transport clock 25ms per tick, mirroring real playback.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const recorded = vi.hoisted(() => ({
  clicks: [] as Array<{ t: number; accent: boolean }>,
  // Every write to transport.seconds while the clock was running —
  // the loop watchdog's stop()→seconds=loopStart→start() lands here.
  wraps: [] as number[],
}));

vi.mock('tone', () => {
  class MockParam {
    value = 0;
    cancelScheduledValues() {}
    linearRampTo() {}
  }
  class MockNode {
    gain = new MockParam();
    pan = new MockParam();
    volume = new MockParam();
    connect() { return this; }
    disconnect() { return this; }
    dispose() {}
    toDestination() { return this; }
  }
  class Meter extends MockNode {
    getValue() { return [-Infinity, -Infinity]; }
  }
  class Synth extends MockNode {
    triggerAttackRelease(note: string) {
      recorded.clicks.push({ t: Date.now(), accent: note === 'A5' });
    }
  }
  const transport = {
    _seconds: 0,
    started: false,
    loop: false,
    bpm: { value: 120 },
    timeSignature: [4, 4] as unknown,
    get seconds() { return this._seconds; },
    set seconds(v: number) {
      if (!this.started && v === 0 && Date.now() > 0) recorded.wraps.push(Date.now());
      this._seconds = v;
    },
    start() { this.started = true; },
    stop() { this.started = false; },
    pause() { this.started = false; },
    schedule() { return 1; },
    clear() {},
  };
  return {
    Gain: MockNode,
    Panner: MockNode,
    Meter,
    Synth,
    Player: MockNode,
    getTransport: () => transport,
    getContext: () => ({
      sampleRate: 48000,
      rawContext: { resume: () => {}, destination: {} },
      createAudioWorkletNode: () => ({}),
    }),
    getDestination: () => ({ volume: new MockParam(), mute: false }),
    connect: () => {},
    now: () => Date.now() / 1000,
  };
});

import * as Tone from 'tone';
import { StudioEngine } from '../engine/engine';

type MockTransport = { _seconds: number; started: boolean };
const transport = () => Tone.getTransport() as unknown as MockTransport;

describe('loop wrap re-phases the metronome', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    recorded.clicks.length = 0;
    recorded.wraps.length = 0;
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('clicks re-anchor to the loop start on every repeat instead of drifting', () => {
    const engine = new StudioEngine();
    // 120 BPM → 500ms beat. Loop length 1.25s (2.5 beats) so a
    // free-running click is guaranteed off-phase after one wrap.
    engine.updateTransport({ loop: { enabled: true, start: 0, end: 1.25 } });
    engine.setMetronome(true);
    engine.play();

    // Simulate ~4s of playback: the transport clock advances 25ms per
    // tick while fake timers fire the watchdog + metronome intervals.
    // (Long enough that every wrap under test has its next beat inside
    // the window.)
    for (let t = 0; t < 4000; t += 25) {
      if (transport().started) transport()._seconds += 0.025;
      vi.advanceTimersByTime(25);
    }

    // Only judge wraps whose following beat still falls inside the
    // simulated window.
    const wraps = recorded.wraps.filter((w) => w + 500 <= 4000);
    expect(wraps.length).toBeGreaterThanOrEqual(2);

    for (const w of wraps) {
      // Beat 1 (accent) must fire at the instant of the wrap…
      expect(
        recorded.clicks.some((c) => c.accent && c.t === w),
        `no accent click at wrap t=${w}ms — metronome kept its old phase`,
      ).toBe(true);
      // …and the next click exactly one beat later — no leftover click
      // from the pre-wrap phase in between.
      const between = recorded.clicks.filter((c) => c.t > w && c.t < w + 500);
      expect(
        between,
        `stray off-phase click(s) after wrap t=${w}ms`,
      ).toEqual([]);
      expect(recorded.clicks.some((c) => c.t === w + 500)).toBe(true);
    }
  });
});
