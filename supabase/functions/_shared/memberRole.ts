// The member role, server side. Mirror of src/lib/auth/memberRole.ts — keep
// the two in step.
//
// 'student' and 'member' are ONE audience. Phase 2 of the rename makes
// 'member' the stored value; reads still accept both so a function deployed
// before or after the data migration behaves identically either way.
//
// IMPORTANT — two different things are spelled 'student' in this codebase:
//
//   1. The USER role, on gw_profiles.role / gw_tenant_members.role. That is
//      what this module covers.
//
//   2. The COURSE role, on gw_course_enrollments.role, whose domain is
//      'student' | 'instructor' | 'ta' | 'auditor' and which is pinned by the
//      gw_course_enrollments_role_check constraint. A person's role WITHIN
//      one course. NOT being renamed — do not use these helpers there, the
//      insert will fail the constraint.
//
// Functions that correctly keep 'student' because they write the COURSE role:
// gw-course-enroll, upload-classlist-csv, public-students-api,
// fetch-students-from-gleeworld, and the enrollment half of
// provision-student-accounts.

/** Canonical name for the role. What phase 2 stores. */
export const MEMBER_ROLE = "member";

/** The pre-rename spelling. Still present in rows written before phase 2. */
export const LEGACY_MEMBER_ROLE = "student";

/** Both spellings, for `.in("role", ...)` filters on PROFILE tables. */
export const MEMBER_ROLE_VALUES: readonly string[] = [LEGACY_MEMBER_ROLE, MEMBER_ROLE];

/** Is this user role the member audience, under either spelling? */
export function isMemberRole(role: unknown): boolean {
  return role === MEMBER_ROLE || role === LEGACY_MEMBER_ROLE;
}

/** Collapse either spelling to the canonical one; leave other roles alone. */
export function normalizeMemberRole(role: unknown): unknown {
  return isMemberRole(role) ? MEMBER_ROLE : role;
}
