// What a previewing super-admin should be TREATED as.
//
// "Views" lets a tenant admin look at the app as a student sees it. Until
// now that only reached the nav and six pages: everything else asks
// useUserRole(), which reads the caller's real profile, so most pages kept
// rendering the admin view and the preview was a half-truth (Kevin,
// 2026-08-20: "i have the views feature so that as a super admin i can see
// what the students see on pages").
//
// Two rules this file exists to enforce:
//
//  1. It can only ever REMOVE capability. Preview is applied on top of a
//     real tenant admin, and every clamp below is a downgrade, so a forged
//     sessionStorage value cannot escalate anyone. The caller still checks
//     that the user is genuinely an admin before passing a role.
//
//  2. It changes what the UI OFFERS, not what the server allows. Requests
//     still carry the real JWT, so a previewing admin can still read admin
//     data if a page fetches it directly. Preview answers "what does a
//     student SEE", not "what could a student access" — for the latter,
//     sign in as one.
import type { NavRole } from '@/lib/navigation/navCatalog';

export interface PreviewCapabilities {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  /** True for the roles that are ordinary members of the tenant. */
  isStudent: boolean;
  /** Per-user app grants (librarian, wardrobe, secretary) survive only for
   *  an admin preview — a student holding librarian powers is not a student
   *  view. */
  keepAppGrants: boolean;
  /** The value getEffectiveRole() should report. */
  effectiveRole: 'admin' | 'student' | 'member';
}

const CAPS: Record<NavRole, PreviewCapabilities> = {
  admin: {
    isSuperAdmin: false, // previewing an admin must not keep super-admin reach
    isAdmin: true,
    isStudent: false,
    keepAppGrants: true,
    effectiveRole: 'admin',
  },
  student: {
    isSuperAdmin: false, isAdmin: false, isStudent: true,
    keepAppGrants: false, effectiveRole: 'student',
  },
  member: {
    isSuperAdmin: false, isAdmin: false, isStudent: true,
    keepAppGrants: false, effectiveRole: 'member',
  },
};

/**
 * Capabilities for an active preview, or null when no preview applies.
 *
 * `allowed` is the caller's assertion that this user really is a tenant
 * admin — pass false and preview is ignored entirely, which is what keeps a
 * hand-edited sessionStorage value inert for everyone else.
 */
export function previewCapabilities(
  previewRole: NavRole | null | undefined,
  allowed: boolean,
): PreviewCapabilities | null {
  if (!previewRole || !allowed) return null;
  return CAPS[previewRole] ?? null;
}
