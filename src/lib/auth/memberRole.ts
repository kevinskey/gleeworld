// The member role, during the student -> member rename.
//
// Phase 1 of the rename (this module): 'student' and 'member' are the SAME
// audience everywhere a role is read. Nothing writes 'member' yet — the
// database still coerces it back via the trg_no_member_role_* triggers — so
// stored data is untouched and this phase is safe to deploy on its own.
// Phase 2 drops those triggers and migrates the rows. Phase 3 deletes
// LEGACY_MEMBER_ROLE and everything that mentions it.
//
// IMPORTANT — two different things are spelled 'student' in this codebase:
//
//   1. The USER role, on gw_profiles.role / gw_profiles_directory.role /
//      gw_tenant_members.role. That is what this module covers.
//
//   2. The COURSE role, on gw_course_enrollments.role, whose domain is
//      'student' | 'instructor' | 'ta' | 'auditor' and which is pinned by the
//      gw_course_enrollments_role_check constraint. That is a different axis
//      — a person's role WITHIN one course — and it is NOT being renamed.
//      Do not reach for these helpers there; you will break the constraint.

/** Canonical name for the role going forward. */
export const MEMBER_ROLE = 'member';

/** The pre-rename spelling. Still what is actually stored until phase 2. */
export const LEGACY_MEMBER_ROLE = 'student';

/**
 * Both spellings, for `.in('role', ...)` filters.
 *
 * Use this instead of `.eq('role', 'student')` on any PROFILE query. An
 * `.eq` against one spelling silently returns a partial roster the moment
 * phase 2 starts moving rows.
 */
export const MEMBER_ROLE_VALUES: readonly string[] = [LEGACY_MEMBER_ROLE, MEMBER_ROLE];

/**
 * Is this user role the member audience (under either spelling)?
 *
 * Covers only the user role. A course enrollment's 'student' is unrelated —
 * see the module header.
 */
// Takes `unknown` rather than `string | null` on purpose: roles also arrive
// as untyped JWT claims (claimsToDemoRole reads claims.tenant_role), and a
// strict equality check is already safe for any input.
export function isMemberRole(role: unknown): boolean {
  return role === MEMBER_ROLE || role === LEGACY_MEMBER_ROLE;
}

/**
 * Collapse either spelling to the canonical one, leaving every other role
 * untouched. Use when a role value is about to be displayed, grouped, or
 * used as a lookup key, so the two spellings cannot produce two buckets.
 */
export function normalizeMemberRole<T extends string | null | undefined>(role: T): T | string {
  return isMemberRole(role) ? MEMBER_ROLE : role;
}
