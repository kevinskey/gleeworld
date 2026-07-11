// Server-side search over notes and tasks (trigram indexes on title and
// content_text carry the ilike patterns). No client-side full scans.
import { supabase } from '@/integrations/supabase/client';
import { escapeLike } from './notesApi';
import type { NoteType, PlannerNoteSummary, PlannerTask, SavedFilter, SavedFilterQuery } from './types';

export interface NoteSearchHit extends PlannerNoteSummary {
  /** short plain-text snippet around the first match */
  snippet: string;
}

export async function searchNotes(query: SavedFilterQuery, limit = 50): Promise<NoteSearchHit[]> {
  let q = supabase
    .from('gw_planner_notes')
    .select('id, folder_id, note_type, date_key, title, tags, is_favorite, deleted_at, updated_at, created_at, content_text')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit);
  const text = query.text?.trim();
  if (text) {
    const pattern = `%${escapeLike(text)}%`;
    q = q.or(`title.ilike.${pattern},content_text.ilike.${pattern}`);
  }
  if (query.tags?.length) q = q.contains('tags', query.tags);
  if (query.noteType) q = q.eq('note_type', query.noteType as NoteType);
  if (query.favorite) q = q.eq('is_favorite', true);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as (PlannerNoteSummary & { content_text: string })[]).map((row) => {
    const { content_text, ...summary } = row;
    return { ...summary, snippet: makeSnippet(content_text, text) };
  });
}

function makeSnippet(text: string, needle?: string, width = 120): string {
  if (!text) return '';
  if (!needle) return text.slice(0, width);
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return text.slice(0, width);
  const start = Math.max(0, idx - Math.floor(width / 3));
  const raw = text.slice(start, start + width);
  return (start > 0 ? '…' : '') + raw + (start + width < text.length ? '…' : '');
}

export async function searchTasks(query: SavedFilterQuery, limit = 50): Promise<PlannerTask[]> {
  let q = supabase
    .from('gw_planner_tasks')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit);
  const text = query.text?.trim();
  if (text) q = q.ilike('title', `%${escapeLike(text)}%`);
  if (query.tags?.length) q = q.contains('tags', query.tags);
  if (query.status) q = q.eq('status', query.status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PlannerTask[];
}

/** Distinct tags across the user's notes and tasks, for pickers. */
export async function listAllTags(): Promise<string[]> {
  const [notes, tasks] = await Promise.all([
    supabase.from('gw_planner_notes').select('tags').is('deleted_at', null).limit(500),
    supabase.from('gw_planner_tasks').select('tags').is('deleted_at', null).limit(500),
  ]);
  const all = new Set<string>();
  for (const row of [...(notes.data ?? []), ...(tasks.data ?? [])] as { tags: string[] }[]) {
    for (const t of row.tags ?? []) all.add(t);
  }
  return [...all].sort();
}

// ── saved filters ─────────────────────────────────────────────────────
export async function listSavedFilters(): Promise<SavedFilter[]> {
  const { data, error } = await supabase
    .from('gw_planner_saved_filters')
    .select('id, user_id, name, query, position')
    .order('position');
  if (error) throw error;
  return (data ?? []) as SavedFilter[];
}

export async function createSavedFilter(name: string, query: SavedFilterQuery): Promise<SavedFilter> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('gw_planner_saved_filters')
    .insert({ user_id: auth?.user?.id, name, query })
    .select('id, user_id, name, query, position')
    .single();
  if (error) throw error;
  return data as SavedFilter;
}

export async function deleteSavedFilter(id: string): Promise<void> {
  const { error } = await supabase.from('gw_planner_saved_filters').delete().eq('id', id);
  if (error) throw error;
}
