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
// from tempo_bpm. Phase 1 keeps routing simple: every track lands on the
// master bus. Sends/buses are deferred to Phase 2.
//
// Mirror this file faithfully in ios/App/App/StudioModel.swift.

export const STUDIO_SCHEMA_VERSIONS = ['1.0.0', '1.1.0'] as const;
export type StudioSchemaVersion = typeof STUDIO_SCHEMA_VERSIONS[number];
/** Baseline version for sessions that use no 1.1.0 features. Kept at
 * 1.0.0 so manifests stay openable by the shipped iOS app (its decoder
 * hard-rejects unknown versions). Writers stamp requiredSchemaVersion(). */
export const STUDIO_SCHEMA_VERSION: StudioSchemaVersion = '1.0.0';

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
  fx: FxNode[];
  eq?: TrackEqBand[];  // optional — absent on sessions written before Mixer/Mastering (B1)
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
  fx: FxNode[];        // applied to the final mix
  mastering?: MasteringParams; // optional — absent on sessions written before Mixer/Mastering (B1)
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
  assets: AudioAsset[];

  // Ownership + lineage
  owner_user_id: string;
  tenant_id: string;
  created_at: string;                // ISO timestamp
  updated_at: string;                // ISO timestamp
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

/** The minimum schema version that can represent this session: 1.1.0
 * only when some MIDI clip actually uses cc events, else 1.0.0. */
export function requiredSchemaVersion(session: Session): StudioSchemaVersion {
  for (const t of session.tracks) {
    if (t.kind !== 'midi') continue;
    for (const c of t.clips) if (c.cc && c.cc.length > 0) return '1.1.0';
  }
  return '1.0.0';
}
