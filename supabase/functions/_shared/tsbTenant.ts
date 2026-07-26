// Tenant resolution for the TSB fundraising-store functions.
//
// `gw_profiles.tenant_id` is the caller's HOME tenant — the org they belong
// to. It is not necessarily the tenant whose site they are looking at. One
// GleeWorld build serves every tenant by subdomain, so a super-admin sitting
// on lykehouse.gleeworld.org must act on The Lyke House, not on whatever
// tenant their own profile happens to point at. Resolving by profile alone
// is how "Kevin's World" ended up rendered as, and edited as, the Lyke
// House's store.
//
// The client now sends its tenant slug (getTenantSlug(), the same value that
// rides along as x-tenant-slug). Authorization:
//   • home tenant   → any tenant admin may act
//   • other tenant  → super-admins only
// A missing slug falls back to the home tenant so older clients keep working.

export interface StoreProfile {
  tenant_id: string | null;
  is_admin?: boolean | null;
  is_super_admin?: boolean | null;
  role?: string | null;
}

export function isSuperAdmin(profile: StoreProfile): boolean {
  return profile.is_super_admin === true
    || profile.role === "super_admin"
    || profile.role === "super-admin";
}

export function isTenantAdmin(profile: StoreProfile): boolean {
  return isSuperAdmin(profile)
    || profile.is_admin === true
    || profile.role === "admin"
    || profile.role === "owner";
}

export interface ResolvedTenant<T> {
  tenant: T | null;
  /** Set when resolution failed; caller should return this verbatim. */
  error: { status: number; message: string } | null;
}

/**
 * Resolve the tenant a store request targets, enforcing that the caller is
 * allowed to act on it.
 *
 * @param admin        service-role Supabase client
 * @param profile      caller's gw_profiles row
 * @param requestedSlug tenant slug from the request body (may be null/empty)
 * @param select       columns to select from gw_tenants (always includes id)
 */
export async function resolveStoreTenant<T extends { id: string }>(
  // deno-lint-ignore no-explicit-any
  admin: any,
  profile: StoreProfile,
  requestedSlug: string | null | undefined,
  select: string,
): Promise<ResolvedTenant<T>> {
  const columns = select.includes("id") ? select : `id, ${select}`;
  const slug = typeof requestedSlug === "string" ? requestedSlug.trim() : "";

  // No slug (or the platform-default shell) — fall back to the home tenant.
  if (!slug || slug === "main") {
    if (!profile.tenant_id) {
      return { tenant: null, error: { status: 403, message: "Profile has no tenant" } };
    }
    if (!isTenantAdmin(profile)) {
      return { tenant: null, error: { status: 403, message: "Only tenant admins can manage the storefront" } };
    }
    const { data } = await admin
      .from("gw_tenants")
      .select(columns)
      .eq("id", profile.tenant_id)
      .maybeSingle();
    if (!data) return { tenant: null, error: { status: 404, message: "Tenant not found" } };
    return { tenant: data as T, error: null };
  }

  const { data: tenant } = await admin
    .from("gw_tenants")
    .select(columns)
    .eq("slug", slug)
    .maybeSingle();
  if (!tenant) return { tenant: null, error: { status: 404, message: `No tenant for site "${slug}"` } };

  const isHomeTenant = profile.tenant_id === tenant.id;
  if (isHomeTenant ? !isTenantAdmin(profile) : !isSuperAdmin(profile)) {
    return {
      tenant: null,
      error: {
        status: 403,
        message: isHomeTenant
          ? "Only tenant admins can manage the storefront"
          : "You can only manage the store of a tenant you administer",
      },
    };
  }
  return { tenant: tenant as T, error: null };
}
