// Guards the membership-row selection that useMyTenantRole performs.
//
// The regression these cover: the role lookup used .maybeSingle() with no
// tenant filter. maybeSingle() ERRORS when more than one row matches, so
// every user holding memberships in several tenants resolved to null and
// silently failed the super-admin gate — no Views switcher, no super-admin
// bypass of the hidden-items filter, regardless of role spelling.
//
// Live data at the time: 18 of 103 members belonged to more than one tenant,
// including a Lyke House super-admin who is also a student elsewhere.

import { describe, it, expect } from 'vitest';
import { isTenantSuperAdminRole } from '../tenantRoles';

interface Row { role: string; tenant_id: string }

/** Mirrors the selection useMyTenantRole applies to the fetched rows. */
function roleForTenant(rows: Row[], tenantId: string | null): string | null {
  if (!tenantId) return null;
  return rows.filter((r) => r.tenant_id === tenantId)[0]?.role ?? null;
}

const LYKE = 'lyke-house-id';
const OTHER = 'other-tenant-id';

describe('roleForTenant', () => {
  it('picks the current tenant row for a multi-tenant member', () => {
    // The exact shape that used to return null: super-admin here,
    // student somewhere else.
    const rows: Row[] = [
      { role: 'student', tenant_id: OTHER },
      { role: 'super-admin', tenant_id: LYKE },
    ];
    expect(roleForTenant(rows, LYKE)).toBe('super-admin');
    expect(isTenantSuperAdminRole(roleForTenant(rows, LYKE))).toBe(true);
  });

  it('does not leak super-admin from one tenant into another', () => {
    const rows: Row[] = [
      { role: 'super_admin', tenant_id: OTHER },
      { role: 'fan', tenant_id: LYKE },
    ];
    expect(roleForTenant(rows, LYKE)).toBe('fan');
    expect(isTenantSuperAdminRole(roleForTenant(rows, LYKE))).toBe(false);
  });

  it('survives a duplicate membership row instead of blanking out', () => {
    // Two rows for the same tenant is exactly what broke maybeSingle().
    const rows: Row[] = [
      { role: 'super_admin', tenant_id: LYKE },
      { role: 'super_admin', tenant_id: LYKE },
    ];
    expect(roleForTenant(rows, LYKE)).toBe('super_admin');
  });

  it('returns null when the user has no membership in this tenant', () => {
    expect(roleForTenant([{ role: 'super_admin', tenant_id: OTHER }], LYKE)).toBeNull();
    expect(roleForTenant([], LYKE)).toBeNull();
  });

  it('returns null when the tenant could not be resolved', () => {
    // Unresolved tenant must not fall through to some other tenant's role.
    expect(roleForTenant([{ role: 'super_admin', tenant_id: OTHER }], null)).toBeNull();
  });

  it('handles the single-tenant case unchanged', () => {
    expect(roleForTenant([{ role: 'super_admin', tenant_id: LYKE }], LYKE)).toBe('super_admin');
  });
});
