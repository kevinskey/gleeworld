// Tenant-scoped authorization for account-control endpoints.
//
// gw_profiles.is_admin is a GLOBAL boolean, set by the ordinary workspace UI
// (src/pages/dashboard/WorkspaceUsersPage.tsx). In a multi-tenant system it
// answers "is this person an admin somewhere", NOT "may this person act on
// that account" — but admin-reset-password, admin-delete-user and
// reset-member-passwords all treated it as the latter.
//
// The consequence, found 2026-10-02: a Lyke House workspace admin could reset
// a Yo-Doc instructor's password and sign in as them, or delete any
// non-super-admin in any tenant. reset-member-passwords was worse — its target
// query had no tenant predicate at all, so one call rewrote the password of
// every user with that role across the whole platform.
//
// The rule these helpers enforce: you may act on an account only if you are a
// super admin, or if that account belongs to a tenant you administer.

/**
 * The slice of a supabase-js client these helpers use. Typed structurally so
 * the module stays testable and lint-clean without importing the SDK's types
 * into every caller.
 */
export interface QueryableClient {
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null }>;
      } & Promise<{ data: Array<Record<string, unknown>> | null }>;
    };
  };
}

export interface CallerPrivilege {
  userId: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  /** Tenant ids the caller holds membership in. */
  tenantIds: string[];
}

export async function loadCallerPrivilege(supabase: QueryableClient, userId: string): Promise<CallerPrivilege> {
  const { data: profile } = await supabase
    .from("gw_profiles")
    .select("is_admin, is_super_admin")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: memberships } = await supabase
    .from("gw_tenant_members")
    .select("tenant_id")
    .eq("user_id", userId);

  return {
    userId,
    isSuperAdmin: profile?.is_super_admin === true,
    isAdmin: profile?.is_admin === true,
    tenantIds: ((memberships ?? []) as Array<{ tenant_id: string }>).map((m) => m.tenant_id),
  };
}

/**
 * May `caller` act on `targetUserId`?
 *
 * Super admins: yes, platform-wide, deliberately.
 * Everyone else: only when the target holds membership in a tenant the caller
 * also belongs to. A target with no membership rows is NOT actionable by a
 * tenant admin — an unhomed account belongs to the platform, not to them.
 */
export async function callerMayActOnUser(
  supabase: QueryableClient,
  caller: CallerPrivilege,
  targetUserId: string,
): Promise<boolean> {
  if (caller.isSuperAdmin) return true;
  if (!caller.isAdmin) return false;
  if (caller.tenantIds.length === 0) return false;

  const { data: targetMemberships } = await supabase
    .from("gw_tenant_members")
    .select("tenant_id")
    .eq("user_id", targetUserId);

  const targetTenants = ((targetMemberships ?? []) as Array<{ tenant_id: string }>).map((m) => m.tenant_id);
  if (targetTenants.length === 0) return false;

  const mine = new Set(caller.tenantIds);
  return targetTenants.some((t) => mine.has(t));
}
