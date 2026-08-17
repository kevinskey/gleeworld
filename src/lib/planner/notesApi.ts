// Notes API. RLS (owner + tenant RESTRICTIVE) is the enforcement layer;
// this module owns the save pipeline: projections (content_text/
// content_md), tag extraction, wiki-link rebuild, task-row sync,
// revision write + prune, and optimistic version checks so two tabs
// never silently clobber each other.
import { supabase } from '@/integrations/supabase/client';
import { docToMarkdown, docToText, EMPTY_DOC } from './markdown';
import { extractEntityRefs, extractTags, extractWikiLinks, isDateKeyTarget } from './wikiLinks';
import { diffTasks, extractTaskBlocks } from './taskSync';
import { keyTitle, typeOfKey, type PeriodType } from './dateKeys';
import type { DocNode, NoteType, PlannerNote, PlannerNoteSummary, PlannerTask, NoteLink } from './types';

const SUMMARY_COLS =
  'id, folder_id, note_type, date_key, title, tags, is_favorite, deleted_at, updated_at, created_at';

const REVISION_KEEP = 50;

export class NoteConflictError extends Error {
  constructor(public noteId: string) {
    super('Note was changed elsewhere; reload before saving.');
    this.name = 'NoteConflictError';
  }
}

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data?.user?.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

export async function listNotes(opts: {
  folderId?: string | null;
  favoritesOnly?: boolean;
  tag?: string;
  noteType?: NoteType;
  limit?: number;
} = {}): Promise<PlannerNoteSummary[]> {
  let q = supabase
    .from('gw_planner_notes')
    .select(SUMMARY_COLS)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.folderId !== undefined) {
    q = opts.folderId === null ? q.is('folder_id', null).eq('note_type', 'note') : q.eq('folder_id', opts.folderId);
  }
  if (opts.favoritesOnly) q = q.eq('is_favorite', true);
  if (opts.tag) q = q.contains('tags', [opts.tag]);
  if (opts.noteType) q = q.eq('note_type', opts.noteType);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PlannerNoteSummary[];
}

export async function listTrash(): Promise<PlannerNoteSummary[]> {
  const { data, error } = await supabase
    .from('gw_planner_notes')
    .select(SUMMARY_COLS)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as PlannerNoteSummary[];
}

export async function listRecent(limit = 8): Promise<PlannerNoteSummary[]> {
  return listNotes({ limit });
}

export async function getNote(id: string): Promise<PlannerNote> {
  const { data, error } = await supabase.from('gw_planner_notes').select('*').eq('id', id).single();
  if (error) throw error;
  return data as PlannerNote;
}

/** Lazily create the period note on first open (unique-race safe). */
export async function getOrCreatePeriodNote(type: PeriodType, dateKey: string): Promise<PlannerNote> {
  const userId = await uid();
  const { data: existing, error: selErr } = await supabase
    .from('gw_planner_notes')
    .select('*')
    .eq('user_id', userId)
    .eq('note_type', type)
    .eq('date_key', dateKey)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existing) return existing as PlannerNote;

  const { data, error } = await supabase
    .from('gw_planner_notes')
    .insert({
      user_id: userId,
      note_type: type,
      date_key: dateKey,
      title: keyTitle(dateKey, type),
      content: EMPTY_DOC,
    })
    .select('*')
    .single();
  if (error) {
    // 23505 = another tab won the race; fetch theirs
    if ((error as { code?: string }).code === '23505') {
      const { data: raced, error: reErr } = await supabase
        .from('gw_planner_notes')
        .select('*')
        .eq('user_id', userId)
        .eq('note_type', type)
        .eq('date_key', dateKey)
        .single();
      if (reErr) throw reErr;
      return raced as PlannerNote;
    }
    throw error;
  }
  return data as PlannerNote;
}

export async function createNote(partial: {
  title?: string;
  folder_id?: string | null;
  content?: DocNode;
  entity_type?: PlannerNote['entity_type'];
  entity_id?: string | null;
  /** Free-form metadata (e.g. saved-article source_url); saveNote never
   *  touches this column, so it survives later edits. */
  properties?: Record<string, unknown>;
} = {}): Promise<PlannerNote> {
  const userId = await uid();
  const content = partial.content ?? EMPTY_DOC;
  const { data, error } = await supabase
    .from('gw_planner_notes')
    .insert({
      user_id: userId,
      title: partial.title ?? '',
      folder_id: partial.folder_id ?? null,
      content,
      content_text: docToText(content),
      content_md: docToMarkdown(content),
      tags: extractTags(docToText(content)),
      entity_type: partial.entity_type ?? null,
      entity_id: partial.entity_id ?? null,
      ...(partial.properties ? { properties: partial.properties } : {}),
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PlannerNote;
}

/**
 * Full save pipeline. `expectedVersion` is the version the editor
 * loaded; a mismatch throws NoteConflictError instead of clobbering.
 */
export async function saveNote(
  id: string,
  input: { title: string; content: DocNode; expectedVersion: number },
): Promise<PlannerNote> {
  const contentText = docToText(input.content);
  const { data, error } = await supabase
    .from('gw_planner_notes')
    .update({
      title: input.title,
      content: input.content,
      content_text: contentText,
      content_md: docToMarkdown(input.content),
      tags: extractTags(contentText),
      version: input.expectedVersion + 1,
    })
    .eq('id', id)
    .eq('version', input.expectedVersion)
    .select('*');
  if (error) throw error;
  const rows = (data ?? []) as PlannerNote[];
  if (rows.length === 0) throw new NoteConflictError(id);
  const note = rows[0];

  // best-effort side pipelines: failures here must not lose the save
  await Promise.allSettled([
    writeRevision(note),
    rebuildLinks(note),
    syncNoteTasks(note),
  ]);
  return note;
}

async function writeRevision(note: PlannerNote): Promise<void> {
  const { error } = await supabase.from('gw_planner_note_revisions').insert({
    note_id: note.id,
    user_id: note.user_id,
    title: note.title,
    content: note.content,
    content_md: note.content_md,
    version: note.version,
  });
  if (error) throw error;
  // prune beyond the newest REVISION_KEEP
  const { data: old } = await supabase
    .from('gw_planner_note_revisions')
    .select('id')
    .eq('note_id', note.id)
    .order('version', { ascending: false })
    .range(REVISION_KEEP, REVISION_KEEP + 20);
  const ids = ((old ?? []) as { id: string }[]).map((r) => r.id);
  if (ids.length) await supabase.from('gw_planner_note_revisions').delete().in('id', ids);
}

export async function listRevisions(noteId: string) {
  const { data, error } = await supabase
    .from('gw_planner_note_revisions')
    .select('id, title, version, created_at')
    .eq('note_id', noteId)
    .order('version', { ascending: false })
    .limit(REVISION_KEEP);
  if (error) throw error;
  return (data ?? []) as { id: string; title: string; version: number; created_at: string }[];
}

export async function getRevision(revisionId: string) {
  const { data, error } = await supabase
    .from('gw_planner_note_revisions')
    .select('*')
    .eq('id', revisionId)
    .single();
  if (error) throw error;
  return data as { id: string; note_id: string; title: string; content: DocNode; content_md: string; version: number; created_at: string };
}

/** Restore = a normal save of the old content (keeps history linear). */
export async function restoreRevision(noteId: string, revisionId: string): Promise<PlannerNote> {
  const [note, rev] = await Promise.all([getNote(noteId), getRevision(revisionId)]);
  return saveNote(noteId, { title: rev.title, content: rev.content, expectedVersion: note.version });
}

// ── wiki links ────────────────────────────────────────────────────────
async function rebuildLinks(note: PlannerNote): Promise<void> {
  const text = `${note.title}\n${note.content_text}`;
  const wikis = extractWikiLinks(text);
  const entities = extractEntityRefs(text);

  const rows: Omit<NoteLink, 'id'>[] = [];
  if (wikis.length) {
    // resolve period-note targets by date_key, the rest by title
    const titleTargets = wikis.filter((w) => !isDateKeyTarget(w.target));
    const keyTargets = wikis.filter((w) => isDateKeyTarget(w.target));
    if (titleTargets.length) {
      const { data } = await supabase
        .from('gw_planner_notes')
        .select('id, title')
        .is('deleted_at', null)
        .in('title', titleTargets.map((w) => w.target));
      const byTitle = new Map(((data ?? []) as { id: string; title: string }[]).map((n) => [n.title.toLowerCase(), n.id]));
      for (const w of titleTargets) {
        const target = byTitle.get(w.target.toLowerCase());
        if (target && target !== note.id) {
          rows.push({ note_id: note.id, target_note_id: target, target_entity_type: null, target_entity_id: null, link_text: w.target });
        }
      }
    }
    if (keyTargets.length) {
      const { data } = await supabase
        .from('gw_planner_notes')
        .select('id, date_key')
        .eq('user_id', note.user_id)
        .in('date_key', keyTargets.map((w) => w.target));
      const byKey = new Map(((data ?? []) as { id: string; date_key: string }[]).map((n) => [n.date_key, n.id]));
      for (const w of keyTargets) {
        const target = byKey.get(w.target);
        if (target && target !== note.id) {
          rows.push({ note_id: note.id, target_note_id: target, target_entity_type: null, target_entity_id: null, link_text: w.target });
        }
      }
    }
  }
  for (const e of entities) {
    rows.push({ note_id: note.id, target_note_id: null, target_entity_type: e.entityType, target_entity_id: e.entityId, link_text: e.entityType });
  }

  await supabase.from('gw_planner_note_links').delete().eq('note_id', note.id);
  if (rows.length) {
    const { error } = await supabase
      .from('gw_planner_note_links')
      .insert(rows.map((r) => ({ ...r, user_id: note.user_id })));
    if (error) throw error;
  }
}

export async function getBacklinks(noteId: string): Promise<{ id: string; title: string; note_type: NoteType; date_key: string | null }[]> {
  const { data, error } = await supabase
    .from('gw_planner_note_links')
    .select('note_id')
    .eq('target_note_id', noteId);
  if (error) throw error;
  const ids = [...new Set(((data ?? []) as { note_id: string }[]).map((r) => r.note_id))];
  if (!ids.length) return [];
  const { data: notes, error: nErr } = await supabase
    .from('gw_planner_notes')
    .select('id, title, note_type, date_key')
    .in('id', ids)
    .is('deleted_at', null);
  if (nErr) throw nErr;
  return (notes ?? []) as { id: string; title: string; note_type: NoteType; date_key: string | null }[];
}

export async function getOutgoingLinks(noteId: string): Promise<NoteLink[]> {
  const { data, error } = await supabase
    .from('gw_planner_note_links')
    .select('id, note_id, target_note_id, target_entity_type, target_entity_id, link_text')
    .eq('note_id', noteId);
  if (error) throw error;
  return (data ?? []) as NoteLink[];
}

// ── task sync (note → rows) ───────────────────────────────────────────
async function syncNoteTasks(note: PlannerNote): Promise<void> {
  const blocks = extractTaskBlocks(note.content);
  const { data, error } = await supabase
    .from('gw_planner_tasks')
    .select('*')
    .eq('note_id', note.id)
    .is('deleted_at', null);
  if (error) throw error;
  const plan = diffTasks((data ?? []) as PlannerTask[], blocks);

  if (plan.creates.length) {
    await supabase.from('gw_planner_tasks').insert(
      plan.creates.map((b) => ({
        user_id: note.user_id,
        note_id: note.id,
        block_id: b.blockId,
        title: b.title,
        status: b.checked ? 'done' : 'open',
        completed_at: b.checked ? new Date().toISOString() : null,
        position: b.position,
      })),
    );
  }
  for (const { task, block } of plan.updates) {
    const toDone = block.checked && task.status === 'open';
    const toOpen = !block.checked && task.status === 'done';
    await supabase
      .from('gw_planner_tasks')
      .update({
        title: block.title,
        position: block.position,
        ...(toDone ? { status: 'done', completed_at: new Date().toISOString() } : {}),
        ...(toOpen ? { status: 'open', completed_at: null } : {}),
      })
      .eq('id', task.id);
  }
  if (plan.detaches.length) {
    await supabase
      .from('gw_planner_tasks')
      .update({ note_id: null, block_id: null })
      .in('id', plan.detaches.map((t) => t.id));
  }
  if (plan.deletes.length) {
    await supabase
      .from('gw_planner_tasks')
      .update({ deleted_at: new Date().toISOString() })
      .in('id', plan.deletes.map((t) => t.id));
  }
}

// ── metadata mutations ────────────────────────────────────────────────
export async function setFavorite(id: string, isFavorite: boolean): Promise<void> {
  const { error } = await supabase.from('gw_planner_notes').update({ is_favorite: isFavorite }).eq('id', id);
  if (error) throw error;
}

export async function moveToFolder(id: string, folderId: string | null): Promise<void> {
  const { error } = await supabase.from('gw_planner_notes').update({ folder_id: folderId }).eq('id', id);
  if (error) throw error;
}

export async function renameNote(id: string, title: string): Promise<void> {
  const { error } = await supabase.from('gw_planner_notes').update({ title }).eq('id', id);
  if (error) throw error;
}

export async function trashNote(id: string): Promise<void> {
  const { error } = await supabase
    .from('gw_planner_notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function restoreNote(id: string): Promise<void> {
  const { error } = await supabase.from('gw_planner_notes').update({ deleted_at: null }).eq('id', id);
  if (error) throw error;
}

/** Permanent delete — only offered from the Trash view. */
export async function deleteNoteForever(id: string): Promise<void> {
  const { error } = await supabase.from('gw_planner_notes').delete().eq('id', id);
  if (error) throw error;
}

/** Titles + period keys for wiki-link autocomplete. */
export async function listLinkTargets(query: string, limit = 8): Promise<{ id: string; title: string; date_key: string | null }[]> {
  let q = supabase
    .from('gw_planner_notes')
    .select('id, title, date_key')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (query.trim()) q = q.ilike('title', `%${escapeLike(query.trim())}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as { id: string; title: string; date_key: string | null }[];
}

export function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, (c) => `\\${c}`).replace(/,/g, ' ');
}

export { typeOfKey };
