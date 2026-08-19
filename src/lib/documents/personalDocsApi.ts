import { supabase } from "@/integrations/supabase/client";
import type { DocSource, DocFootnote, PaperMeta, CitationStyle } from "./types";

export interface PersonalDoc {
  id: string;
  user_id: string;
  title: string;
  content: unknown /* TipTap JSON */;
  citation_style: CitationStyle;
  sources: DocSource[];
  footnotes: DocFootnote[];
  paper_meta: PaperMeta;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface PersonalDocListItem {
  id: string;
  title: string;
  word_count: number;
  updated_at: string;
}

/**
 * Guards against silent RLS-rejected writes: a mutating call that returns
 * no rows (rather than throwing) looks like success unless callers check
 * for it explicitly. Every insert/update/delete in this module chains
 * `.select()` and passes the result through this function.
 */
export function assertRowReturned<T>(rows: T[] | null, action: string): T {
  if (!rows || rows.length === 0) {
    throw new Error(`personalDocsApi: ${action} returned no row (RLS rejection or missing row?)`);
  }
  return rows[0];
}

const TABLE = "gw_personal_docs" as never;

export async function listDocs(): Promise<PersonalDocListItem[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("id,title,word_count,updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PersonalDocListItem[];
}

export async function createDoc(userId: string): Promise<PersonalDoc> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ user_id: userId })
    .select();
  if (error) throw error;
  return assertRowReturned(data as unknown as PersonalDoc[] | null, "create");
}

export async function getDoc(id: string): Promise<PersonalDoc> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id);
  if (error) throw error;
  return assertRowReturned(data as unknown as PersonalDoc[] | null, "load");
}

export async function saveDoc(
  id: string,
  patch: Partial<
    Pick<
      PersonalDoc,
      "title" | "content" | "citation_style" | "sources" | "footnotes" | "paper_meta" | "word_count"
    >
  >
): Promise<void> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select();
  if (error) throw error;
  assertRowReturned(data as unknown as PersonalDoc[] | null, "save");
}

export async function deleteDoc(id: string): Promise<void> {
  const { data, error } = await supabase
    .from(TABLE)
    .delete()
    .eq("id", id)
    .select();
  if (error) throw error;
  assertRowReturned(data as unknown as PersonalDoc[] | null, "delete");
}
