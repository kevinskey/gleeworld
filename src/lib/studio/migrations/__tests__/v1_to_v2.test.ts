import { describe, it, expect } from 'vitest';
import { migrateV1ToV2 } from '../v1_to_v2';
import { migrateSession } from '../index';
import { requiredSchemaVersion, MASTER_BUS_ID, type Session } from '../../session';
import { newSession, newAudioTrack, newMidiTrack } from '../../defaults';

/** v1.0.0 session as it would appear on disk — no output/sends/buses.
 *
 * schema_version is stamped EXPLICITLY. newSession() stamps
 * STUDIO_SCHEMA_VERSION — the current WRITE target — which was '1.0.0' when
 * this fixture was written (ff482b98b) and has since moved to '2.1.0'. Left
 * implicit, this helper stopped producing a v1 session the moment that
 * constant advanced, and the version-preservation test below silently started
 * asserting against a session that was never v1 in the first place. Pinning it
 * here is what actually makes this a v1 fixture, and keeps it one across every
 * future bump. */
function v1Session(): Session {
  const s = newSession({ tenantId: 't', ownerUserId: 'u' });
  const track = newAudioTrack('Vocals');
  // Strip v2 fields that newAudioTrack doesn't set anyway.
  delete (track as { output?: unknown }).output;
  delete (track as { sends?: unknown }).sends;
  delete (track as { input_monitor?: unknown }).input_monitor;
  return { ...s, schema_version: '1.0.0', tracks: [track] };
}

describe('migrateV1ToV2', () => {
  it('adds an empty buses array to a v1 session', () => {
    const s = v1Session();
    delete (s as { buses?: unknown }).buses;
    const m = migrateV1ToV2(s);
    expect(m.buses).toEqual([]);
  });

  it('defaults every track to output → master, empty sends, auto monitor', () => {
    const m = migrateV1ToV2(v1Session());
    for (const t of m.tracks) {
      expect(t.output).toEqual({ bus_id: MASTER_BUS_ID });
      expect(t.sends).toEqual([]);
      expect(t.input_monitor).toBe('auto');
    }
  });

  it('does NOT stamp schema_version to 2.0.0 — that is a save-time decision', () => {
    const m = migrateV1ToV2(v1Session());
    // Load-time migration is behavior-preserving; the version bump is
    // reserved for requiredSchemaVersion() at save time when v2 features
    // are actually used. Round-tripping a v1 session through load must
    // keep its stamp so the shipped iOS app can still open it after the
    // web edits it.
    expect(m.schema_version).toBe('1.0.0');
  });

  it('is idempotent — calling twice yields the same shape as once', () => {
    const once = migrateV1ToV2(v1Session());
    const twice = migrateV1ToV2(once);
    expect(twice).toEqual(once);
  });

  it('does not overwrite v2 fields when they are already present', () => {
    const s = v1Session();
    const busId = 'reverb-bus';
    const trackWithRouting = {
      ...s.tracks[0],
      output: { bus_id: busId },
      sends: [{
        id: 'snd1', target_bus_id: busId, level_db: -6, enabled: true, pre_fader: false,
      }],
      input_monitor: 'on' as const,
    };
    const withBus: Session = {
      ...s,
      tracks: [trackWithRouting],
      buses: [{
        id: busId, name: 'Reverb', color: '#8a8f9c', volume_db: 0, pan: 0,
        mute: false, solo: false, fx: [], output: { bus_id: MASTER_BUS_ID },
      }],
    };
    const m = migrateV1ToV2(withBus);
    expect(m.tracks[0].output).toEqual({ bus_id: busId });
    expect(m.tracks[0].sends).toHaveLength(1);
    expect(m.tracks[0].input_monitor).toBe('on');
    expect(m.buses).toHaveLength(1);
    expect(m.buses![0].id).toBe(busId);
  });

  it('handles a MIDI track just like an audio track', () => {
    const s = v1Session();
    const midi = newMidiTrack('Piano');
    delete (midi as { output?: unknown }).output;
    delete (midi as { sends?: unknown }).sends;
    delete (midi as { input_monitor?: unknown }).input_monitor;
    const m = migrateV1ToV2({ ...s, tracks: [midi] });
    expect(m.tracks[0].output).toEqual({ bus_id: MASTER_BUS_ID });
    expect(m.tracks[0].sends).toEqual([]);
    expect(m.tracks[0].input_monitor).toBe('auto');
  });
});

describe('migrateSession (chain)', () => {
  it('exports the same result as migrateV1ToV2 for a v1 session', () => {
    const s = v1Session();
    expect(migrateSession(s)).toEqual(migrateV1ToV2(s));
  });
});

describe('requiredSchemaVersion after migration', () => {
  it('stays 1.0.0 for a v1 session that was only migrated (no v2 features used)', () => {
    const m = migrateV1ToV2(v1Session());
    expect(requiredSchemaVersion(m)).toBe('1.0.0');
  });

  it('bumps to 2.0.0 when a track routes to a non-master bus', () => {
    const m = migrateV1ToV2(v1Session());
    const routed: Session = {
      ...m,
      buses: [{
        id: 'reverb', name: 'Reverb', color: '#8a8f9c', volume_db: 0, pan: 0,
        mute: false, solo: false, fx: [], output: { bus_id: MASTER_BUS_ID },
      }],
      tracks: m.tracks.map((t) => ({ ...t, output: { bus_id: 'reverb' } })),
    };
    expect(requiredSchemaVersion(routed)).toBe('2.0.0');
  });

  it('bumps to 2.0.0 when a track has a send, even if output is still master', () => {
    const m = migrateV1ToV2(v1Session());
    const withSend: Session = {
      ...m,
      buses: [{
        id: 'reverb', name: 'Reverb', color: '#8a8f9c', volume_db: 0, pan: 0,
        mute: false, solo: false, fx: [], output: { bus_id: MASTER_BUS_ID },
      }],
      tracks: m.tracks.map((t) => ({
        ...t,
        sends: [{ id: 's1', target_bus_id: 'reverb', level_db: -6, enabled: true, pre_fader: false }],
      })),
    };
    expect(requiredSchemaVersion(withSend)).toBe('2.0.0');
  });

  it('bumps to 2.0.0 when the session declares user buses even without routing changes', () => {
    // Loose end: declaring a bus without any track pointing at it is a
    // valid v2 state (user created a bus in the UI before wiring). Must
    // still count as v2 so a v1-only client refuses to open it.
    const m = migrateV1ToV2(v1Session());
    const withBus: Session = {
      ...m,
      buses: [{
        id: 'reverb', name: 'Reverb', color: '#8a8f9c', volume_db: 0, pan: 0,
        mute: false, solo: false, fx: [], output: { bus_id: MASTER_BUS_ID },
      }],
    };
    expect(requiredSchemaVersion(withBus)).toBe('2.0.0');
  });
});
