import { supabase } from "@/integrations/supabase/client";
import { assertRowReturned } from "./personalDocsApi";

/** Ordered ladder — the same order the SQL helper gw_doc_can() uses. */
export const PERMISSION_LADDER = ['view', 'comment', 'edit', 'owner'] as const;
export type DocPermission = typeof PERMISSION_LADDER[number];
/** What can actually be granted (you can't grant ownership). */
export type GrantablePermission = Exclude<DocPermission, 'owner'>;

export interface DocShare {
  id: string;
  doc_id: string;
  shared_with_email: string;
  permission: GrantablePermission;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
}

const TABLE = "gw_doc_shares" as never;

export async function listShares(docId: string): Promise<DocShare[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("doc_id", docId)
    .is("revoked_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as DocShare[];
}

/**
 * Share with an email address, or change an existing share's level.
 * Upsert on (doc_id, shared_with_email) — re-sharing with the same person
 * should move their permission, not stack a second contradictory row. The
 * unique constraint in the migration is what makes that safe.
 */
export async function upsertShare(input: {
  docId: string;
  email: string;
  permission: GrantablePermission;
  createdBy: string;
}): Promise<DocShare> {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({
      doc_id: input.docId,
      shared_with_email: input.email.trim().toLowerCase(),
      permission: input.permission,
      created_by: input.createdBy,
      // Re-sharing with someone previously revoked reinstates them.
      revoked_at: null,
    }, { onConflict: 'doc_id,shared_with_email' })
    .select();
  if (error) throw error;
  return assertRowReturned(data as unknown as DocShare[] | null, "share document");
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
