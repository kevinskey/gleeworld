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
import type { Session, AudioAsset, AudioClip, MasteringParams } from '../session';
import { buildFxChain, type EngineFxChain } from './fx';
import { buildTrack, type EngineTrack } from './tracks';
import { setAssetUrl } from './assetUrlCache';
import { shouldLoopWrap } from '../transport';
import { buildMasterChain, type MasterChainHandle } from './masterChain';
import { MasterChainSync } from './masterChainSync';

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
  /** AudioContext sample rate — drives the Samples time counter. */
  sampleRate: number;
  /** Live master-mastering-chain handle when `session.master.mastering
   * ?.enabled` and the async build has resolved; `undefined` when
   * mastering is off, still building, or the session predates B1.
   * Exposed here (rather than only via a private field) the same way
   * `getState()`/`subscribe()` surface every other piece of engine
   * state — Task 6's MixerView reads `masterChain.meter`/`update` off
   * this to bind the mastering panel + loudness meter. The handle
   * reference itself is stable across emits (only replaced on an
   * enabled-toggle rebuild); it is NOT deep-cloned like the rest of
   * `state` because it wraps live AudioNodes, not plain data. */
  masterChain?: MasterChainHandle;
  /** Mirrors the engine's internal recording-armed flag (see
   * `setRecordingActive`/`recordingActive` private field) so UI-side
   * consumers can gate their own logic on it instead of duplicating the
   * flag. B1 follow-up: MixerView's MasterStrip loudness servo reads
   * this to skip its tick (not just the resulting AudioParam write,
   * which `setMasterPreGainDb` already no-ops while armed) so its
   * `preGainRef` doesn't keep advancing during a take and jump on
   * disarm. */
  recordingActive: boolean;
}

type Listener = (s: EngineState) => void;

export interface StudioEngineOptions {
  /** Fired at most once per engine instance (i.e. once per session —
   * see the constructor field below) the first time a LIVE mastering
   * chain build comes back degraded (AudioWorklet module load failed,
   * so the chain runs HPF/shelf/comp only, no limiter/loudness meter).
   * Exports already surface this via exportRender's own `onDegraded`
   * option (see StudioEditor.tsx's Export sheet); this is the same idea
   * for the always-on live preview, which previously only
   * console.warned (see masterChain.ts's tryLoadWorklets). The engine
   * itself stays UI-free — it doesn't import a toast library — so the
   * actual toast lives wherever the caller (useStudioEngine) wires this
   * up. */
  onMasteringDegraded?: () => void;
}

export class StudioEngine {
  // Master bus: masterIn → masterFx → [masterChain?] → Destination
  // (+ post-FX, pre-mastering meter — see wireMasterOutput).
  private masterIn: Tone.Gain;
  // Master balance — sits between masterIn and the FX chain. The
  // Inspector's "Master Out" pan slider was previously session-only
  // (no node existed), so it never made sound different.
  private masterPan: Tone.Panner;
  private masterFx: EngineFxChain;
  private masterMeter: Tone.Meter;
  // Mastering chain (B1 task 4/5) — built async (AudioWorklet module
  // load) only when session.master.mastering?.enabled. chainSync.handle
  // null means bypass: masterFx.output feeds Destination directly.
  // ALL toggle/build-race decisions live in MasterChainSync (which
  // converges on the DESIRED enabled state, recorded synchronously —
  // never on handle-null-ness, which is stale during the async worklet
  // load; see masterChainSync.ts for the fd2f223e8 race this fixes).
  // The hooks below are the engine-side effects of each transition.
  private chainSync = new MasterChainSync<MasterChainHandle>({
    build: (mastering) => {
      const toneCtx = Tone.getContext();
      return buildMasterChain(toneCtx.rawContext, mastering, {
        // Tone 15's rawContext is a standardized-audio-context wrapper
        // at runtime (typed as native AudioContext, constructed as
        // stdAudioContext) — the bare `new AudioWorkletNode(ctx, …)`
        // constructor rejects it. Tone's context.createAudioWorkletNode
        // branches native-vs-standardized correctly, so worklet NODES go
        // through it. Module LOADING stays inside buildMasterChain
        // (rawContext.audioWorklet.addModule — works on both flavors);
        // we deliberately do NOT use Tone's addAudioWorkletModule, which
        // caches a single _workletPromise and would silently skip the
        // second of our two module URLs.
        createWorkletNode: (name, options) => toneCtx.createAudioWorkletNode(name, options),
      });
    },
    install: (handle) => {
      this.state.masterChain = this.guardedHandle(handle);
      this.wireMasterOutput();
      // Surface the degraded-preview toast at most once per engine
      // instance (see StudioEngineOptions.onMasteringDegraded) — not
      // once per rebuild. A session can toggle mastering on/off or edit
      // params (each of which may re-run this `install` hook) many
      // times; the worklet-availability verdict doesn't change mid
      // session, so nagging on every rebuild would be noise.
      if (handle.degraded && !this.masteringDegradedFired) {
        this.masteringDegradedFired = true;
        this.onMasteringDegraded?.();
      }
      this.emit();
    },
    uninstall: () => {
      // The chain's connections died with its dispose() — rewire the
      // bypass topology (masterFx -> Destination) immediately so the
      // master bus is never silent.
      this.state.masterChain = undefined;
      this.wireMasterOutput();
      this.emit();
    },
    refresh: (p) => this.updateMastering(p),
    onBuildError: (e) => {
      // eslint-disable-next-line no-console
      console.error('[studio] buildMasterChain failed', e);
    },
  });
  // Debounce state for updateMastering() — coalesces a fast-dragging
  // mastering-panel slider into one AudioParam write per 50ms instead of
  // one per input event.
  private masterChainUpdateTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingMasteringUpdate: MasteringParams | null = null;
  // Metronome — two short pitched square clicks. Accent on beat 1.
  private metronome: Tone.Synth;
  private metronomeAccent: Tone.Synth;
  private metronomeIntervalId: ReturnType<typeof setInterval> | null = null;
  // Manual loop wrap timer. A setInterval (not the display RAF, which
  // pauses in a backgrounded tab) so a looped region keeps wrapping even
  // when the tab isn't focused.
  private loopCheckIntervalId: ReturnType<typeof setInterval> | null = null;
  private metronomeBeatInBar = 0;
  // While a take is in flight the loop watchdog stands down — a wrap
  // mid-recording would mangle the take's clip placement.
  private recordingActive = false;
  // See StudioEngineOptions.onMasteringDegraded — set from the
  // constructor, fired at most once (masteringDegradedFired latches it).
  private onMasteringDegraded?: () => void;
  private masteringDegradedFired = false;
  // Tracks (audio + MIDI), built from the loaded Session.
  private tracks = new Map<string, EngineTrack>();
  // Per-track PPM peak meters (B1 Task 6) — one Tone.Meter tapped in
  // PARALLEL off each track's post-EQ output (does not affect the
  // signal path to masterIn). Rebuilt alongside `tracks` in
  // loadSession(); read by getTrackPeakDb(), which the MixerView's
  // meter rAF loop polls once per frame per visible strip.
  private trackMeters = new Map<string, Tone.Meter>();
  private session: Session | null = null;
  // Tone.Transport one-shot schedules registered during play() — kept
  // so stop() can clear ONLY them and leave nothing else dangling.
  private playScheduleIds: number[] = [];
  // React subscribers + position-emit loop.
  private listeners = new Set<Listener>();
  private rafId: number | null = null;
  private state: EngineState;

  constructor(opts: StudioEngineOptions = {}) {
    this.onMasteringDegraded = opts.onMasteringDegraded;
    this.masterIn = new Tone.Gain(1);
    this.masterPan = new Tone.Panner(0);
    this.masterFx = buildFxChain([]);
    this.masterIn.connect(this.masterPan);
    this.masterPan.connect(this.masterFx.input);
    this.masterMeter = new Tone.Meter({ channelCount: 2, smoothing: 0.7 });
    // No session loaded yet, so no mastering chain either — this is the
    // bypass wiring (masterFx.output straight to Destination).
    this.wireMasterOutput();

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
      sampleRate: (() => {
        try { return Tone.getContext().sampleRate; } catch { return 48000; }
      })(),
      recordingActive: false,
    };
  }

  /** Connect `tail` — whatever currently feeds the speakers, either
   * masterFx.output (mastering off / still building) or
   * chainSync.handle.output (mastering live) — to Tone.Destination AND
   * directly to the raw AudioContext destination. Some Tone versions
   * silently mute the Destination Volume node after hot-reload; the
   * direct path is the fallback. Also unmutes Destination explicitly.
   * `Tone.connect` resolves both Tone and raw-native AudioNode arguments
   * (see ToneAudioNode.js), so this works whether `tail` is the Tone.Gain
   * masterFx.output or the plain GainNode chainSync.handle.output. */
  private connectToDestination(tail: Tone.ToneAudioNode | AudioNode): void {
    try {
      Tone.connect(tail, Tone.getDestination());
      const dest = Tone.getDestination();
      dest.volume.value = 0;
      dest.mute = false;
      Tone.getContext().rawContext.resume?.();
      Tone.connect(tail, Tone.getContext().rawContext.destination);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[studio] destination wiring failed', e);
    }
  }

  /** (Re)wire the tail of the master bus: masterFx.output always feeds
   * the post-FX meter (unchanged by mastering — this is the same peak
   * meter the transport bar always read); the signal that reaches the
   * speakers is masterFx.output -> chainSync.handle (if built) ->
   * Destination, collapsing to masterFx.output -> Destination directly
   * when chainSync.handle is null (mastering off, or its async build
   * hasn't resolved yet). Called from the constructor (bypass), from
   * loadSession() after masterFx is rebuilt, and from chainSync's
   * install/uninstall hooks whenever the chain handle is replaced.
   * `.disconnect()` on a node with nothing wired is a safe no-op, so
   * this is safe to call redundantly. */
  private wireMasterOutput(): void {
    const chain = this.chainSync.handle;
    this.masterFx.output.disconnect();
    this.masterFx.output.connect(this.masterMeter);
    if (chain) {
      Tone.connect(this.masterFx.output, chain.input);
      this.connectToDestination(chain.output);
    } else {
      this.connectToDestination(this.masterFx.output);
    }
  }

  /** Converge the live master chain with `mastering` (from a session
   * load or a live edit). Idempotent: when the desired state already
   * matches, this is just a (debounced) param refresh — NO
   * teardown/rebuild of the AudioWorklet-backed chain, so calling it on
   * every session write is cheap. All toggle/build-race logic (desired
   * state recorded synchronously, superseded builds disposed) lives in
   * MasterChainSync — see masterChainSync.ts.
   * `rewireTail` re-runs wireMasterOutput even in the no-toggle case —
   * loadSession needs that because it just disposed + rebuilt masterFx,
   * orphaning the old tail connections; live edits don't. */
  private syncMasterChain(mastering: MasteringParams | undefined, rewireTail: boolean): void {
    this.chainSync.sync(mastering);
    // If sync() changed the chain synchronously (disable path), its
    // uninstall hook already rewired; wireMasterOutput is documented
    // safe to call redundantly, so the extra pass here is harmless.
    if (rewireTail) this.wireMasterOutput();
  }

  /** The handle exposed on EngineState is a thin wrapper over the real
   * MasterChainHandle so the engine's invariants hold no matter which
   * path the UI takes to it:
   *   - `update()` routes through the 50ms debounce (updateMastering),
   *   - `setPreGainDb()` routes through the recording-armed guard
   *     (setMasterPreGainDb — B1 spec §5),
   *   - `getPreGainDb()` passes straight through, unguarded — it's a
   *     read of the last-committed value, not a write, so the
   *     recording-armed guard doesn't apply; export (exportRender.ts)
   *     calls this at export start to thread the servo's settled gain
   *     into the offline render (spec §3),
   *   - `dispose()` is withheld: the engine owns the chain lifecycle
   *     (enabled-toggle or engine.dispose() tears it down); a stray UI
   *     dispose() must not yank live AudioNodes out of the graph. */
  private guardedHandle(handle: MasterChainHandle): MasterChainHandle {
    return {
      input: handle.input,
      output: handle.output,
      degraded: handle.degraded,
      meter: handle.meter,
      update: (p) => this.updateMastering(p),
      setPreGainDb: (db) => this.setMasterPreGainDb(db),
      getPreGainDb: () => handle.getPreGainDb(),
      dispose: () => {
        // eslint-disable-next-line no-console
        console.warn('[studio] masterChain.dispose() ignored — engine owns the chain lifecycle');
      },
    };
  }

  /** Public convergence entry point for live mastering edits (Task 6's
   * MixerView + useStudio's skeleton-stable diff path). Handles BOTH an
   * enabled-toggle (dispose + async buildMasterChain rebuild, WITHOUT
   * the heavy full-session loadSession() reload that tears down and
   * re-decodes every track/clip) and plain param changes (debounced
   * update on the live chain). Passing `undefined` (legacy session,
   * mastering never configured) tears down any live chain. */
  setMastering(mastering: MasteringParams | undefined): void {
    this.syncMasterChain(mastering, false);
  }

  /** Live param update (HPF freq, air gain, comp threshold/ratio/attack/
   * release, limiter ceiling/release) for an already-built master chain.
   * Debounced 50ms so a fast-dragging mastering-panel slider coalesces
   * into one AudioParam write instead of one per input event. Does NOT
   * touch preGain (see setMasterPreGainDb) — MasterChainHandle.update()
   * never writes the preGain stage, so no recording-armed guard is
   * needed here. No-op if the chain isn't built when the timer fires
   * (mastering disabled, or the async build hasn't resolved — in which
   * case the build itself used the newest params anyway). */
  updateMastering(mastering: MasteringParams): void {
    this.pendingMasteringUpdate = mastering;
    if (this.masterChainUpdateTimer !== null) return;
    this.masterChainUpdateTimer = setTimeout(() => {
      this.masterChainUpdateTimer = null;
      const p = this.pendingMasteringUpdate;
      this.pendingMasteringUpdate = null;
      if (p) this.chainSync.handle?.update(p);
    }, 50);
  }

  /** Loudness-servo makeup-gain entry point. The servo LOGIC (deciding
   * what dB to apply from the loudness meter) lives in the UI — Task 6;
   * the engine only gates the resulting AudioParam write. Per B1 spec §5,
   * preGain must never move while a take is armed/recording: a mid-take
   * gain jump would be audible and would retroactively color the very
   * take the performer is singing against. `recordingActive` is the same
   * flag `setRecordingActive` (already flipped by StudioEditor around
   * every take, for the loop watchdog) drives — reused here rather than
   * adding a second recording flag. The exposed EngineState.masterChain
   * handle's setPreGainDb routes through this method too, so the guard
   * holds for both call paths. */
  setMasterPreGainDb(db: number): void {
    if (this.recordingActive) return; // guarded no-op while armed — see above
    this.chainSync.handle?.setPreGainDb(db);
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
    this.stopLoopInterval();
    // Tear down the mastering chain via the sync machine — it bumps its
    // own token so a late in-flight build resolves into disposal, not
    // into this dead graph.
    if (this.masterChainUpdateTimer !== null) {
      clearTimeout(this.masterChainUpdateTimer);
      this.masterChainUpdateTimer = null;
    }
    this.chainSync.dispose();
    this.state.masterChain = undefined;
    for (const t of this.tracks.values()) t.dispose();
    this.tracks.clear();
    for (const m of this.trackMeters.values()) m.dispose();
    this.trackMeters.clear();
    this.metronome.dispose();
    this.metronomeAccent.dispose();
    this.masterMeter.dispose();
    this.masterFx.dispose();
    this.masterPan.dispose();
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
    // masterIn → masterPan stays wired for the engine's lifetime; only
    // the pan → (new) masterFx.input hop is rebuilt here.
    this.masterPan.disconnect();
    this.masterFx.dispose();
    this.masterFx = buildFxChain(session.master.fx);
    this.masterPan.connect(this.masterFx.input);
    this.masterIn.gain.value = dbToGain(session.master.volume_db);
    this.masterPan.pan.value = session.master.pan ?? 0;
    // Converge the mastering chain with the session (builds/tears down
    // only on an actual enabled-toggle; otherwise just refreshes params).
    // rewireTail=true: masterFx was just disposed + rebuilt above, so the
    // fresh masterFx.output must be wired -> [chain] -> meter/Destination
    // even when the chain itself is unchanged.
    this.syncMasterChain(session.master.mastering, true);

    // Rebuild tracks.
    for (const t of this.tracks.values()) t.dispose();
    this.tracks.clear();
    for (const m of this.trackMeters.values()) m.dispose();
    this.trackMeters.clear();
    for (const tr of session.tracks) {
      const eng = buildTrack(tr, session.assets);
      eng.userMute = tr.mute;
      eng.userSolo = tr.solo;
      eng.output.connect(this.masterIn);
      // Parallel meter tap — a second `.connect()` off the same output
      // fans the signal out without removing the masterIn connection.
      const meter = new Tone.Meter({ channelCount: 1, smoothing: 0.7 });
      eng.output.connect(meter);
      this.trackMeters.set(tr.id, meter);
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
      // We do NOT use Tone.Transport.loop — in this app's audio graph its
      // native wrap never fires (the transport runs straight past loopEnd;
      // verified live). We loop manually instead: a background-safe timer
      // (startLoopInterval) watches the position and, at loopEnd, wraps by
      // stop()→seconds=loopStart→start(). That stop/seek/start sequence is
      // the ONLY reliable way to reposition the Tone 15 transport — writing
      // transport.seconds while it is *running* is silently a no-op.
      Tone.getTransport().loop = false;
      this.state.loopEnabled = args.loop.enabled;
      this.state.loopStartSeconds = args.loop.start;
      this.state.loopEndSeconds = args.loop.end;
    }
    this.emit();
  }

  /** Reposition the transport to `seconds` and (re)start playback there,
   *  rescheduling every clip. Uses stop()→seconds→start() because a bare
   *  `transport.seconds = x` is ignored while the transport is running. */
  private repositionAndPlay(seconds: number): void {
    const transport = Tone.getTransport();
    for (const id of this.playScheduleIds) transport.clear(id);
    this.playScheduleIds = [];
    for (const track of this.tracks.values()) {
      for (const pb of track.playbacks) {
        try { pb.player.stop(); } catch { /* not playing */ }
      }
    }
    transport.stop();
    transport.seconds = seconds;
    transport.start();
    this.state.positionSeconds = seconds;
    for (const track of this.tracks.values()) {
      for (const pb of track.playbacks) this.schedulePlayback(pb, seconds);
    }
    // Re-phase the click. The metronome is a wall-clock interval that
    // knows nothing about transport jumps, so a loop wrap would leave it
    // on its old phase — and each repeat overshoots loopEnd by up to one
    // 25ms watchdog tick, so the click drifts further off the downbeat
    // on every pass. Restarting here fires beat 1 at the new position,
    // matching what play() does when starting a looped region.
    if (this.metronomeIntervalId !== null) {
      this.stopMetronomeInterval();
      this.startMetronomeInterval();
    }
  }

  updateTrackStrip(trackId: string, patch: { volume_db?: number; pan?: number; mute?: boolean; solo?: boolean }): void {
    const t = this.tracks.get(trackId);
    if (!t) return;
    if (patch.mute !== undefined) t.userMute = patch.mute;
    if (patch.solo !== undefined) t.userSolo = patch.solo;
    t.updateStrip({ volume_db: patch.volume_db, pan: patch.pan });
    this.recomputeSolo();
  }

  /** Live master strip (the Inspector's "Master Out") — click-free 30ms
   *  ramps, no rebuild. Master volume/pan are deliberately NOT in the
   *  skeleton sig (a fader drag must never force a reload), so without
   *  this live path the sliders only mutated saved state and the bus
   *  never changed until some unrelated full reload. Mirrors
   *  EngineTrack.updateStrip's ramp/catch pattern. */
  updateMasterStrip(patch: { volume_db?: number; pan?: number }): void {
    const now = Tone.now();
    if (patch.volume_db !== undefined) {
      const g = dbToGain(patch.volume_db);
      try { this.masterIn.gain.cancelScheduledValues(now); this.masterIn.gain.linearRampTo(g, 0.03, now); }
      catch { this.masterIn.gain.value = g; }
    }
    if (patch.pan !== undefined) {
      try { this.masterPan.pan.cancelScheduledValues(now); this.masterPan.pan.linearRampTo(patch.pan, 0.03, now); }
      catch { this.masterPan.pan.value = patch.pan; }
    }
  }

  /** Incremental clip add. The new asset's signed URL must already be
   *  in the cache (caller's responsibility) — `scheduleAudioClip` reads
   *  it synchronously. No other tracks, players, or FX nodes touched.
   *  Pairs with `useStudio`'s diff path so a recording lands without a
   *  full engine reload. */
  addClipToTrack(trackId: string, clip: AudioClip, asset: AudioAsset): void {
    const t = this.tracks.get(trackId);
    if (!t) return;
    t.addClip(clip, asset);
  }

  /** Incremental clip remove. */
  removeClipFromTrack(trackId: string, clipId: string): void {
    const t = this.tracks.get(trackId);
    if (!t) return;
    t.removeClip(clipId);
  }

  /** Whether the engine has a live EngineTrack for this id. Used by
   *  useStudio to decide whether incremental updates are safe (false
   *  means we have to fall back to loadSession). */
  hasTrack(trackId: string): boolean {
    return this.tracks.has(trackId);
  }

  /** Per-track PPM peak read, in dB (see `trackMeters` above). Polled
   *  once per animation frame per visible ChannelStrip by MixerView's
   *  meter loop — ballistics (attack/release/peak-hold) are applied in
   *  the UI via mixerMath's `ppmDecay`, the same way the transport bar's
   *  existing peakDbL/R meter already works. -Infinity for an unknown
   *  or not-yet-built track. */
  getTrackPeakDb(trackId: string): number {
    const m = this.trackMeters.get(trackId);
    if (!m) return -Infinity;
    const v = m.getValue();
    return Array.isArray(v) ? (v[0] ?? -Infinity) : v;
  }

  // ── Runtime-hook aliases ──────────────────────────────────────────
  // Thin shape-matching wrappers so `useStudioEngineRuntime` can call
  // the engine with the API shape it expects (linear-volume-like
  // setTrackVolume, addClipIncremental(trackId, clip, assetUrl)).
  // No new behavior — these delegate straight through.

  /** dB volume on a track strip, click-free via updateTrackStrip's
   *  ramp. Identity-aliases the canonical updateTrackStrip. */
  setTrackVolume(trackId: string, volumeDb: number): void {
    this.updateTrackStrip(trackId, { volume_db: volumeDb });
  }

  /** Add a clip whose asset URL is already known to the caller. Primes
   *  the URL cache so scheduleAudioClip's synchronous lookup hits, then
   *  delegates to addClipToTrack with a synthetic AudioAsset. Use this
   *  when the caller has a local blob URL (e.g. a fresh recording) and
   *  doesn't want to round-trip through Supabase storage. */
  addClipIncremental(
    trackId: string,
    clip: AudioClip,
    assetUrl: string,
    assetMeta: Partial<AudioAsset> = {},
  ): void {
    const assetId = clip.asset_id;
    setAssetUrl(assetId, assetUrl);
    const synthetic: AudioAsset = {
      id: assetId,
      filename: assetMeta.filename ?? `${assetId}.wav`,
      format: assetMeta.format ?? 'wav',
      duration_seconds: assetMeta.duration_seconds ?? clip.duration_seconds,
      sample_rate: assetMeta.sample_rate ?? 44100,
      channels: assetMeta.channels ?? 2,
      size_bytes: assetMeta.size_bytes ?? 0,
      peaks: assetMeta.peaks,
    };
    this.addClipToTrack(trackId, clip, synthetic);
  }

  /** Mirror of removeClipFromTrack — same method name as the
   *  runtime-hook spec. */
  removeClipIncremental(trackId: string, clipId: string): void {
    this.removeClipFromTrack(trackId, clipId);
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
    let pos = transport.seconds;
    const looping = this.state.loopEnabled && this.state.loopEndSeconds > this.state.loopStartSeconds;

    // When looping, always begin at the region's left edge so every Play
    // auditions the region. When the head sits outside a valid loop window
    // we must reposition, and while not looping we auto-rewind if the head
    // is parked past the last clip. Both cases require a real reposition
    // (stop→seconds→start), since a bare transport.seconds write while the
    // clock is running is a no-op in Tone 15.
    if (looping) {
      this.state.isPlaying = true;
      this.repositionAndPlay(this.state.loopStartSeconds);
      if (this.state.metronomeOn) this.startMetronomeInterval();
      this.startLoopInterval();
      this.emit();
      this.startPositionLoop();
      return;
    }

    // Auto-rewind guard: if the transport has advanced past every clip's
    // end (typical after playing a clip to completion + pressing Play
    // again without seeking Home), snap back to 0 so the next Play
    // actually plays something.
    let latestClipEnd = 0;
    for (const track of this.tracks.values()) {
      for (const pb of track.playbacks) {
        const end = pb.startSeconds + pb.durationSeconds;
        if (end > latestClipEnd) latestClipEnd = end;
      }
    }
    if (latestClipEnd > 0 && pos >= latestClipEnd) {
      this.state.isPlaying = true;
      this.repositionAndPlay(0);
      if (this.state.metronomeOn) this.startMetronomeInterval();
      this.emit();
      this.startPositionLoop();
      return;
    }

    this.state.positionSeconds = pos;
    // Plain start from the current clock position (no reposition needed).
    transport.start();
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

  /** Recording guard — StudioEditor flips this around every take so the
   * loop watchdog can't wrap the transport mid-recording. Also mirrored
   * onto EngineState.recordingActive (B1 follow-up) so UI consumers —
   * e.g. MixerView's loudness servo — can read the same flag instead of
   * duplicating it via a second recording-state plumbing path. */
  setRecordingActive(active: boolean): void {
    this.recordingActive = active;
    this.state.recordingActive = active;
    this.emit();
  }

  private startLoopInterval(): void {
    if (this.loopCheckIntervalId !== null) return;
    this.loopCheckIntervalId = setInterval(() => {
      const wrap = shouldLoopWrap({
        isPlaying: this.state.isPlaying,
        loopEnabled: this.state.loopEnabled,
        recordingActive: this.recordingActive,
        positionSeconds: Tone.getTransport().seconds,
        loopStartSeconds: this.state.loopStartSeconds,
        loopEndSeconds: this.state.loopEndSeconds,
      });
      if (wrap) this.repositionAndPlay(this.state.loopStartSeconds);
    }, 25);
  }

  private stopLoopInterval(): void {
    if (this.loopCheckIntervalId !== null) {
      clearInterval(this.loopCheckIntervalId);
      this.loopCheckIntervalId = null;
    }
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

  /** Reposition and start playback at `seconds` in one atomic step.
   * Used by the punch pre-roll, which must land exactly at
   * punch-in − pre-roll — play()'s loop-snap and auto-rewind
   * heuristics would move the head somewhere else. */
  playFrom(seconds: number): void {
    this.state.isPlaying = true;
    this.repositionAndPlay(Math.max(0, seconds));
    if (this.state.metronomeOn) this.startMetronomeInterval();
    if (this.state.loopEnabled) this.startLoopInterval();
    this.emit();
    this.startPositionLoop();
  }

  pause(): void {
    Tone.getTransport().pause();
    this.state.isPlaying = false;
    this.stopMetronomeInterval();
    this.stopLoopInterval();
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
    this.stopLoopInterval();
    this.emit();
    this.stopPositionLoop();
  }

  seek(seconds: number): void {
    const where = Math.max(0, seconds);
    const wasPlaying = this.state.isPlaying;
    const transport = Tone.getTransport();

    if (wasPlaying) {
      // In-flight clip Players are unaware of the transport jump — they
      // keep streaming their original buffer until they end. Stop them
      // and clear the pending schedules, then re-play from the new
      // position so each clip starts at the correct offset. Matches the
      // iOS engine's seek() behavior; without this, rewinding while a
      // click is playing leaves audio stuck on the old timeline until
      // the user hits Stop + Play.
      for (const id of this.playScheduleIds) transport.clear(id);
      this.playScheduleIds = [];
      for (const track of this.tracks.values()) {
        for (const pb of track.playbacks) {
          try { pb.player.stop(); } catch { /* not playing */ }
        }
      }
    }

    transport.seconds = where;
    this.state.positionSeconds = where;

    if (wasPlaying) {
      // Re-schedule every clip against the new transport position so the
      // playhead resumes mid-clip if applicable.
      for (const track of this.tracks.values()) {
        for (const pb of track.playbacks) this.schedulePlayback(pb, where);
      }
    }
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
