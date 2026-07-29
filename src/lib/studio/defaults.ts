// Factory functions for fresh Studio sessions, tracks, clips, FX.
// All ids are generated as uuids; transports default to 4/4 at 120 bpm.

import {
  STUDIO_SCHEMA_VERSION, MASTER_BUS_ID,
  type Session, type AudioTrack, type MidiTrack,
  type FxNode, type FxType, type MasterBus, type Bus, type Instrument,
} from './session';

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
  ? crypto.randomUUID()
  : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function newSession(args: {
  tenantId: string;
  ownerUserId: string;
  title?: string;
}): Session {
  const now = new Date().toISOString();
  return {
    id: uid(),
    schema_version: STUDIO_SCHEMA_VERSION,
    title: args.title ?? 'Untitled session',
    tempo_bpm: 120,
    time_signature: { numerator: 4, denominator: 4 },
    length_seconds: 60,
    master: newMasterBus(),
    tracks: [],
    assets: [],
    owner_user_id: args.ownerUserId,
    tenant_id: args.tenantId,
    created_at: now,
    updated_at: now,
  };
}

/** Factory for test sessions. Like newSession but allows overriding the id. */
export function blankSession(args: {
  id: string;
  ownerUserId: string;
  tenantId: string;
  title: string;
}): Session {
  const s = newSession({
    ownerUserId: args.ownerUserId,
    tenantId: args.tenantId,
    title: args.title,
  });
  return { ...s, id: args.id };
}

export function newMasterBus(): MasterBus {
  return { volume_db: 0, pan: 0, fx: [] };
}

/** v2.0.0 factory — a fresh user bus routed to master. */
export function newBus(name = 'Bus'): Bus {
  return {
    id: uid(),
    name,
    color: '#8a8f9c',
    volume_db: 0,
    pan: 0,
    mute: false,
    solo: false,
    fx: [],
    output: { bus_id: MASTER_BUS_ID },
  };
}

export function newAudioTrack(name = 'Audio'): AudioTrack {
  return {
    id: uid(),
    kind: 'audio',
    name,
    color: '#3b82f6',
    volume_db: 0,
    pan: 0,
    mute: false,
    solo: false,
    arm: false,
    fx: [],
    clips: [],
  };
}

export function newMidiTrack(name = 'MIDI'): MidiTrack {
  return {
    id: uid(),
    kind: 'midi',
    name,
    color: '#a855f7',
    volume_db: 0,
    pan: 0,
    mute: false,
    solo: false,
    arm: false,
    fx: [],
    clips: [],
    instrument: newInstrument('synth_basic'),
  };
}

export function newInstrument(type: Instrument['type'] = 'synth_basic'): Instrument {
  if (type === 'synth_basic') {
    return { type, preset_id: 'sine', params: { attack_ms: 5, release_ms: 200 } };
  }
  return { type, params: {} };
}

// ── Default FX params ────────────────────────────────────────────────
//
// Sensible musical defaults so dragging an FX onto a track sounds
// reasonable without further tweaking.

const DEFAULT_FX_PARAMS: Record<FxType, Record<string, number | string | boolean>> = {
  gain: { gain_db: 0 },
  eq3: { low_db: 0, mid_db: 0, high_db: 0, mid_hz: 1000 },
  compressor: { threshold_db: -18, ratio: 3, attack_ms: 5, release_ms: 80, makeup_db: 0 },
  reverb: { wet: 0.25, room_size: 0.6, damp: 0.5 },
  delay: { time_ms: 350, feedback: 0.35, wet: 0.25 },
  filter: { kind: 'low', cutoff_hz: 1000, q: 0.7 },
};

export function newFxNode(type: FxType): FxNode {
  return {
    id: uid(),
    type,
    enabled: true,
    params: { ...DEFAULT_FX_PARAMS[type] },
  };
}

// Expose uid for storage / tests if needed.
export { uid as newId };
