// The member role.
//
// Phase 3 of the student -> member rename: the legacy spelling is gone. Every
// row is stored as 'member' (migration 20261001120000) and no live access
// token can still carry tenant_role='student' — JWT_EXPIRY is 3600s and the
// rename landed well before this shipped, so any surviving session must
// refresh through custom_access_token_hook, which reads the stored value.
//
// IMPORTANT — one thing is still spelled 'student' and is NOT this role:
// gw_course_enrollments.role, whose domain is
// 'student' | 'instructor' | 'ta' | 'auditor', pinned by
// gw_course_enrollments_role_check. That is a person's role WITHIN one
// course — a different axis that shares a word. Never use these helpers
// there; the insert will fail the constraint.

/** The member role, as stored. */
export const MEMBER_ROLE = 'member';

/** For `.in('role', ...)` filters on PROFILE tables. */
export const MEMBER_ROLE_VALUES: readonly string[] = [MEMBER_ROLE];

/** Is this user role the member audience? */
export function isMemberRole(role: unknown): boolean {
  return role === MEMBER_ROLE;
}

/**
 * Collapse a member role to the canonical spelling, leaving other roles
 * untouched. Kept as the single place a role is normalised before it is
 * displayed, grouped, or used as a lookup key.
 */
export function normalizeMemberRole<T>(role: T): T | string {
  return isMemberRole(role) ? MEMBER_ROLE : role;
}
