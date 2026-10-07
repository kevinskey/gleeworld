import { supabase } from "@/integrations/supabase/client";
import { assertRowReturned } from "./personalDocsApi";

/** Ordered ladder — the same order the SQL helper gw_doc_can() uses. */
export const PERMISSION_LADDER = ['view', 'comment', 'edit', 'owner'] as const;
export type DocPermission = typeof PERMISSION_LADDER[number];
/** What can actually be granted (you can't grant ownership). */
export type GrantablePermission = Exclude<DocPermission, 'owner'>;

/** Who a share reaches: one person, a workspace role, or a class. */
export type DocShareType = 'email' | 'role' | 'course';
/** Workspace roles an audience share can target, broadest first. */
export type DocShareRole = 'member' | 'staff' | 'admin';

export interface DocShare {
  id: string;
  doc_id: string;
  /** Absent on rows written before audience shares existed: treat as email. */
  share_type?: DocShareType;
  shared_with_email: string | null;
  target_role?: DocShareRole | null;
  course_id?: string | null;
  tenant_id?: string | null;
  permission: GrantablePermission;
  created_by: string;
  created_at: string;
  revoked_at: string | null;
}

/** Audience targets other than one email address. */
export type DocAudience =
  | { kind: 'role'; role: DocShareRole }
  | { kind: 'course'; courseId: string };

const TABLE = "gw_doc_shares" as never;

export function shareTypeOf(share: DocShare): DocShareType {
  return share.share_type ?? 'email';
}

/**
 * Keep the shares that mean something in this workspace. Email shares follow
 * the person everywhere; a role or class share only grants access inside the
 * workspace it was made in (the SQL helper checks the same thing), so showing
 * Yo-Doc's "Everyone" while the owner is signed in to GleeWorld would lie.
 */
export function sharesForTenant(shares: DocShare[], tenantId: string | null): DocShare[] {
  return shares.filter((s) => shareTypeOf(s) === 'email' || (!!tenantId && s.tenant_id === tenantId));
}

/** The workspace the caller is acting in, as the database resolves it. */
export async function getCurrentTenantId(): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('current_tenant_id');
  if (error) return null;
  return (data as string | null) ?? null;
}

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
 * Share with everyone in a role, or a class, in the current workspace. One
 * row per audience per document, revoked or not, so an earlier revoked row
 * is reinstated at the new level instead of tripping the unique index.
 */
export async function upsertAudienceShare(input: {
  docId: string;
  audience: DocAudience;
  permission: GrantablePermission;
  createdBy: string;
  tenantId: string;
}): Promise<DocShare> {
  const { docId, audience, permission, createdBy, tenantId } = input;
  let existing = supabase
    .from(TABLE)
    .select("id")
    .eq("doc_id", docId)
    .eq("share_type", audience.kind);
  existing = audience.kind === 'role'
    ? existing.eq("tenant_id", tenantId).eq("target_role", audience.role)
    : existing.eq("course_id", audience.courseId);
  const { data: found, error: findError } = await existing.limit(1);
  if (findError) throw findError;

  const prior = (found as unknown as Array<{ id: string }> | null)?.[0];
  if (prior) {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ permission, revoked_at: null } as never)
      .eq("id", prior.id)
      .select();
    if (error) throw error;
    return assertRowReturned(data as unknown as DocShare[] | null, "share document");
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      doc_id: docId,
      share_type: audience.kind,
      target_role: audience.kind === 'role' ? audience.role : null,
      course_id: audience.kind === 'course' ? audience.courseId : null,
      tenant_id: tenantId,
      permission,
      created_by: createdBy,
    } as never)
    .select();
  if (error) throw error;
  return assertRowReturned(data as unknown as DocShare[] | null, "share document");
}

/** Change the level on any existing share, whatever its target. */
export async function updateSharePermission(id: string, permission: GrantablePermission): Promise<void> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ permission } as never)
    .eq("id", id)
    .select();
  if (error) throw error;
  assertRowReturned(data as unknown as DocShare[] | null, "change share");
}

/** Human label for a share's target, e.g. "Everyone in this workspace". */
export function describeShareTarget(share: DocShare, courseNames: Record<string, string> = {}): string {
  switch (shareTypeOf(share)) {
    case 'role':
      if (share.target_role === 'staff') return 'All staff';
      if (share.target_role === 'admin') return 'All admins';
      return 'Everyone in this workspace';
    case 'course':
      return `Class: ${(share.course_id && courseNames[share.course_id]) || 'a class'}`;
    default:
      return share.shared_with_email ?? '';
  }
}

/**
 * Turn a PostgREST failure into something an owner can act on. The common
 * one on the self-hosted database is the share table or its audience columns
 * not being there yet, which otherwise surfaces as a schema-cache riddle.
 */
export function explainShareError(e: unknown, fallback: string): string {
  const err = e as { code?: string; message?: string } | null;
  const msg = err?.message ?? '';
  if (err?.code === 'PGRST205' || err?.code === '42P01' || (/gw_doc_shares/.test(msg) && /does not exist|schema cache/.test(msg))) {
    return 'Sharing is not switched on for this site yet. The documents sharing database update needs to be applied.';
  }
  if (err?.code === 'PGRST204' || err?.code === '42703') {
    return 'Sharing with members needs a database update that has not been applied yet.';
  }
  return msg || fallback;
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
