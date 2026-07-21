// v1.0.0 / v1.1.0 → v2.0.0 session migration.
//
// v2.0.0 adds bus/send/output routing (§4 of the mixer refactor plan).
// v1 sessions predate all of it — the migration fills in the defaults
// so runtime code can rely on `track.output`, `track.sends`, and
// `session.buses` being present without conditional access everywhere.
//
// The migration is intentionally BEHAVIOR-PRESERVING:
//   • `session.buses` defaults to `[]` (no user buses).
//   • `track.output` defaults to `{ bus_id: MASTER_BUS_ID }` — same
//     routing every v1 session already had implicitly.
//   • `track.sends` defaults to `[]`.
//   • `track.input_monitor` defaults to `'auto'` — matches prior
//     behavior (the engine monitored while armed).
//
// It DOES NOT bump `schema_version` to '2.0.0'. That stamp is applied
// by `requiredSchemaVersion()` at save time, and only when the session
// actually uses a v2 feature (a non-master output, a send, or a user
// bus). A round-trip load-migrate-save of a v1 session must round-trip
// AS v1 — otherwise the shipped iOS app would refuse to open it after
// a single web edit.

import type { Session, Track } from '../session';
import { MASTER_BUS_ID } from '../session';

/** Add v2 defaults to any Session (v1.x or already v2). Idempotent —
 * calling it twice yields the same result as calling it once. */
export function migrateV1ToV2(session: Session): Session {
  const migratedTracks: Track[] = session.tracks.map((t) => {
    // Only assign fields that are actually missing; leave present ones
    // alone (a v2 session round-tripping through this function must not
    // have its routing overwritten).
    const patch: Partial<Track> = {};
    if (!t.output) patch.output = { bus_id: MASTER_BUS_ID };
    if (!Array.isArray(t.sends)) patch.sends = [];
    if (t.input_monitor === undefined) patch.input_monitor = 'auto';
    if (Object.keys(patch).length === 0) return t;
    // The `Partial<Track>` merge is safe: TrackBase fields are shared
    // by AudioTrack + MidiTrack, and none of the fields we're patching
    // are discriminants.
    return { ...t, ...patch } as Track;
  });

  const migratedBuses = Array.isArray(session.buses) ? session.buses : [];

  return {
    ...session,
    tracks: migratedTracks,
    buses: migratedBuses,
  };
}
