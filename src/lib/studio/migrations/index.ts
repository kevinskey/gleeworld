// Load-time session migration chain.
//
// Run right after parse, before validation, so downstream code sees a
// Session with every v2 field populated regardless of the manifest's
// declared `schema_version`.
//
// Chain is additive and idempotent:
//   (any version) --migrateV1ToV2--> (v2-shaped in memory)
//
// The stamped `schema_version` on disk is UNCHANGED by this step; save
// time re-derives it from `requiredSchemaVersion()`. That way a v1
// session that gets loaded, viewed, and saved without touching any v2
// feature round-trips back to disk as v1 — the shipped iOS app can
// still open it.

import type { Session } from '../session';
import { migrateV1ToV2 } from './v1_to_v2';

export function migrateSession(session: Session): Session {
  return migrateV1ToV2(session);
}
