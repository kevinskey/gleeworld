// Regression test for pause() vs clip Players: clip audio runs on
// free-running Tone.Player instances (started via player.start(), not
// .sync()ed to the transport), so Tone.getTransport().pause() stops the
// transport clock — the playhead — but NOT any Player already
// streaming its buffer. pause() must stop every clip player itself
// (the same discipline stop() and seek() already follow) or the music
// keeps playing under a frozen playhead.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const players = vi.hoisted(() => ({
  all: [] as Array<{ started: number; stopped: number }>,
}));

// MIDI instrument voices (Tone.PolySynth) — separate from clip Players
// above. Used by the releaseAll regression below: pause() must silence
// held synth notes too, the same discipline as clip players, since
// PolySynth voices are also free-running against Tone's own clock.
const synths = vi.hoisted(() => ({
  all: [] as Array<{ released: number }>,
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
      players.all.push(this);
      // Real Tone.Player fires onload after the buffer decodes; the
      // engine registers the clip playback there. Fire on a microtask
      // (synchronous firing hits the TDZ on the `player` const).
      Promise.resolve().then(() => opts?.onload?.());
    }
    start() { this.started += 1; return this; }
    stop() { this.stopped += 1; return this; }
  }
  class PolySynth extends MockNode {
    released = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(..._args: any[]) {
      super();
      synths.all.push(this);
    }
    triggerAttackRelease() {}
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
      return id;
    },
    scheduleRepeat() { return this._nextId++; },
    clear(id: number) { this._events = this._events.filter((e) => e.id !== id); },
    cancel() { this._events = []; },
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
  // Some engine paths import the async variant too; harmless stub.
  getAssetUrl: async () => 'blob:mock-asset-url',
}));

import { StudioEngine } from '../engine/engine';
import { newSession, newAudioTrack, newMidiTrack } from '../defaults';
import type { AudioAsset, AudioClip } from '../session';

function sessionWithOneClip() {
  const session = newSession({ tenantId: 't', ownerUserId: 'u' });
  const asset: AudioAsset = {
    id: 'asset-1',
    filename: 'take.wav',
    format: 'wav',
    duration_seconds: 10,
    sample_rate: 48000,
    channels: 2,
    size_bytes: 1,
  };
  const clip: AudioClip = {
    id: 'clip-1',
    kind: 'audio',
    asset_id: asset.id,
    start_seconds: 0,
    duration_seconds: 10,
    offset_seconds: 0,
    gain_db: 0,
    fade_in_seconds: 0,
    fade_out_seconds: 0,
    reverse: false,
    pitch_semitones: 0,
    time_stretch: 1,
  };
  const track = { ...newAudioTrack('Vox'), clips: [clip] };
  session.tracks = [track];
  session.assets = [asset];
  return session;
}

describe('pause() silences clip players', () => {
  beforeEach(() => {
    players.all.length = 0;
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stops every started clip player when the transport pauses', async () => {
    const engine = new StudioEngine();
    engine.loadSession(sessionWithOneClip());
    await Promise.resolve(); // flush mock Player onload → playback registration

    engine.play();
    const clipPlayers = players.all.filter((p) => p.started > 0);
    expect(clipPlayers.length).toBeGreaterThan(0);

    engine.pause();
    for (const p of clipPlayers) {
      expect(
        p.stopped,
        'pause() left a clip player streaming — playhead frozen, audio still audible',
      ).toBeGreaterThan(0);
    }
  });
});

describe('pause() releases held MIDI instrument voices', () => {
  beforeEach(() => {
    players.all.length = 0;
    synths.all.length = 0;
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls releaseAll() on the track\'s PolySynth when the transport pauses', () => {
    const session = newSession({ tenantId: 't', ownerUserId: 'u' });
    session.tracks = [newMidiTrack('Synth')];

    const engine = new StudioEngine();
    engine.loadSession(session);

    expect(synths.all.length).toBe(1);
    engine.pause();
    expect(
      synths.all[0].released,
      "pause() left a MIDI track's instrument without calling releaseAll() — a held note can ring past the pause",
    ).toBeGreaterThan(0);
  });
});
