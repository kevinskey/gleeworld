// Regression test for metronome/transport phase-lock: the click is a
// Tone.Transport scheduleRepeat, so it must be re-anchored whenever the
// transport jumps — the loop watchdog's stop()→seconds=loopStart→start()
// wrap in particular — or its next fire stays on the pre-jump timeline
// and the click lands off the downbeat (or goes silent) on every repeat.
//
// The engine is exercised against a scripted Tone mock: fake timers
// drive the loop watchdog while the test advances the mock transport
// clock 25ms per tick and fires due transport events, mirroring real
// playback.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const recorded = vi.hoisted(() => ({
  clicks: [] as Array<{ t: number; accent: boolean }>,
  // Every write to transport.seconds while the clock was stopped —
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
  interface RepeatEvent { id: number; cb: (time: number) => void; interval: number; next: number }
  const transport = {
    _seconds: 0,
    started: false,
    loop: false,
    bpm: { value: 120 },
    timeSignature: [4, 4] as unknown,
    _nextId: 10,
    _repeats: [] as RepeatEvent[],
    get seconds() { return this._seconds; },
    set seconds(v: number) {
      if (!this.started && v === 0 && Date.now() > 0) recorded.wraps.push(Date.now());
      this._seconds = v;
    },
    start() { this.started = true; },
    stop() { this.started = false; },
    pause() { this.started = false; },
    schedule() { return this._nextId++; },
    scheduleRepeat(cb: (time: number) => void, interval: number, startTime?: number) {
      const id = this._nextId++;
      this._repeats.push({ id, cb, interval, next: startTime ?? this._seconds });
      return id;
    },
    clear(id: number) { this._repeats = this._repeats.filter((r) => r.id !== id); },
    cancel() { this._repeats = []; },
    /** Test hook: fire every repeat due at or before the current
     * transport position — what Tone's clock does as time passes. */
    fireDue() {
      if (!this.started) return;
      for (const r of [...this._repeats]) {
        while (this._repeats.includes(r) && r.next <= this._seconds + 1e-9) {
          r.cb(this._seconds);
          r.next += r.interval;
        }
      }
    },
  };
  return {
    Gain: MockNode,
    Panner: MockNode,
    Limiter: MockNode,
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

type MockTransport = { _seconds: number; started: boolean; fireDue(): void };
const transport = () => Tone.getTransport() as unknown as MockTransport;

describe('loop wrap re-anchors the transport-scheduled metronome', () => {
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
    // 120 BPM → 500ms beat. Loop length 1.25s (2.5 beats) so a click
    // still anchored to the pre-wrap timeline is guaranteed off-phase
    // after one wrap.
    engine.updateTransport({ loop: { enabled: true, start: 0, end: 1.25 } });
    engine.setMetronome(true);
    engine.play();

    // Simulate ~4s of playback: each 25ms tick fires due transport
    // events at the current position, advances the transport clock,
    // then lets fake timers run the loop watchdog. (Long enough that
    // every wrap under test has its next beat inside the window.)
    for (let t = 0; t < 4000; t += 25) {
      if (transport().started) {
        transport().fireDue();
        transport()._seconds += 0.025;
      }
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
      // from the pre-wrap anchor in between.
      const between = recorded.clicks.filter((c) => c.t > w && c.t < w + 500);
      expect(
        between,
        `stray off-phase click(s) after wrap t=${w}ms`,
      ).toEqual([]);
      expect(recorded.clicks.some((c) => c.t === w + 500)).toBe(true);
    }
  });

  it('a seek while playing re-anchors the click at the new position', () => {
    const engine = new StudioEngine();
    engine.setMetronome(true);
    engine.play();

    // Run 1s: clicks at 0, 500, 1000.
    for (let t = 0; t < 1000; t += 25) {
      transport().fireDue();
      transport()._seconds += 0.025;
      vi.advanceTimersByTime(25);
    }
    recorded.clicks.length = 0;

    // Jump back to 0.1s. The repeat must follow the head, not stay
    // anchored at the old timeline position (~1.5s next fire).
    engine.seek(0.1);
    transport()._seconds = 0.1;

    for (let t = 1000; t < 1800; t += 25) {
      transport().fireDue();
      transport()._seconds += 0.025;
      vi.advanceTimersByTime(25);
    }
    // Re-anchoring fires beat 1 at the seek instant (t=1000ms), and the
    // next beat lands exactly one period later (t=1500ms) — not at the
    // pre-seek anchor's next slot.
    expect(recorded.clicks.some((c) => c.accent && c.t === 1000)).toBe(true);
    expect(recorded.clicks.some((c) => c.t === 1500)).toBe(true);
    expect(recorded.clicks.filter((c) => c.t > 1000 && c.t < 1500)).toEqual([]);
  });
});
