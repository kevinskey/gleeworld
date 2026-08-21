import { describe, it, expect } from 'vitest';
import { previewCapabilities } from '../previewClamp';

describe('previewCapabilities', () => {
  it('is inert when no preview is selected', () => {
    expect(previewCapabilities(null, true)).toBeNull();
    expect(previewCapabilities(undefined, true)).toBeNull();
  });

  it('is inert for anyone who is not a tenant admin', () => {
    // The escalation guard: a hand-edited sessionStorage value does nothing
    // unless the caller has already established a real admin role.
    expect(previewCapabilities('admin', false)).toBeNull();
    expect(previewCapabilities('student', false)).toBeNull();
  });

  it('strips super-admin even when previewing an admin', () => {
    // Previewing "Tenant admins" must not keep platform reach — otherwise
    // the preview shows a view no actual tenant admin has.
    const caps = previewCapabilities('admin', true)!;
    expect(caps.isSuperAdmin).toBe(false);
    expect(caps.isAdmin).toBe(true);
  });

  it('makes a student preview genuinely unprivileged', () => {
    const caps = previewCapabilities('student', true)!;
    expect(caps).toMatchObject({
      isSuperAdmin: false, isAdmin: false, isStudent: true, effectiveRole: 'student',
    });
  });

  it('drops per-user app grants for member-level previews', () => {
    // A "student" who still holds librarian powers is not a student view.
    expect(previewCapabilities('student', true)!.keepAppGrants).toBe(false);
    expect(previewCapabilities('member', true)!.keepAppGrants).toBe(false);
    // An admin preview keeps them — matching PREVIEW_ROLE_CAPS in navCatalog.
    expect(previewCapabilities('admin', true)!.keepAppGrants).toBe(true);
  });

  it('only ever removes capability', () => {
    // The invariant the whole design rests on: for every previewable role,
    // nothing is granted that a real super-admin did not already have.
    for (const role of ['admin', 'student', 'member'] as const) {
      const caps = previewCapabilities(role, true)!;
      expect(caps.isSuperAdmin).toBe(false);
      if (role !== 'admin') expect(caps.isAdmin).toBe(false);
    }
  });
});
