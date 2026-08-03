// Engine test suite for MIDI note scheduling — the coverage gap the
// audit flagged: neither the "replay" contract (transport.schedule()
// events are PERSISTENT — once:false — so they must re-fire after a
// stop()+play() with no session edit) nor the trim clamp (D1) nor the
// dispose cleanup path had a regression test before this file. D2's
// pause() releaseAll() got its own guard in enginePausePlayers.test.ts;
// this file extends that coverage to stop() and seek(), and adds the
// scheduling-lifecycle tests around it.
//
// Mock skeleton copied from enginePausePlayers.test.ts (same MockParam/
// MockNode/Player/PolySynth/transport shapes) and extended with a
// controllable transport timeline: `fireUpTo(seconds)` invokes every
// persisted schedule() event with `at <= seconds`, in time order,
// WITHOUT removing them afterward — that's the real Tone.Transport
// semantics for `schedule()` (as opposed to the one-shot
// `scheduleOnce()`, which the engine doesn't use for MIDI notes) and is
// exactly what makes replay work. `cancel()`/`clear()` calls are also
// recorded on `transportSpy` so dispose can be asserted against without
// reaching into the engine's private per-track closures.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const synths = vi.hoisted(() => ({
  all: [] as Array<{
    released: number;
    attackReleaseCalls: number;
    lastDuration: number | undefined;
  }>,
}));

const transportSpy = vi.hoisted(() => ({
  cancelCalls: 0,
  clearedIds: [] as number[],
  scheduledIds: [] as number[],
}));

vi.mock('tone', () => {
  class MockParam {
    value = 0;
    cancelScheduledValues() {}
    linearRampTo() {}
    rampTo() {}
    setValueAtTime() {}
  }
  class MockNode {
    gain = new MockParam();
    pan = new MockParam();
    volume = new MockParam();
    frequency = new MockParam();
    Q = new MockParam();
    wet = new MockParam();
    threshold = new MockParam();
    ratio = new MockParam();
    attack = new MockParam();
    release = new MockParam();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(..._args: any[]) {}
    connect() { return this; }
    disconnect() { return this; }
    dispose() {}
    toDestination() { return this; }
    chain() { return this; }
  }
  class Meter extends MockNode {
    getValue() { return [-Infinity, -Infinity]; }
  }
  class Player extends MockNode {
    disposed = false;
    started = 0;
    stopped = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(opts?: any) {
      super();
      Promise.resolve().then(() => opts?.onload?.());
    }
    start() { this.started += 1; return this; }
    stop() { this.stopped += 1; return this; }
  }
  class PolySynth extends MockNode {
    released = 0;
    attackReleaseCalls = 0;
    lastDuration: number | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(..._args: any[]) {
      super();
      synths.all.push(this);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    triggerAttackRelease(_note?: any, duration?: number) {
      this.attackReleaseCalls += 1;
      this.lastDuration = duration;
    }
    triggerAttack() {}
    triggerRelease() {}
    releaseAll() { this.released += 1; }
  }
  interface ScheduledEvent { id: number; cb: (time: number) => void; at: number }
  const transport = {
    seconds: 0,
    state: 'stopped' as string,
    started: false,
    loop: false,
    bpm: { value: 120 },
    timeSignature: [4, 4] as unknown,
    _nextId: 10,
    _events: [] as ScheduledEvent[],
    start() { this.started = true; this.state = 'started'; },
    stop() { this.started = false; this.state = 'stopped'; },
    pause() { this.started = false; this.state = 'paused'; },
    schedule(cb: (time: number) => void, at: number) {
      const id = this._nextId++;
      this._events.push({ id, cb, at });
      transportSpy.scheduledIds.push(id);
      return id;
    },
    scheduleRepeat() { return this._nextId++; },
    clear(id: number) {
      this._events = this._events.filter((e) => e.id !== id);
      transportSpy.clearedIds.push(id);
    },
    // Real Tone: cancel() wipes every scheduled event on/after the given
    // time (the engine always calls it with no args, from dispose()
    // only — see engine.ts). Record every id it wiped so dispose tests
    // don't need to reach into per-track closures.
    cancel() {
      transportSpy.cancelCalls += 1;
      for (const e of this._events) transportSpy.clearedIds.push(e.id);
      this._events = [];
    },
    // Test helper (not part of real Tone's API): fire every persisted
    // event with `at <= seconds`, in time order. Events are NOT removed
    // afterward — `transport.schedule()` is once:false in real Tone, so
    // an event re-fires the next time the clock passes its tick. That
    // persistence is exactly the replay contract test 1 pins.
    fireUpTo(seconds: number) {
      const due = this._events
        .filter((e) => e.at <= seconds)
        .sort((a, b) => a.at - b.at);
      for (const e of due) e.cb(e.at);
    },
  };
  return {
    Gain: MockNode,
    Panner: MockNode,
    PanVol: MockNode,
    Limiter: MockNode,
    Compressor: MockNode,
    Filter: MockNode,
    BiquadFilter: MockNode,
    FeedbackDelay: MockNode,
    Reverb: MockNode,
    EQ: MockNode,
    Meter,
    Synth: MockNode,
    PolySynth,
    Player,
    getTransport: () => transport,
    getContext: () => ({
      sampleRate: 48000,
      rawContext: { resume: () => {}, destination: {} },
      createAudioWorkletNode: () => ({}),
    }),
    getDestination: () => ({ volume: new MockParam(), mute: false }),
    connect: () => {},
    now: () => 0,
  };
});

vi.mock('../engine/assetUrlCache', () => ({
  getAssetUrlSync: () => 'blob:mock-asset-url',
  getAssetUrl: async () => 'blob:mock-asset-url',
}));

import * as Tone from 'tone';
import { StudioEngine } from '../engine/engine';
import { newSession, newMidiTrack } from '../defaults';
import type { MidiClip, MidiNote } from '../session';

interface MockScheduledEvent { id: number; cb: (time: number) => void; at: number }
interface MockTransport {
  _events: MockScheduledEvent[];
  fireUpTo: (seconds: number) => void;
  seconds: number;
}

function mockTransport(): MockTransport {
  return Tone.getTransport() as unknown as MockTransport;
}

/** Minimal session with one MIDI track holding one clip. Shape copied
 *  from engine.test.ts / enginePausePlayers.test.ts's session helpers
 *  and extended with a MIDI clip. `notes` default to a single note at
 *  the clip start so callers that don't care about note placement get
 *  a clip that actually schedules something. */
function sessionWithMidiClip(opts?: { clipDuration?: number; notes?: MidiNote[] }) {
  const session = newSession({ tenantId: 't', ownerUserId: 'u' });
  const clip: MidiClip = {
    id: 'clip-1',
    kind: 'midi',
    start_seconds: 0,
    duration_seconds: opts?.clipDuration ?? 2,
    notes: opts?.notes ?? [
      { pitch: 60, velocity: 100, start_seconds: 0, duration_seconds: 1 },
    ],
  };
  const track = { ...newMidiTrack('Synth'), clips: [clip] };
  session.tracks = [track];
  return session;
}

function resetMocks() {
  synths.all.length = 0;
  transportSpy.cancelCalls = 0;
  transportSpy.clearedIds.length = 0;
  transportSpy.scheduledIds.length = 0;
  const t = mockTransport();
  t._events.length = 0;
  t.seconds = 0;
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
}

describe('MIDI note replay (transport.schedule persistence)', () => {
  beforeEach(resetMocks);
  afterEach(() => vi.unstubAllGlobals());

  it('fires the same scheduled note again after stop() + play() with no session edits', () => {
    const engine = new StudioEngine();
    engine.loadSession(sessionWithMidiClip());
    const synth = synths.all[0];

    engine.play();
    mockTransport().fireUpTo(0);
    expect(synth.attackReleaseCalls, 'note should fire on the first pass').toBe(1);

    // No session edit here — this is the regression the audit missed:
    // the engine must never wholesale transport.cancel() outside
    // dispose(), or a stop()+play() replay would silently drop notes.
    engine.stop();
    engine.play();
    mockTransport().fireUpTo(0);
    expect(
      synth.attackReleaseCalls,
      'transport.schedule() events persist (once:false) — replaying past the same tick must re-fire the note',
    ).toBe(2);
  });
});

describe('pause/stop/seek release held MIDI instrument voices', () => {
  beforeEach(resetMocks);
  afterEach(() => vi.unstubAllGlobals());

  it('calls releaseAll() on pause()', () => {
    const engine = new StudioEngine();
    engine.loadSession(sessionWithMidiClip());
    const synth = synths.all[0];

    engine.play();
    engine.pause();
    expect(synth.released).toBeGreaterThan(0);
  });

  it('calls releaseAll() on stop()', () => {
    const engine = new StudioEngine();
    engine.loadSession(sessionWithMidiClip());
    const synth = synths.all[0];

    engine.play();
    engine.stop();
    expect(synth.released).toBeGreaterThan(0);
  });

  it('calls releaseAll() on seek() while playing', () => {
    const engine = new StudioEngine();
    engine.loadSession(sessionWithMidiClip());
    const synth = synths.all[0];

    engine.play();
    expect(synth.released).toBe(0);
    engine.seek(1);
    expect(
      synth.released,
      'seek()-while-playing must cut held voices the same way pause()/stop() do — a jump mid-note would otherwise ring past the new playhead',
    ).toBeGreaterThan(0);
  });
});

describe('MIDI clip trim clamp (D1: scheduleMidiClip trims before scheduling)', () => {
  beforeEach(resetMocks);
  afterEach(() => vi.unstubAllGlobals());

  it('schedules nothing past the clip end, and truncates a straddling note', () => {
    const straddlerStart = 1; // duration 4 straddles the clip's duration:2 end
    const droppedStart = 3;   // starts at/after the clip end — dropped entirely
    const session = sessionWithMidiClip({
      clipDuration: 2,
      notes: [
        { pitch: 60, velocity: 100, start_seconds: straddlerStart, duration_seconds: 4 },
        { pitch: 64, velocity: 100, start_seconds: droppedStart, duration_seconds: 1 },
      ],
    });

    const engine = new StudioEngine();
    engine.loadSession(session);

    const events = mockTransport()._events;
    const scheduledTimes = events.map((e) => e.at);
    expect(
      scheduledTimes,
      'a note starting at/after the clip end must never reach transport.schedule()',
    ).not.toContain(droppedStart);
    expect(scheduledTimes).toContain(straddlerStart);
    expect(scheduledTimes).toHaveLength(1);

    const synth = synths.all[0];
    mockTransport().fireUpTo(straddlerStart);
    expect(
      synth.lastDuration,
      'the straddling note must be truncated to fit the clip (duration:2 - start:1 = 1), not play its full duration:4',
    ).toBe(1);
  });
});

describe('dispose() clears every scheduled MIDI event', () => {
  beforeEach(resetMocks);
  afterEach(() => vi.unstubAllGlobals());

  it('leaves no MIDI note events pending on the transport after dispose', () => {
    const engine = new StudioEngine();
    engine.loadSession(sessionWithMidiClip());

    const transport = mockTransport();
    expect(transport._events.length).toBeGreaterThan(0);

    engine.dispose();

    const stillPending = transport._events.length > 0;
    expect(
      !stillPending || transportSpy.cancelCalls > 0,
      'dispose() left a scheduled MIDI event neither clear()ed nor wiped by transport.cancel()',
    ).toBe(true);
    expect(transport._events).toHaveLength(0);
  });
});
