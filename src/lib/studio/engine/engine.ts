// Studio engine — Tone.js wrapper that mirrors a Session into a live
// audio graph. One engine instance per editor mount. The engine is
// authoritative for "what's playing right now"; the React layer reads
// transport state from it via subscriptions.
//
// Design notes (post-cleanup):
//   • Clip playback is driven exclusively by Tone.Transport.
//   • The metronome is driven by setInterval — Tone.Transport.scheduleRepeat
//     was unreliable in this setup, and a wall-clock timer is plenty
//     accurate for a human-feel click. The interval only runs while
//     state.isPlaying is true (so toggling the click alone is silent).
//   • The "double-wired master destination" (both .toDestination() AND a
//     direct Tone.connect to rawContext.destination) is belt-and-suspenders
//     for Tone version quirks we've hit before. Looks redundant, isn't.

import * as Tone from 'tone';
import type { Session } from '../session';
import { buildFxChain, type EngineFxChain } from './fx';
import { buildTrack, type EngineTrack } from './tracks';

export interface EngineState {
  isReady: boolean;
  isPlaying: boolean;
  positionSeconds: number;   // updated ~30Hz while playing
  tempoBpm: number;
  loopEnabled: boolean;
  loopStartSeconds: number;
  loopEndSeconds: number;
  metronomeOn: boolean;
  /** User-facing metronome volume in dB (additive on top of the
   * per-synth baseline). 0 = "as designed", -∞ = silent. */
  metronomeVolumeDb: number;
  /** Master bus output level in dB (peak across L+R). Updated ~30Hz. */
  peakDbL: number;
  peakDbR: number;
}

type Listener = (s: EngineState) => void;

export class StudioEngine {
  // Master bus: masterIn → masterFx → Destination (+ post-FX meter).
  private masterIn: Tone.Gain;
  private masterFx: EngineFxChain;
  private masterMeter: Tone.Meter;
  // Metronome — two short pitched square clicks. Accent on beat 1.
  private metronome: Tone.Synth;
  private metronomeAccent: Tone.Synth;
  private metronomeIntervalId: ReturnType<typeof setInterval> | null = null;
  private metronomeBeatInBar = 0;
  // Tracks (audio + MIDI), built from the loaded Session.
  private tracks = new Map<string, EngineTrack>();
  private session: Session | null = null;
  // Tone.Transport one-shot schedules registered during play() — kept
  // so stop() can clear ONLY them and leave nothing else dangling.
  private playScheduleIds: number[] = [];
  // React subscribers + position-emit loop.
  private listeners = new Set<Listener>();
  private rafId: number | null = null;
  private state: EngineState;

  constructor() {
    this.masterIn = new Tone.Gain(1);
    this.masterFx = buildFxChain([]);
    this.masterIn.connect(this.masterFx.input);
    this.masterMeter = new Tone.Meter({ channels: 2, smoothing: 0.7 });
    this.masterFx.output.connect(this.masterMeter);
    this.wireMasterToDestination();

    this.metronomeAccent = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.03 },
      volume: 0,
    }).toDestination();
    this.metronome = new Tone.Synth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.03 },
      volume: -4,
    }).toDestination();

    this.state = {
      isReady: false,
      isPlaying: false,
      positionSeconds: 0,
      tempoBpm: 120,
      loopEnabled: false,
      loopStartSeconds: 0,
      loopEndSeconds: 0,
      metronomeOn: false,
      metronomeVolumeDb: 0,
      peakDbL: -Infinity,
      peakDbR: -Infinity,
    };
  }

  /** Wire the master FX output to Tone.Destination AND directly to the
   * raw AudioContext destination. Some Tone versions silently mute the
   * Destination Volume node after hot-reload; the direct path is the
   * fallback. Also unmute Destination explicitly. */
  private wireMasterToDestination(): void {
    this.masterFx.output.toDestination();
    try {
      const dest = Tone.getDestination();
      dest.volume.value = 0;
      dest.mute = false;
      Tone.getContext().rawContext.resume?.();
      Tone.connect(this.masterFx.output, Tone.getContext().rawContext.destination);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[studio] destination wiring failed', e);
    }
  }

  // ── Metronome ─────────────────────────────────────────────────────

  /** Adjust click loudness without disturbing accent/tick balance. */
  setMetronomeVolume(db: number): void {
    this.state.metronomeVolumeDb = db;
    this.metronomeAccent.volume.value = 0 + db;
    this.metronome.volume.value = -4 + db;
    this.emit();
  }

  /** Toggle metronome on / off. Only arms — no audio plays just from
   * toggling. The click ticks while playback is active (Play or
   * Record), and stops with Pause / Stop. */
  setMetronome(on: boolean): void {
    this.state.metronomeOn = on;
    if (on && this.state.isPlaying) {
      this.startMetronomeInterval();
    } else if (!on) {
      this.stopMetronomeInterval();
    }
    this.emit();
  }

  /** Fire one click tick on demand. Used by the count-in pre-roll so
   * the user gets audible beats BEFORE play() starts the transport. */
  triggerMetronomeClick(accent: boolean): void {
    const synth = accent ? this.metronomeAccent : this.metronome;
    const note = accent ? 'A5' : 'E5';
    try { synth.triggerAttackRelease(note, 0.05); } catch { /* ignore */ }
  }

  private startMetronomeInterval(): void {
    if (this.metronomeIntervalId !== null) return;
    const numerator = this.session?.time_signature.numerator ?? 4;
    this.metronomeBeatInBar = 0;
    // Fire beat 1 immediately so the first click aligns with playback.
    this.triggerMetronomeClick(true);
    this.metronomeBeatInBar = 1 % numerator;
    const periodMs = (60 / this.state.tempoBpm) * 1000;
    this.metronomeIntervalId = setInterval(() => {
      this.triggerMetronomeClick(this.metronomeBeatInBar === 0);
      this.metronomeBeatInBar = (this.metronomeBeatInBar + 1) % numerator;
    }, periodMs);
  }

  private stopMetronomeInterval(): void {
    if (this.metronomeIntervalId !== null) {
      clearInterval(this.metronomeIntervalId);
      this.metronomeIntervalId = null;
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────

  /** Must be called from a user gesture to unlock audio. Resumes the
   * raw AudioContext first (Safari quirk), then calls Tone.start(). */
  async start(): Promise<void> {
    const ctx = Tone.getContext();
    if (ctx.state !== 'running') {
      try { await ctx.rawContext.resume(); } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[studio] rawContext.resume() failed', e);
      }
    }
    await Tone.start();
    this.state.isReady = true;
    this.emit();
  }

  dispose(): void {
    this.stopPositionLoop();
    this.stopMetronomeInterval();
    for (const t of this.tracks.values()) t.dispose();
    this.tracks.clear();
    this.metronome.dispose();
    this.metronomeAccent.dispose();
    this.masterMeter.dispose();
    this.masterFx.dispose();
    this.masterIn.dispose();
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
  }

  // ── Session binding ───────────────────────────────────────────────

  loadSession(session: Session): void {
    this.session = session;
    const transport = Tone.getTransport();
    transport.bpm.value = session.tempo_bpm;
    transport.timeSignature = [
      session.time_signature.numerator,
      session.time_signature.denominator,
    ];

    // Rebuild master FX chain (and reattach the meter post-FX).
    this.masterIn.disconnect();
    this.masterFx.dispose();
    this.masterFx = buildFxChain(session.master.fx);
    this.masterIn.connect(this.masterFx.input);
    this.masterFx.output.connect(this.masterMeter);
    this.wireMasterToDestination();
    this.masterIn.gain.value = dbToGain(session.master.volume_db);

    // Rebuild tracks.
    for (const t of this.tracks.values()) t.dispose();
    this.tracks.clear();
    for (const tr of session.tracks) {
      const eng = buildTrack(tr, session.assets);
      eng.userMute = tr.mute;
      eng.userSolo = tr.solo;
      eng.output.connect(this.masterIn);
      this.tracks.set(tr.id, eng);
    }
    this.recomputeSolo();

    this.state.tempoBpm = session.tempo_bpm;
    this.emit();
  }

  updateTransport(args: {
    tempo?: number;
    timeSignature?: [number, number];
    loop?: { start: number; end: number; enabled: boolean };
  }): void {
    if (args.tempo !== undefined) {
      Tone.getTransport().bpm.value = args.tempo;
      this.state.tempoBpm = args.tempo;
      // Metronome period depends on tempo — restart so the new BPM
      // takes effect immediately.
      if (this.metronomeIntervalId !== null) {
        this.stopMetronomeInterval();
        this.startMetronomeInterval();
      }
    }
    if (args.timeSignature) {
      Tone.getTransport().timeSignature = args.timeSignature;
      if (this.session) this.session.time_signature = {
        numerator: args.timeSignature[0], denominator: args.timeSignature[1],
      };
      // Restart so beat 1 (accent) aligns to the new numerator.
      if (this.metronomeIntervalId !== null) {
        this.stopMetronomeInterval();
        this.startMetronomeInterval();
      }
    }
    if (args.loop) {
      const t = Tone.getTransport();
      t.loop = args.loop.enabled;
      t.loopStart = args.loop.start;
      t.loopEnd = args.loop.end;
      this.state.loopEnabled = args.loop.enabled;
      this.state.loopStartSeconds = args.loop.start;
      this.state.loopEndSeconds = args.loop.end;
    }
    this.emit();
  }

  updateTrackStrip(trackId: string, patch: { volume_db?: number; pan?: number; mute?: boolean; solo?: boolean }): void {
    const t = this.tracks.get(trackId);
    if (!t) return;
    if (patch.mute !== undefined) t.userMute = patch.mute;
    if (patch.solo !== undefined) t.userSolo = patch.solo;
    t.updateStrip({ volume_db: patch.volume_db, pan: patch.pan });
    this.recomputeSolo();
  }

  /** Solo override — when any track is soloed, non-soloed tracks are
   * silenced regardless of their own mute flag. */
  private recomputeSolo(): void {
    let anySolo = false;
    for (const t of this.tracks.values()) if (t.userSolo) { anySolo = true; break; }
    for (const t of this.tracks.values()) {
      const effectiveMute = anySolo ? !t.userSolo : t.userMute;
      t.updateStrip({ mute: effectiveMute });
    }
  }

  // ── Transport ─────────────────────────────────────────────────────

  play(): void {
    const transport = Tone.getTransport();
    const pos = transport.seconds;
    transport.start();
    // Clear any leftover schedules from a prior play() that didn't run
    // to completion, then re-register fresh schedules for every clip.
    for (const id of this.playScheduleIds) transport.clear(id);
    this.playScheduleIds = [];
    for (const track of this.tracks.values()) {
      for (const pb of track.playbacks) this.schedulePlayback(pb, pos);
    }
    this.state.isPlaying = true;
    if (this.state.metronomeOn) this.startMetronomeInterval();
    this.emit();
    this.startPositionLoop();
  }

  /** Schedule a single clip for the current play() run. Handles both
   * the "clip starts in the future" and "transport is already past
   * the clip's start" cases in one function. */
  private schedulePlayback(pb: EngineTrack['playbacks'][number], pos: number): void {
    const clipEnd = pb.startSeconds + pb.durationSeconds;
    if (clipEnd <= pos) return; // clip is entirely in the past
    const transport = Tone.getTransport();
    if (pb.startSeconds <= pos) {
      // Transport is mid-clip — start the player immediately, offset
      // into the asset by how far we are into the clip.
      const into = pos - pb.startSeconds;
      try {
        pb.player.start('+0', pb.offsetSeconds + into, pb.durationSeconds - into);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('[studio] player.start (immediate) failed', e);
      }
    } else {
      // Clip starts later — schedule on the transport.
      const id = transport.schedule((time) => {
        pb.player.start(time, pb.offsetSeconds, pb.durationSeconds);
      }, pb.startSeconds);
      this.playScheduleIds.push(id);
    }
  }

  pause(): void {
    Tone.getTransport().pause();
    this.state.isPlaying = false;
    this.stopMetronomeInterval();
    this.emit();
    this.stopPositionLoop();
  }

  /** Logic-style Stop: leaves the playhead where it is. Hit Home to
   * return to bar 1. We use transport.pause() so Tone doesn't auto-
   * reset position to 0. */
  stop(): void {
    const transport = Tone.getTransport();
    const wherePaused = transport.seconds;
    transport.pause();
    for (const track of this.tracks.values()) {
      for (const pb of track.playbacks) {
        try { pb.player.stop(); } catch { /* not playing */ }
      }
    }
    for (const id of this.playScheduleIds) transport.clear(id);
    this.playScheduleIds = [];
    this.state.isPlaying = false;
    this.state.positionSeconds = wherePaused;
    this.stopMetronomeInterval();
    this.emit();
    this.stopPositionLoop();
  }

  seek(seconds: number): void {
    Tone.getTransport().seconds = Math.max(0, seconds);
    this.state.positionSeconds = seconds;
    this.emit();
  }

  // ── Subscriptions ─────────────────────────────────────────────────

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }
  getState(): EngineState { return { ...this.state }; }

  private emit() { for (const l of this.listeners) l({ ...this.state }); }

  private startPositionLoop() {
    if (this.rafId !== null) return;
    let lastEmit = 0;
    const tick = (now: number) => {
      if (!this.state.isPlaying) { this.rafId = null; return; }
      this.state.positionSeconds = Tone.getTransport().seconds;
      const lvl = this.masterMeter.getValue();
      if (Array.isArray(lvl)) {
        this.state.peakDbL = lvl[0] ?? -Infinity;
        this.state.peakDbR = lvl[1] ?? -Infinity;
      } else {
        this.state.peakDbL = lvl as number;
        this.state.peakDbR = lvl as number;
      }
      if (now - lastEmit >= 33) {
        this.emit();
        lastEmit = now;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }
  private stopPositionLoop() {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  // Internal — exposed so the recorder can tap the mix bus if desired.
  getMasterIn(): Tone.Gain { return this.masterIn; }
}

export function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}
export function gainToDb(g: number): number {
  return g > 0 ? 20 * Math.log10(g) : -Infinity;
}
