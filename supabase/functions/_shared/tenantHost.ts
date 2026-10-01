// Resolve a browser origin to the tenant it belongs to.
//
// The pre-existing guess (gw-invite-student) took the first hostname label:
// 'blackmusicscholar.academy' -> 'blackmusicscholar'. That is only ever
// correct for <slug>.gleeworld.org hosts. A tenant on a branded domain has
// no relationship between its host and its slug — yo-doc.com is tenant
// 'kevin' — so the guess silently resolved to "no tenant", and the caller
// then skipped tenant membership and fell back to generic branding with no
// error anywhere.
//
// Everything here is pure except resolveTenantSlugFromOrigin, which takes the
// row fetch as a callback so the matching logic stays unit-testable without a
// database. Same shape as _shared/tenantBranding.ts.

export const ROOT_DOMAIN = 'gleeworld.org';

export interface TenantHostRow {
  slug: string;
  subdomain: string | null;
  custom_domain: string | null;
}

/**
 * Reduce anything host-ish to a bare lowercase hostname.
 *
 * Accepts a full origin ('https://yo-doc.com/'), a bare host with a port
 * ('localhost:8080'), or an already-clean host. `custom_domain` is written by
 * a free-text admin field, so a pasted 'https://example.org/' has to survive
 * this too — the same tolerance src/lib/auth/tenantRedirect.ts applies.
 */
export function normalizeHost(input: string | null | undefined): string {
  let v = (input ?? '').trim().toLowerCase();
  if (!v) return '';
  if (v.includes('://')) {
    try {
      v = new URL(v).hostname;
    } catch {
      return '';
    }
  } else {
    v = v.replace(/\/.*$/, '');
  }
  return v.replace(/:\d+$/, '').replace(/^www\./, '');
}

/**
 * The host→slug shortcut that needs no database: <slug>.gleeworld.org.
 * Returns 'main' for the root domain, null for anything branded.
 *
 * A multi-label prefix ('a.b.gleeworld.org') returns null rather than a
 * bogus 'a.b' slug — no tenant slug contains a dot.
 */
export function slugFromGleeworldHost(host: string | null | undefined): string | null {
  const h = normalizeHost(host);
  if (!h) return null;
  if (h === ROOT_DOMAIN) return 'main';
  if (!h.endsWith(`.${ROOT_DOMAIN}`)) return null;
  const label = h.slice(0, -(ROOT_DOMAIN.length + 1));
  if (!label || label.includes('.')) return null;
  return label;
}

/**
 * Match a branded host against tenant rows.
 *
 * custom_domain is checked first and is the whole point of this function.
 * subdomain is checked second because that column is NOT normalized: some
 * rows hold a full host ('demo-choir.gleeworld.org') and others a bare label
 * ('kevin'), so both forms have to be compared. See the same caveat in
 * src/lib/auth/tenantRedirect.ts:tenantHostFromRow.
 */
export function slugFromTenantRows(
  rows: readonly TenantHostRow[] | null | undefined,
  host: string | null | undefined,
): string | null {
  const h = normalizeHost(host);
  if (!h || !rows?.length) return null;

  for (const row of rows) {
    if (normalizeHost(row.custom_domain) === h) return row.slug;
  }

  for (const row of rows) {
    const sub = (row.subdomain ?? '').trim().toLowerCase();
    if (!sub) continue;
    const asHost = sub.includes('.') ? normalizeHost(sub) : `${sub}.${ROOT_DOMAIN}`;
    if (asHost === h) return row.slug;
  }

  return null;
}

/**
 * Full resolution: cheap gleeworld.org parse first, DB lookup only when the
 * host is branded. Returns null when nothing matches, which callers should
 * treat as "use platform defaults", never as an error.
 */
export async function resolveTenantSlugFromOrigin(
  origin: string | null | undefined,
  listTenants: () => Promise<readonly TenantHostRow[] | null>,
): Promise<string | null> {
  const host = normalizeHost(origin);
  if (!host) return null;

  const direct = slugFromGleeworldHost(host);
  if (direct) return direct;

  try {
    return slugFromTenantRows(await listTenants(), host);
  } catch {
    // Tenant resolution is never worth failing the caller's real work over.
    return null;
  }
}
