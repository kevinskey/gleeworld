// Solo behavior: soloing a track must silence every non-soloed track
// (their muteGate ramps to 0), un-soloing must restore each track's own
// user mute. Exercises the real StudioEngine + buildTrack against the
// scripted Tone mock; ramp targets are recorded per MockParam.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const players = vi.hoisted(() => ({ all: [] as unknown[] }));

vi.mock('tone', () => {
  class MockParam {
    value = 1;
    /** Last ramp/assignment target — what the gate is heading to. */
    last: number | null = null;
    cancelScheduledValues() {}
    linearRampTo(v: number) { this.last = v; this.value = v; }
    rampTo(v: number) { this.last = v; this.value = v; }
    setValueAtTime() {}
  }
  class MockNode {
    gain = new MockParam();
    pan = new MockParam();
    volume = new MockParam();
    frequency = new MockParam();
    Q = new MockParam();
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(opts?: any) {
      super();
      players.all.push(this);
      Promise.resolve().then(() => opts?.onload?.());
    }
    start() { return this; }
    stop() { return this; }
  }
  const transport = {
    seconds: 0,
    state: 'stopped' as string,
    started: false,
    loop: false,
    bpm: { value: 120 },
    timeSignature: [4, 4] as unknown,
    _nextId: 10,
    start() { this.started = true; this.state = 'started'; },
    stop() { this.started = false; this.state = 'stopped'; },
    pause() { this.started = false; this.state = 'paused'; },
    schedule() { return this._nextId++; },
    scheduleRepeat() { return this._nextId++; },
    clear() {},
    cancel() {},
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
    Player,
    getTransport: () => transport,
    getContext: () => ({
      sampleRate: 48000,
      rawContext: { resume: () => {}, destination: {} },
      createAudioWorkletNode: () => ({}),
    }),
    getDestination: () => ({ volume: { value: 0 }, mute: false }),
    connect: () => {},
    now: () => 0,
  };
});

vi.mock('../engine/assetUrlCache', () => ({
  getAssetUrlSync: () => 'blob:mock-asset-url',
  getAssetUrl: async () => 'blob:mock-asset-url',
}));

import { StudioEngine } from '../engine/engine';
import { newSession, newAudioTrack } from '../defaults';

function twoTrackSession() {
  const session = newSession({ tenantId: 't', ownerUserId: 'u' });
  const a = { ...newAudioTrack('Sopranos'), id: 'track-a' };
  const b = { ...newAudioTrack('Altos'), id: 'track-b' };
  session.tracks = [a, b];
  return session;
}

/** The strip's muteGate ramp target: 0 = silenced, 1 = audible. */
function gateTarget(engine: StudioEngine, trackId: string): number | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = (engine as any).tracks.get(trackId);
  // postFaderTap IS the muteGate node (see buildTrack's graph comment).
  return t.postFaderTap.gain.last;
}

describe('solo silences non-soloed tracks', () => {
  beforeEach(() => {
    players.all.length = 0;
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });

  it('soloing A closes B\'s gate and keeps A open', () => {
    const engine = new StudioEngine();
    engine.loadSession(twoTrackSession());

    engine.updateTrackStrip('track-a', { solo: true });

    expect(gateTarget(engine, 'track-b')).toBe(0);
    expect(gateTarget(engine, 'track-a')).toBe(1);
  });

  it('un-soloing restores the other track', () => {
    const engine = new StudioEngine();
    engine.loadSession(twoTrackSession());

    engine.updateTrackStrip('track-a', { solo: true });
    engine.updateTrackStrip('track-a', { solo: false });

    expect(gateTarget(engine, 'track-b')).toBe(1);
    expect(gateTarget(engine, 'track-a')).toBe(1);
  });

  it('a muted track stays muted when solo ends', () => {
    const engine = new StudioEngine();
    engine.loadSession(twoTrackSession());

    engine.updateTrackStrip('track-b', { mute: true });
    engine.updateTrackStrip('track-a', { solo: true });
    engine.updateTrackStrip('track-a', { solo: false });

    expect(gateTarget(engine, 'track-b')).toBe(0);
  });
});
