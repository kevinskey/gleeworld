import { describe, it, expect } from 'vitest';
import { isTenantSuperAdminRole, isTenantAdminOrAboveRole } from '../tenantRoles';

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

describe('isTenantAdminOrAboveRole', () => {
  it('accepts the roles that run a tenant', () => {
    for (const role of ['super_admin', 'super-admin', 'admin', 'owner']) {
      expect(isTenantAdminOrAboveRole(role), `${role} must pass`).toBe(true);
    }
  });

  it("accepts 'owner' — the tenant creator's role", () => {
    // The whole reason this predicate exists: the Views switcher was gated on
    // super-admin, so it vanished for the person who OWNS the tenant.
    expect(isTenantAdminOrAboveRole('owner')).toBe(true);
    expect(isTenantSuperAdminRole('owner')).toBe(false);
  });

  it('rejects staff and every member-level role', () => {
    for (const role of ['staff', 'student', 'fan', 'graduate', 'member', 'alumna', 'alumni']) {
      expect(isTenantAdminOrAboveRole(role), `${role} must not pass`).toBe(false);
    }
  });

  it('rejects unresolved roles rather than defaulting open', () => {
    expect(isTenantAdminOrAboveRole(null)).toBe(false);
    expect(isTenantAdminOrAboveRole(undefined)).toBe(false);
    expect(isTenantAdminOrAboveRole('')).toBe(false);
  });

  it('does not match on substring or case', () => {
    expect(isTenantAdminOrAboveRole('ADMIN')).toBe(false);
    expect(isTenantAdminOrAboveRole('administrator')).toBe(false);
    expect(isTenantAdminOrAboveRole('co-owner')).toBe(false);
  });
});
