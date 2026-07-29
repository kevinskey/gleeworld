// GleeWorld Studio — session schema.
//
// The contract that both the web ("Studio Light") and the iOS native
// engine ("Studio Pro") encode/decode against. A session is a single
// JSON document that lives at:
//
//   <bucket>/studio/<tenant_id>/sessions/<session_id>/manifest.json
//
// Audio assets referenced by clips live alongside it:
//
//   <bucket>/studio/<tenant_id>/sessions/<session_id>/audio/<asset_id>.<ext>
//
// Times are in seconds (floats) on the master timeline. Beats are derived
// from tempo_bpm.
//
// Routing (v2.0.0): every track has an `output` (defaults to the built-in
// `master` bus) and up to four `sends` to other buses. `session.buses` is
// the list of user-defined submixes; the implicit `master` bus needs no
// entry. v1.0.0/1.1.0 sessions predate this — the load-time migration
// (migrations/v1_to_v2.ts) fills in the defaults so runtime code can rely
// on them.
//
// Mirror this file faithfully in ios/App/App/StudioModel.swift.

export const STUDIO_SCHEMA_VERSIONS = ['1.0.0', '1.1.0', '2.0.0', '2.1.0'] as const;
export type StudioSchemaVersion = typeof STUDIO_SCHEMA_VERSIONS[number];
/** Baseline version for sessions that use no 1.1.0 / 2.0.0 / 2.1.0 features.
 * Kept at 1.0.0 so manifests stay openable by the shipped iOS app (its
 * decoder hard-rejects unknown versions). Writers stamp
 * requiredSchemaVersion(), which bumps only when v2 features are used. */
export const STUDIO_SCHEMA_VERSION: StudioSchemaVersion = '2.1.0';

/** Well-known bus id for the always-present master bus. Track `output`
 * defaults here; sends can target any bus INCLUDING master (though the
 * master is already the terminal sink). */
export const MASTER_BUS_ID = 'master';

/** Backing track or accompaniment source for a session.
 * Discriminated union on `kind`. */
export type Accompaniment =
  | {
      kind: 'file';
      title: string | null;
      fileUrl: string;
    }
  | {
      kind: 'apple_music' | 'apple_music_album';
      title: string | null;
      appleMusicId: string;
      appleMusicStorefront: string;
      appleMusicArtist: string | null;
      appleMusicArtworkUrl: string | null;
    }
  | {
      kind: 'youtube';
      title: string | null;
      youtubeUrl: string;
    };

/** V1 mixer caps — enforced by validation. Increasing later is safe;
 * decreasing would break in-flight sessions, so leave these alone. */
export const MAX_TRACKS = 16;
export const MAX_BUSES = 8;
export const MAX_SENDS_PER_TRACK = 4;
export const MAX_INSERTS_PER_STRIP = 4;

// ── Time + transport ─────────────────────────────────────────────────

export interface TimeSignature {
  numerator: number;   // beats per bar (1..32)
  denominator: number; // note value: 1, 2, 4, 8, 16
}

/** Named navigation point on the master timeline (Intro / Verse /
 * Chorus …). Optional on Session for backward compatibility — sessions
 * written before markers existed simply omit the array. */
export interface SessionMarker {
  id: string;
  name: string;
  seconds: number;   // position on the master timeline, >= 0
  color?: string;    // hex e.g. '#f59e0b'
}

// ── FX nodes ─────────────────────────────────────────────────────────
//
// Each effect type is identified by `type`. `params` is a flat record so
// new effects can ship without schema changes — the engine ignores keys
// it doesn't recognize. Document new params in this file when adding.

export type FxType =
  | 'gain'        // params: { gain_db }
  | 'eq3'         // params: { low_db, mid_db, high_db, mid_hz }
  | 'compressor'  // params: { threshold_db, ratio, attack_ms, release_ms, makeup_db }
  | 'reverb'      // params: { wet, room_size, damp }
  | 'delay'       // params: { time_ms, feedback, wet }
  | 'filter';     // params: { kind: 'low'|'high'|'band', cutoff_hz, q }

export interface FxNode {
  id: string;
  type: FxType;
  enabled: boolean;
  params: Record<string, number | string | boolean>;
}

// ── Audio + MIDI clips ───────────────────────────────────────────────

export interface AudioClip {
  id: string;
  kind: 'audio';
  asset_id: string;          // → AudioAsset.id
  start_seconds: number;     // position on the master timeline
  duration_seconds: number;  // length on the timeline after stretch
  offset_seconds: number;    // trim from the start of the source asset
  gain_db: number;
  fade_in_seconds: number;
  fade_out_seconds: number;
  reverse: boolean;
  pitch_semitones: number;   // -24..+24
  time_stretch: number;      // 1.0 = no stretch, >1 = longer
}

export interface MidiNote {
  pitch: number;             // 0..127
  velocity: number;          // 0..127
  start_seconds: number;     // relative to clip start
  duration_seconds: number;
}

/** A recorded continuous-controller event. 1.1.0 feature — a clip that
 * carries cc events forces the manifest to schema 1.1.0.
 * controller 64 = sustain pedal (down at value >= 64), 1 = mod wheel. */
export interface MidiCcEvent {
  controller: number;   // 0..127
  value: number;        // 0..127
  time_seconds: number; // relative to clip start
}

export interface MidiClip {
  id: string;
  kind: 'midi';
  start_seconds: number;
  duration_seconds: number;
  notes: MidiNote[];
  cc?: MidiCcEvent[];  // optional — absent on 1.0.0 clips
}

export type Clip = AudioClip | MidiClip;

// ── Instruments (MIDI tracks only) ───────────────────────────────────

export type InstrumentType = 'sampler' | 'synth_basic';

export interface Instrument {
  type: InstrumentType;
  // For 'sampler': preset_id refers to a built-in sound or to an
  // AudioAsset.id mapped across the keyboard.
  // For 'synth_basic': preset_id refers to a built-in synth patch.
  preset_id?: string;
  params: Record<string, number | string | boolean>;
}

// ── Tracks ───────────────────────────────────────────────────────────

export type TrackKind = 'audio' | 'midi';

/** RBJ-cookbook biquad EQ band on a track. `q` is the canonical RBJ Q —
 * see docs/superpowers/plans/2026-07-07-studio-mixer-mastering-b1.md
 * Global Constraints for the comment convention required wherever this
 * crosses into a platform API (Web Audio BiquadFilterNode.Q etc). */
export interface TrackEqBand {
  type: 'highpass' | 'lowshelf' | 'peaking' | 'highshelf';
  freq_hz: number;
  gain_db: number;
  q: number;
  enabled: boolean;
}

/** Where a track's post-fader signal terminates. v2.0.0. */
export interface TrackOutput {
  /** Bus id — either MASTER_BUS_ID or a Bus.id in session.buses. Runtime
   * validation rejects sends/outputs pointing at a bus that doesn't exist. */
  bus_id: string;
}

/** A single send from a track to a bus. v2.0.0. Cap of 4 per track
 * (MAX_SENDS_PER_TRACK). Pre-fader sends read the signal BEFORE the
 * track's volume/pan; post-fader reads AFTER. */
export interface Send {
  id: string;
  target_bus_id: string;   // must resolve to MASTER_BUS_ID or a Bus.id
  level_db: number;        // -inf to +6, 0 default
  enabled: boolean;
  /** true = tap before the track fader (send doesn't follow volume);
   *  false = tap after (send scales with the fader). Default false (post). */
  pre_fader: boolean;
}

/** Live-input monitoring mode. v2.0.0. Only meaningful during a take —
 *  the engine reads this when the track is armed. Default 'auto' (monitor
 *  while armed, mute at other times). */
export type InputMonitorMode = 'off' | 'auto' | 'on';

interface TrackBase {
  id: string;
  kind: TrackKind;
  name: string;
  color: string;       // hex e.g. '#ff8800'
  volume_db: number;   // 0 default; -inf to +6
  pan: number;         // -1..1
  mute: boolean;
  solo: boolean;
  arm: boolean;        // recording armed
  fx: FxNode[];        // v2 terminology: inserts. Capped at MAX_INSERTS_PER_STRIP.
  eq?: TrackEqBand[];  // optional — absent on sessions written before Mixer/Mastering (B1)
  // ── v2.0.0 additions (optional — v1 sessions default via migration) ──
  output?: TrackOutput;      // defaults to { bus_id: MASTER_BUS_ID }
  sends?: Send[];            // defaults to []
  input_monitor?: InputMonitorMode; // defaults to 'auto'
}

export interface AudioTrack extends TrackBase {
  kind: 'audio';
  clips: AudioClip[];
}

export interface MidiTrack extends TrackBase {
  kind: 'midi';
  clips: MidiClip[];
  instrument: Instrument;
}

export type Track = AudioTrack | MidiTrack;

// ── Master bus ───────────────────────────────────────────────────────

/** Canonical mastering chain params (HPF → air shelf → glue comp →
 * look-ahead limiter, EBU R128 loudness target). Stored on the session
 * and never passed to platform APIs by name — see B1 plan Global
 * Constraints for the canonical→node mapping notes (Task 4/5).
 * `comp.attack_ms`/`release_ms` = time to reach 90% of the target gain
 * change (NOT the Web Audio DynamicsCompressorNode convention). */
export interface MasteringParams {
  enabled: boolean;
  hpf_hz: number;
  air_gain_db: number;
  comp: { threshold_db: number; ratio: number; attack_ms: number; release_ms: number };
  limiter: { ceiling_db: number; release_ms: number };
  loudness_target_lufs: number;
}

/** Verbatim defaults from the B1 spec/research briefs — do not tweak
 * without updating the spec and the rendered-reference fixtures
 * (Task 8), which are pinned to these exact values. */
export const DEFAULT_MASTERING: MasteringParams = {
  enabled: false,
  hpf_hz: 60,
  air_gain_db: 1,
  comp: { threshold_db: -18, ratio: 2, attack_ms: 10, release_ms: 250 },
  limiter: { ceiling_db: -1, release_ms: 200 },
  loudness_target_lufs: -14,
};

export interface MasterBus {
  volume_db: number;   // 0 default
  pan: number;         // 0 default
  fx: FxNode[];        // applied to the final mix (v2: inserts on the master strip)
  mastering?: MasteringParams; // optional — absent on sessions written before Mixer/Mastering (B1)
}

/** A user-defined stereo submix. v2.0.0. Tracks and other buses route
 * into it via `output` or `sends`; its own `output` names the downstream
 * target (default MASTER_BUS_ID). Routing cycles are rejected at load
 * time (see routingGraph.ts, Phase 4). */
export interface Bus {
  id: string;
  name: string;
  color: string;       // hex e.g. '#8a8f9c'
  volume_db: number;   // 0 default
  pan: number;         // 0 default
  mute: boolean;
  solo: boolean;
  fx: FxNode[];        // bus inserts, capped at MAX_INSERTS_PER_STRIP
  output: TrackOutput; // where this bus terminates — default { bus_id: MASTER_BUS_ID }
}

// ── Automation (v2.0.0, Phase 8) ─────────────────────────────────────
//
// Breakpoint automation for a single strip parameter.
//
// Modes (Logic-Pro convention):
//   - 'off'   — envelope stored but ignored during playback.
//   - 'read'  — engine schedules ramps against the transport (Phase 8).
//   - 'write' — while transport is playing, EVERY live fader/pan move
//               captures a point at the playhead (punch-write).
//   - 'touch' — engine reads the envelope until the user grabs the
//               control; then captures until release. On release the
//               envelope takes back over.
//   - 'latch' — like 'touch', but keeps capturing after release until
//               transport stops.
//
// Interpolation math lives in automation.ts; the engine schedules Tone
// AudioParam ramps against the transport clock when play() starts
// (engine/automation.ts). Capture happens in the mixer's setStrip /
// setBusStrip; see writeAutomationPoint in automation.ts.

export type AutomationParam = 'volume_db' | 'pan';
export type AutomationCurve = 'hold' | 'linear' | 'exponential';
export type AutomationMode = 'off' | 'read' | 'write' | 'touch' | 'latch';

export interface AutomationPoint {
  time_seconds: number;   // transport position; >= 0
  value: number;
  /** How the ramp INTO this point interpolates from the previous one.
   *  The first point's curve is unused (nothing to interpolate from). */
  curve: AutomationCurve;
}

export interface Automation {
  /** id of a Track OR a Bus this envelope automates. */
  target_id: string;
  target_kind: 'track' | 'bus';
  param: AutomationParam;
  mode: AutomationMode;
  points: AutomationPoint[];
}

// ── Audio assets ─────────────────────────────────────────────────────
//
// Inline in the session manifest (no separate DB table). Multiple clips
// can reference the same asset (e.g. a kick reused across the song).
// The file lives at audio/<id>.<ext> within the session's storage prefix.

export interface AudioAsset {
  id: string;
  filename: string;          // display name, e.g. 'verse-vocal.wav'
  // 'webm' is the default recorder output (MediaRecorder defaults to
  // audio/webm on Chrome/Firefox). 'mp4' covers Safari/iOS recordings.
  format: 'wav' | 'mp3' | 'aac' | 'flac' | 'ogg' | 'webm' | 'mp4' | 'm4a';
  duration_seconds: number;
  sample_rate: number;       // 44100, 48000, ...
  channels: number;          // 1 mono, 2 stereo
  size_bytes: number;
  // Optional pre-rendered waveform peaks (mono, normalized -1..1)
  // for fast timeline rendering. Length is independent of duration.
  peaks?: number[];
}

// ── Session ──────────────────────────────────────────────────────────

export interface Session {
  id: string;
  schema_version: StudioSchemaVersion;
  title: string;
  description?: string;

  // Transport
  tempo_bpm: number;                 // 120 default
  time_signature: TimeSignature;     // { numerator: 4, denominator: 4 }
  length_seconds: number;            // declared session length; engine clamps clips
  markers?: SessionMarker[];         // named timeline markers (absent on older sessions)

  // Mix
  master: MasterBus;
  tracks: Track[];
  buses?: Bus[];        // v2.0.0 — absent on v1 sessions; migration fills [].
  automation?: Automation[];  // v2.0.0 (Phase 8) — read-mode breakpoint envelopes.
  assets: AudioAsset[];

  // Ownership + lineage
  owner_user_id: string;
  tenant_id: string;
  created_at: string;                // ISO timestamp
  updated_at: string;                // ISO timestamp

  // v2.1.0 — optional accompaniment/score reference
  accompaniment?: Accompaniment | null;
  scoreId?: string | null;
}

// ── Convenience type guards ──────────────────────────────────────────

export const isAudioTrack = (t: Track): t is AudioTrack => t.kind === 'audio';
export const isMidiTrack = (t: Track): t is MidiTrack => t.kind === 'midi';
export const isAudioClip = (c: Clip): c is AudioClip => c.kind === 'audio';
export const isMidiClip = (c: Clip): c is MidiClip => c.kind === 'midi';

// ── Backward-compat helpers ──────────────────────────────────────────
//
// session.ts has no runtime normalize/load path of its own (validate.ts
// only checks shape; defaults.ts only builds brand-new sessions) — so a
// legacy session loaded from storage without `master.mastering` is
// already a structurally valid Session (the field is optional). This
// helper fills in DEFAULT_MASTERING for callers (e.g. the Mixer view)
// that want a concrete MasteringParams to render/bind against, without
// mutating the caller's session or writing defaults back to storage.

/** Returns a session whose `master.mastering` is guaranteed to be a
 * concrete MasteringParams — DEFAULT_MASTERING when the loaded session
 * predates Mixer/Mastering (B1). Does not mutate `session`. */
export function withMasteringDefaults(session: Session): Session {
  if (session.master.mastering) return session;
  return {
    ...session,
    master: { ...session.master, mastering: { ...DEFAULT_MASTERING } },
  };
}

/** Load-time guard against a corrupt/absent `cc` field (spec §7: treat
 * corrupt/absent cc as `[]`). Used wherever a clip's cc is read on a path
 * that can't rely on validateSession() having run first — e.g. the engine
 * scheduling a clip straight from a loaded session. Returns [] unless the
 * input is an array, and filters out any entry that isn't a well-formed
 * MidiCcEvent (numeric controller/value in 0..127, finite time_seconds
 * >= 0) rather than rejecting the whole array for one bad entry. */
export function sanitizeCc(cc: unknown): MidiCcEvent[] {
  if (!Array.isArray(cc)) return [];
  return cc.filter((ev): ev is MidiCcEvent => {
    if (!ev || typeof ev !== 'object') return false;
    const e = ev as Partial<MidiCcEvent>;
    return Number.isInteger(e.controller) && e.controller! >= 0 && e.controller! <= 127
      && Number.isInteger(e.value) && e.value! >= 0 && e.value! <= 127
      && typeof e.time_seconds === 'number' && Number.isFinite(e.time_seconds) && e.time_seconds >= 0;
  });
}

/** The minimum schema version that can represent this session:
 *
 *   2.0.0 — some track has a non-master output, a non-empty sends list,
 *           or the session declares any user buses. A 1.x-only client
 *           would silently drop the routing and mix everything into the
 *           master, which is wrong, so the manifest must refuse to load
 *           there instead of playing back a broken mix.
 *   1.1.0 — some MIDI clip actually uses cc events OR a track uses a
 *           premium 'gw:' instrument (a 1.0.0-only client would render
 *           those as the basic synth kit — garbled noise — so it must
 *           refuse the manifest instead).
 *   1.0.0 — baseline (openable by the shipped iOS app).
 *
 * A corrupt/non-array `cc` (truthy but not a real array) must NOT stamp
 * 1.1.0 — it's not a real cc feature, it's garbage that sanitizeCc()
 * will reduce to [] on load, so schema stays at the 1.0.0 baseline.
 * Same story for v2: an EMPTY buses array + all tracks pointing at
 * master + no sends is behaviorally identical to a v1 session — no bump. */
export function requiredSchemaVersion(session: Session): StudioSchemaVersion {
  // Highest-first so we return as soon as any v2 feature is found.
  if (usesV2Routing(session)) return '2.0.0';
  for (const t of session.tracks) {
    if (t.kind !== 'midi') continue;
    if (t.instrument?.preset_id?.startsWith('gw:')) return '1.1.0';
    for (const c of t.clips) if (sanitizeCc(c.cc).length > 0) return '1.1.0';
  }
  return '1.0.0';
}

/** True when the session's routing goes beyond "every track → master".
 * Extracted so the version stamp and the v1→v2 migration idempotency
 * check read from the same source of truth. */
function usesV2Routing(session: Session): boolean {
  if (Array.isArray(session.buses) && session.buses.length > 0) return true;
  if (Array.isArray(session.automation) && session.automation.length > 0) return true;
  for (const t of session.tracks) {
    if (t.output && t.output.bus_id !== MASTER_BUS_ID) return true;
    if (Array.isArray(t.sends) && t.sends.length > 0) return true;
  }
  return false;
}
