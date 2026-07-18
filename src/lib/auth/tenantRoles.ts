// Role predicates for the gw_tenant_members role-space.
//
// NOT the same role-space as gw_profiles.role — these are the values the
// Workspace Settings → Navigation tab writes to gw_tenant_nav_prefs.role
// (super_admin, admin, student, fan, graduate, member). Mixing the two
// silently breaks nav filtering.
//
// Both spellings of super-admin exist in production data: 'super_admin' is
// canonical, but 'super-admin' predates it and is still stored for real
// tenants — every member of The Lyke House is spelled with the hyphen. Any
// gate that compares against only one spelling silently locks those admins
// out, with no error to explain why. Always compare through this helper.

/** True for either spelling of tenant super-admin. */
export function isTenantSuperAdminRole(role: string | null | undefined): boolean {
  return role === 'super_admin' || role === 'super-admin';
}
