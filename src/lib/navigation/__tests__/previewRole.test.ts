import { describe, it, expect } from 'vitest';
import {
  applyPreviewRole,
  previewRoleIsFaculty,
  resolveNav,
  NAV_CATALOG,
  type NavContext,
} from '../navCatalog';

// A tenant super-admin with every module on — the widest possible nav.
const superAdminCtx: NavContext = {
  hasModule: () => true,
  isTenantAdmin: true,
  isPlatformAdmin: true,
  canLibrarian: true,
  hiddenRoutes: new Set<string>(),
};

const routes = (ctx: NavContext) => new Set(resolveNav(ctx).map((e) => e.to));

describe('applyPreviewRole', () => {
  it('returns the context untouched when no preview is active', () => {
    expect(applyPreviewRole(superAdminCtx, null)).toBe(superAdminCtx);
  });

  it('drops admin-only and platform-admin-only entries when previewing as a student', () => {
    const adminOnly = NAV_CATALOG.filter((e) => e.gate?.adminOnly || e.gate?.platformAdminOnly);
    // Guard: if the catalog ever loses its gated entries this test would
    // pass vacuously.
    expect(adminOnly.length).toBeGreaterThan(0);

    const asStudent = routes(applyPreviewRole(superAdminCtx, 'student'));
    for (const e of adminOnly) {
      expect(asStudent.has(e.to), `${e.to} leaked into the student preview`).toBe(false);
    }
  });

  it('keeps platform-admin entries out of the tenant-admin preview but retains admin entries', () => {
    const asAdmin = routes(applyPreviewRole(superAdminCtx, 'admin'));
    const platformOnly = NAV_CATALOG.filter((e) => e.gate?.platformAdminOnly);
    const tenantAdminOnly = NAV_CATALOG.filter(
      (e) => e.gate?.adminOnly && !e.gate?.platformAdminOnly,
    );
    for (const e of platformOnly) expect(asAdmin.has(e.to)).toBe(false);
    for (const e of tenantAdminOnly) expect(asAdmin.has(e.to)).toBe(true);
  });

  it('never grants a capability the real context lacked', () => {
    const plainMember: NavContext = {
      ...superAdminCtx,
      isTenantAdmin: false,
      isPlatformAdmin: false,
      canLibrarian: false,
    };
    // Even previewing "up" as admin, resolveNav is driven by the flags we
    // set — the caller (useEffectivePreviewRole) is what withholds preview
    // from non-super-admins. Documented here so the boundary stays explicit.
    const previewed = applyPreviewRole(plainMember, 'admin');
    expect(previewed.isPlatformAdmin).toBe(false);
  });

  it('leaves module entitlement alone — modules are tenant-level, not role-level', () => {
    const noModules: NavContext = { ...superAdminCtx, hasModule: () => false };
    const previewed = applyPreviewRole(noModules, 'student');
    expect(previewed.hasModule('studio')).toBe(false);
  });

  it('still applies hidden routes on top of the narrowed capabilities', () => {
    const firstUngated = NAV_CATALOG.find((e) => !e.gate);
    expect(firstUngated).toBeDefined();
    const ctx = applyPreviewRole(
      { ...superAdminCtx, hiddenRoutes: new Set([firstUngated!.to]) },
      'student',
    );
    expect(routes(ctx).has(firstUngated!.to)).toBe(false);
  });

  it('maps only the admin role to the faculty tile set', () => {
    expect(previewRoleIsFaculty('admin')).toBe(true);
    for (const r of ['student', 'fan', 'graduate', 'member'] as const) {
      expect(previewRoleIsFaculty(r)).toBe(false);
    }
  });
});
