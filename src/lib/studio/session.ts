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

export const STUDIO_SCHEMA_VERSION = '1.0.0' as const;
export type StudioSchemaVersion = typeof STUDIO_SCHEMA_VERSION;

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

export interface MidiClip {
  id: string;
  kind: 'midi';
  start_seconds: number;
  duration_seconds: number;
  notes: MidiNote[];
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

export interface MasterBus {
  volume_db: number;   // 0 default
  pan: number;         // 0 default
  fx: FxNode[];        // applied to the final mix
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
