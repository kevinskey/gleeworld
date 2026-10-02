// The member role, server side. Mirror of src/lib/auth/memberRole.ts — keep
// the two in step.
//
// Phase 3 of the student -> member rename: the legacy spelling is gone. Every
// row is stored as "member" (migration 20261001120000).
//
// IMPORTANT — one thing is still spelled "student" and is NOT this role:
// gw_course_enrollments.role, whose domain is
// "student" | "instructor" | "ta" | "auditor", pinned by
// gw_course_enrollments_role_check. A person's role WITHIN one course.
// Functions that correctly still write "student" there: gw-course-enroll,
// upload-classlist-csv, public-students-api, fetch-students-from-gleeworld,
// the enrollment half of provision-student-accounts, and the SQL function
// list_seating_chart_roster.

/** The member role, as stored. */
export const MEMBER_ROLE = "member";

/** For `.in("role", ...)` filters on PROFILE tables. */
export const MEMBER_ROLE_VALUES: readonly string[] = [MEMBER_ROLE];

/** Is this user role the member audience? */
export function isMemberRole(role: unknown): boolean {
  return role === MEMBER_ROLE;
}

/** Collapse a member role to the canonical spelling; leave others alone. */
export function normalizeMemberRole(role: unknown): unknown {
  return isMemberRole(role) ? MEMBER_ROLE : role;
}
