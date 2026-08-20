import { supabase } from "@/integrations/supabase/client";
import { assertRowReturned } from "./personalDocsApi";

export interface DocVersion {
  id: string;
  doc_id: string;
  user_id: string;
  content: unknown /* TipTap JSON */;
  word_count: number;
  /** Named by the user; null for automatic interval snapshots. */
  label: string | null;
  created_at: string;
}

export interface DocVersionListItem {
  id: string;
  word_count: number;
  label: string | null;
  created_at: string;
}

const TABLE = "gw_doc_versions" as never;

/**
 * How often automatic snapshots are taken. Autosave fires every couple of
 * seconds while someone types; one row per autosave would be both enormous
 * and unreadable. Ten minutes gives a history you can actually scan, and the
 * retention trigger keeps the newest 50 per document.
 */
export const AUTO_SNAPSHOT_INTERVAL_MS = 10 * 60 * 1000;

export async function listVersions(docId: string): Promise<DocVersionListItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id,word_count,label,created_at")
    .eq("doc_id", docId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DocVersionListItem[];
}

export async function getVersion(id: string): Promise<DocVersion> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id);
  if (error) throw error;
  return assertRowReturned(data as unknown as DocVersion[] | null, "load version");
}

export async function createVersion(input: {
  docId: string;
  userId: string;
  content: unknown;
  wordCount: number;
  label?: string | null;
}): Promise<DocVersion> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      doc_id: input.docId,
      user_id: input.userId,
      content: input.content,
      word_count: input.wordCount,
      label: input.label ?? null,
    })
    .select();
  if (error) throw error;
  return assertRowReturned(data as unknown as DocVersion[] | null, "create version");
}

export async function deleteVersion(id: string): Promise<void> {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .select();
  if (error) throw error;
  assertRowReturned(data as unknown as DocVersion[] | null, "delete version");
}

/**
 * Should an automatic snapshot be taken now?
 *
 * Pure so the policy is testable without a clock or a database. Two rules:
 * never snapshot a document nobody has changed, and never more often than
 * the interval. `lastSnapshotAt` of null means "no history yet" — take one,
 * so a document always has a floor to restore to.
 */
export function shouldSnapshot(args: {
  now: number;
  lastSnapshotAt: number | null;
  dirtySinceLastSnapshot: boolean;
  intervalMs?: number;
}): boolean {
  if (!args.dirtySinceLastSnapshot) return false;
  if (args.lastSnapshotAt === null) return true;
  return args.now - args.lastSnapshotAt >= (args.intervalMs ?? AUTO_SNAPSHOT_INTERVAL_MS);
}

/** Human label for a snapshot row: its name, or its age. */
export function describeVersion(v: DocVersionListItem, now = Date.now()): string {
  if (v.label) return v.label;
  const ageMs = now - new Date(v.created_at).getTime();
  // floor, not round: with rounding, a 30-second-old snapshot reads
  // "1 minute ago", and a 90-minute-old one jumps to "2 hours". Elapsed time
  // should never claim more than has actually passed.
  const mins = Math.floor(ageMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
