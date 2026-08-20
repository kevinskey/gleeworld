import { supabase } from "@/integrations/supabase/client";
import { assertRowReturned } from "./personalDocsApi";

export interface DocComment {
  id: string;
  doc_id: string;
  user_id: string;
  /** Matches the `commentId` attribute of a `comment` mark in the doc JSON. */
  anchor_id: string;
  body: string;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = "gw_doc_comments" as never;

export async function listComments(docId: string): Promise<DocComment[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("doc_id", docId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as DocComment[];
}

export async function createComment(input: {
  docId: string;
  userId: string;
  anchorId: string;
  body: string;
}): Promise<DocComment> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      doc_id: input.docId,
      user_id: input.userId,
      anchor_id: input.anchorId,
      body: input.body,
    })
    .select();
  if (error) throw error;
  // Same guard the docs API uses: an RLS-rejected insert returns zero rows
  // rather than throwing, and would otherwise look like success.
  return assertRowReturned(data as unknown as DocComment[] | null, "create comment");
}

export async function updateCommentBody(id: string, body: string): Promise<DocComment> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ body })
    .eq("id", id)
    .select();
  if (error) throw error;
  return assertRowReturned(data as unknown as DocComment[] | null, "update comment");
}

/** Resolve / reopen. Passing null clears both resolution columns. */
export async function setCommentResolved(
  id: string,
  resolvedBy: string | null,
): Promise<DocComment> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      resolved_at: resolvedBy ? new Date().toISOString() : null,
      resolved_by: resolvedBy,
    })
    .eq("id", id)
    .select();
  if (error) throw error;
  return assertRowReturned(data as unknown as DocComment[] | null, "resolve comment");
}

export async function deleteComment(id: string): Promise<void> {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .select();
  if (error) throw error;
  assertRowReturned(data as unknown as DocComment[] | null, "delete comment");
}

/**
 * Comments whose anchor text no longer exists in the document — the reader
 * deleted the sentence the comment was attached to. Nothing in Postgres can
 * enforce this (the document is a jsonb blob), so the panel surfaces them
 * instead of pretending they still point somewhere.
 */
export function orphanedComments(comments: DocComment[], anchoredIds: Set<string>): DocComment[] {
  return comments.filter((c) => !anchoredIds.has(c.anchor_id));
}

/** Open threads first (oldest first), then resolved ones (most recently
 *  resolved first) — unresolved work is what the panel is for. */
export function sortComments(comments: DocComment[]): DocComment[] {
  const open = comments.filter((c) => !c.resolved_at);
  const resolved = comments.filter((c) => c.resolved_at);
  open.sort((a, b) => a.created_at.localeCompare(b.created_at));
  resolved.sort((a, b) => (b.resolved_at ?? '').localeCompare(a.resolved_at ?? ''));
  return [...open, ...resolved];
}
