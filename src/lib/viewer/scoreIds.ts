// Route-level ID space for the Viewer. Tenant scores use a bare `gw_sheet_music`
// UUID; personal scores (gw_personal_scores, per-user) are prefixed `p_` so
// one route (/dashboard/viewer/:scoreId) can address either without a
// schema-cross join. Anything downstream that FKs into gw_sheet_music
// (bookmarks, annotations, setlists) MUST use tenantScoreId(id) — passing
// a prefixed id straight through would produce silent RLS/PK misses.
const PERSONAL_PREFIX = 'p_';

export function isPersonalScoreId(id: string | undefined | null): boolean {
  return !!id && id.startsWith(PERSONAL_PREFIX);
}

export function toPersonalScoreId(bareUuid: string): string {
  return PERSONAL_PREFIX + bareUuid;
}

export function stripPersonalPrefix(id: string): string {
  return id.startsWith(PERSONAL_PREFIX) ? id.slice(PERSONAL_PREFIX.length) : id;
}

/** UUID to feed a tenant-scoped table. Returns undefined for personal ids so
 *  callers can early-out instead of firing a query that will never match. */
export function tenantScoreId(id: string | undefined | null): string | undefined {
  if (!id) return undefined;
  return id.startsWith(PERSONAL_PREFIX) ? undefined : id;
}
