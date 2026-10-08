import { supabase } from "@/integrations/supabase/client";
import { assertRowReturned } from "./personalDocsApi";

/** Ordered ladder — the same order the SQL helper gw_doc_can() uses. */
export const PERMISSION_LADDER = ['view', 'comment', 'edit', 'owner'] as const;
export type DocPermission = typeof PERMISSION_LADDER[number];
/** What can actually be granted (you can't grant ownership). */
export type GrantablePermission = Exclude<DocPermission, 'owner'>;

/** What a share names. 'email' is one person; the other two are audiences
 *  evaluated at read time, so somebody who joins later is covered without a
 *  re-share. Matches the share_type CHECK in 20261007210000. */
export type ShareType = 'email' | 'role' | 'course';
export type TargetRole = 'admin' | 'staff' | 'member';

export interface DocShare {
  id: string;
  doc_id: string;
  share_type: ShareType;
  /** Set only when share_type is 'email'. */
  shared_with_email: string | null;
  /** Set only when share_type is 'role'. */
  target_role: TargetRole | null;
  /** Set only when share_type is 'course'. */
  course_id: string | null;
  permission: GrantablePermission;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
}

/** One target, discriminated the same way the SQL CHECK is. Taking this
 *  rather than three loose nullable args means a caller cannot name an email
 *  and a class at once and get a row the CHECK rejects. */
export type ShareTarget =
  | { kind: 'email'; email: string }
  | { kind: 'role'; role: TargetRole }
  | { kind: 'course'; courseId: string };

const TABLE = "gw_doc_shares" as never;

/** Columns identifying a target, as stored. */
function targetColumns(target: ShareTarget) {
  switch (target.kind) {
    case 'email':
      return { share_type: 'email', shared_with_email: target.email.trim().toLowerCase() };
    case 'role':
      return { share_type: 'role', target_role: target.role };
    case 'course':
      return { share_type: 'course', course_id: target.courseId };
  }
}

/** Does this stored row name the same target? Used to find the row to
 *  reinstate when an insert collides. */
export function isSameTarget(share: DocShare, target: ShareTarget): boolean {
  switch (target.kind) {
    case 'email':
      return share.share_type === 'email'
        && (share.shared_with_email ?? '').toLowerCase() === target.email.trim().toLowerCase();
    case 'role':
      return share.share_type === 'role' && share.target_role === target.role;
    case 'course':
      return share.share_type === 'course' && share.course_id === target.courseId;
  }
}

export async function listShares(
  docId: string,
  opts: { includeRevoked?: boolean } = {},
): Promise<DocShare[]> {
  // Revoked rows are kept (revoked_at rather than DELETE) so "who did I share
  // this with, and when did that stop" stays answerable. The dialog only ever
  // wants live ones; the reinstate path in upsertShare needs both.
  let query = supabase
    .from(TABLE)
    .select("*")
    .eq("doc_id", docId);
  if (!opts.includeRevoked) query = query.is("revoked_at", null);
  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as DocShare[];
}

/**
 * Share a document with one target, or move an existing share to a new level.
 *
 * Insert-then-reconcile rather than upsert. Since 20261007210000 the unique
 * constraints are PARTIAL indexes (one per share_type, because only one
 * target column is ever set), and ON CONFLICT cannot infer a partial index
 * without repeating its WHERE clause — which PostgREST's `on_conflict=` has
 * no way to express. So: try the insert, and on a 23505 find the row that
 * already names this target and update it in place.
 *
 * That collision is the ordinary path, not an edge case — it is what
 * re-sharing with someone already on the list does, and it is how a revoked
 * share gets reinstated.
 */
export async function upsertShare(input: {
  docId: string;
  target: ShareTarget;
  permission: GrantablePermission;
  createdBy: string;
}): Promise<DocShare> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      doc_id: input.docId,
      ...targetColumns(input.target),
      permission: input.permission,
      created_by: input.createdBy,
    })
    .select();

  if (!error) {
    return assertRowReturned(data as unknown as DocShare[] | null, "share document");
  }
  if (error.code !== '23505') throw error;

  // Already shared with this target. Reuse that row: move it to the
  // requested level and clear any revocation.
  const existing = (await listShares(input.docId, { includeRevoked: true }))
    .find((s) => isSameTarget(s, input.target));
  if (!existing) throw error;
  return setSharePermission(existing.id, input.permission);
}

/** Move one share to a different level, reinstating it if it was revoked. */
export async function setSharePermission(
  id: string,
  permission: GrantablePermission,
): Promise<DocShare> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ permission, revoked_at: null })
    .eq("id", id)
    .select();
  if (error) throw error;
  return assertRowReturned(data as unknown as DocShare[] | null, "change permission");
}

/** Revoke rather than delete: "who did I share this with, and when did that
 *  stop" is a question worth being able to answer. */
export async function revokeShare(id: string): Promise<void> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .select();
  if (error) throw error;
  assertRowReturned(data as unknown as DocShare[] | null, "revoke share");
}

/** The caller's permission on a document, straight from the SQL helper so
 *  the client can never disagree with what RLS will actually allow. */
export async function getMyPermission(docId: string): Promise<DocPermission | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('gw_doc_permission', { p_doc: docId });
  if (error) throw error;
  return (data as DocPermission | null) ?? null;
}

export function permissionAtLeast(
  actual: DocPermission | null | undefined,
  minimum: DocPermission,
): boolean {
  if (!actual) return false;
  return PERMISSION_LADDER.indexOf(actual) >= PERMISSION_LADDER.indexOf(minimum);
}

/** Wording reused from the Jukebox share dialog so one vocabulary covers
 *  every share surface in the app. 'member' is everyone signed in, which is
 *  what "all members" means to the person clicking it. */
export const ROLE_LABELS: Record<TargetRole, string> = {
  member: 'Everyone',
  staff: 'All staff',
  admin: 'All admins',
};

/** Human label for one share row. Class names are passed in rather than
 *  looked up — the dialog already loads the class list for its picker. */
export function describeShareTarget(
  share: DocShare,
  courseNames?: Record<string, string>,
): string {
  if (share.share_type === 'email') return share.shared_with_email ?? 'Someone';
  if (share.share_type === 'course') {
    return (share.course_id && courseNames?.[share.course_id]) || 'A class';
  }
  return (share.target_role && ROLE_LABELS[share.target_role]) || 'Everyone';
}

export function describePermission(permission: DocPermission): string {
  switch (permission) {
    case 'owner': return 'Owner';
    case 'edit': return 'Can edit';
    case 'comment': return 'Can comment';
    default: return 'Can view';
  }
}

/** Rejects the obvious nonsense before a round trip. Deliberately loose —
 *  real address validation is the mail server's job, not a regex's. */
export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
