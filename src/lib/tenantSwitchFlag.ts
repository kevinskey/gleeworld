// A deliberate tenant switch, marked so the auth guard doesn't mistake it
// for an intrusion.
//
// Switching orgs pivots the JWT (set_active_tenant + refreshSession) BEFORE
// navigating to the target tenant's subdomain. For the moment between those
// two steps the page is still on the OLD subdomain holding a JWT for the NEW
// tenant — which is exactly the shape AuthContext's mismatch guard exists to
// reject. The guard would fire, clear this origin's storage and start its own
// redirect, racing the switcher's navigation; the two fought and the user went
// nowhere. (Platform owners never saw it: a `main` super-admin is exempt from
// the guard, so the bug only hit admins whose home tenant is a real tenant.)
//
// So: mark the switch, let the guard stand down for that one target, and let
// the switcher finish its own navigation. The mark is timestamped and
// short-lived, so a switch that dies before navigating can't leave the guard
// disarmed. sessionStorage (not local) keeps it to this tab, and the target
// origin has its own storage — where the JWT and subdomain agree anyway.
//
// Lives in its own module because useMyTenants imports useAuth from
// AuthContext; importing the flag from there would close the cycle.

const KEY = 'gw_tenant_switch_in_flight';
/** How long a marked switch stays trusted. Generous enough for an RPC +
 *  refreshSession on a bad connection, short enough to be self-healing. */
const GRACE_MS = 20_000;

export function markTenantSwitchInFlight(targetSlug: string): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ slug: targetSlug, at: Date.now() }));
  } catch { /* private mode — guard just behaves as it did before */ }
}

export function clearTenantSwitchInFlight(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* noop */ }
}

/** Slug of the tenant currently being switched to, or null when no switch is
 *  in flight (or the mark went stale). Stale marks are swept on read. */
export function tenantSwitchInFlight(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { slug, at } = JSON.parse(raw) as { slug?: unknown; at?: unknown };
    if (typeof slug !== 'string' || typeof at !== 'number' || Date.now() - at > GRACE_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return slug;
  } catch {
    clearTenantSwitchInFlight();
    return null;
  }
}
