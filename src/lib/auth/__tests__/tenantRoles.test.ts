import { describe, it, expect } from 'vitest';
import { isTenantSuperAdminRole } from '../tenantRoles';

describe('isTenantSuperAdminRole', () => {
  it('accepts the canonical spelling', () => {
    expect(isTenantSuperAdminRole('super_admin')).toBe(true);
  });

  it('accepts the legacy hyphen spelling', () => {
    // Every member of The Lyke House is stored this way; a strict
    // === 'super_admin' gate locked all of them out of the Views switcher.
    expect(isTenantSuperAdminRole('super-admin')).toBe(true);
  });

  it('rejects every non-super-admin tenant role', () => {
    for (const role of ['admin', 'student', 'fan', 'graduate', 'member', 'staff', 'alumna']) {
      expect(isTenantSuperAdminRole(role), `${role} must not pass`).toBe(false);
    }
  });

  it('rejects unresolved roles rather than defaulting open', () => {
    expect(isTenantSuperAdminRole(null)).toBe(false);
    expect(isTenantSuperAdminRole(undefined)).toBe(false);
    expect(isTenantSuperAdminRole('')).toBe(false);
  });

  it('does not match on substring or case', () => {
    expect(isTenantSuperAdminRole('SUPER_ADMIN')).toBe(false);
    expect(isTenantSuperAdminRole('not-super-admin')).toBe(false);
    expect(isTenantSuperAdminRole('super_admin_readonly')).toBe(false);
  });
});
