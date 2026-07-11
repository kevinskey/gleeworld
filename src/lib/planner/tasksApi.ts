// Tasks API. A task edited from any list/kanban view also patches its
// source note's doc (checked state) so the two never disagree; completing
// a recurring task spawns the next occurrence instead of rewriting
// history. All writes are owner-scoped by RLS.
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { docToMarkdown, docToText } from './markdown';
import { nextOccurrence } from './recurrence';
import { setTaskCheckedInDoc } from './taskSync';
import type { PlannerNote, PlannerTask, Recurrence, TaskPriority, TaskStatus } from './types';

export type TaskView = 'today' | 'upcoming' | 'overdue' | 'unscheduled' | 'all' | 'done';

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data?.user?.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

export async function listTasks(view: TaskView, limit = 300): Promise<PlannerTask[]> {
  let q = supabase
    .from('gw_planner_tasks')
    .select('*')
    .is('deleted_at', null)
    .limit(limit);
  const today = todayStr();
  switch (view) {
    case 'today':
      q = q.eq('status', 'open').eq('scheduled_date', today).order('position');
      break;
    case 'overdue':
      q = q.eq('status', 'open').lt('scheduled_date', today).order('scheduled_date');
      break;
    case 'upcoming':
      q = q.eq('status', 'open').gt('scheduled_date', today).order('scheduled_date');
      break;
    case 'unscheduled':
      q = q.eq('status', 'open').is('scheduled_date', null).order('created_at', { ascending: false });
      break;
    case 'done':
      q = q.eq('status', 'done').order('completed_at', { ascending: false }).limit(100);
      break;
    case 'all':
      q = q.neq('status', 'cancelled').order('created_at', { ascending: false });
      break;
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as PlannerTask[];
}

export async function listTasksForDate(date: string): Promise<PlannerTask[]> {
  const { data, error } = await supabase
    .from('gw_planner_tasks')
    .select('*')
    .is('deleted_at', null)
    .eq('scheduled_date', date)
    .order('position');
  if (error) throw error;
  return (data ?? []) as PlannerTask[];
}

export async function listTasksForNote(noteId: string): Promise<PlannerTask[]> {
  const { data, error } = await supabase
    .from('gw_planner_tasks')
    .select('*')
    .is('deleted_at', null)
    .eq('note_id', noteId)
    .order('position');
  if (error) throw error;
  return (data ?? []) as PlannerTask[];
}

export async function createTask(input: {
  title: string;
  scheduled_date?: string | null;
  due_at?: string | null;
  priority?: TaskPriority;
  recurrence?: Recurrence | null;
  tags?: string[];
}): Promise<PlannerTask> {
  const userId = await uid();
  const { data, error } = await supabase
    .from('gw_planner_tasks')
    .insert({
      user_id: userId,
      title: input.title,
      scheduled_date: input.scheduled_date ?? null,
      due_at: input.due_at ?? null,
      priority: input.priority ?? 'none',
      recurrence: input.recurrence ?? null,
      tags: input.tags ?? [],
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as PlannerTask;
}

export async function updateTask(id: string, patch: Partial<Pick<PlannerTask,
  'title' | 'priority' | 'scheduled_date' | 'due_at' | 'recurrence' | 'tags' | 'position'
>>): Promise<PlannerTask> {
  const { data, error } = await supabase
    .from('gw_planner_tasks')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as PlannerTask;
}

/**
 * Set status from a list/kanban view. Mirrors the checked state back
 * into the source note's doc when the task lives in one, and spawns the
 * next occurrence when a recurring task completes.
 */
export async function setTaskStatus(id: string, status: TaskStatus): Promise<PlannerTask> {
  const { data, error } = await supabase
    .from('gw_planner_tasks')
    .update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  const task = data as PlannerTask;

  await Promise.allSettled([
    mirrorCheckedIntoNote(task, status === 'done'),
    status === 'done' ? spawnNextOccurrence(task) : Promise.resolve(),
  ]);
  return task;
}

async function mirrorCheckedIntoNote(task: PlannerTask, checked: boolean): Promise<void> {
  if (!task.note_id || !task.block_id) return;
  // read-modify-write with a version guard; one retry on conflict
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error } = await supabase
      .from('gw_planner_notes')
      .select('id, content, version')
      .eq('id', task.note_id)
      .single();
    if (error) return; // note gone — task stays authoritative
    const note = data as Pick<PlannerNote, 'id' | 'content' | 'version'>;
    const patched = setTaskCheckedInDoc(note.content, task.block_id, checked);
    if (!patched) return; // block edited away; sync-on-save will reconcile
    const { data: updated } = await supabase
      .from('gw_planner_notes')
      .update({
        content: patched,
        content_text: docToText(patched),
        content_md: docToMarkdown(patched),
        version: note.version + 1,
      })
      .eq('id', note.id)
      .eq('version', note.version)
      .select('id');
    if ((updated ?? []).length > 0) return;
  }
}

async function spawnNextOccurrence(task: PlannerTask): Promise<void> {
  if (!task.recurrence) return;
  const seriesHead = task.recurrence_parent_id ?? task.id;
  const { count } = await supabase
    .from('gw_planner_tasks')
    .select('id', { count: 'exact', head: true })
    .or(`id.eq.${seriesHead},recurrence_parent_id.eq.${seriesHead}`);
  const occurrenceIndex = Math.max(0, (count ?? 1) - 1);
  const after = task.scheduled_date ?? todayStr();
  const next = nextOccurrence(task.recurrence, after, occurrenceIndex);
  if (!next) return;
  await supabase.from('gw_planner_tasks').insert({
    user_id: task.user_id,
    title: task.title,
    priority: task.priority,
    scheduled_date: next,
    recurrence: task.recurrence,
    recurrence_parent_id: seriesHead,
    tags: task.tags,
  });
}

export async function rescheduleTask(id: string, date: string | null): Promise<void> {
  const { error } = await supabase.from('gw_planner_tasks').update({ scheduled_date: date }).eq('id', id);
  if (error) throw error;
}

export async function bulkReschedule(ids: string[], date: string): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase.from('gw_planner_tasks').update({ scheduled_date: date }).in('id', ids);
  if (error) throw error;
}

/** Carry-forward: move every overdue open task to today. Returns count. */
export async function carryForwardOverdue(): Promise<number> {
  const overdue = await listTasks('overdue', 500);
  await bulkReschedule(overdue.map((t) => t.id), todayStr());
  return overdue.length;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('gw_planner_tasks')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Counts for sidebar badges: open today + overdue. */
export async function openTaskCounts(): Promise<{ today: number; overdue: number }> {
  const today = todayStr();
  const [t, o] = await Promise.all([
    supabase.from('gw_planner_tasks').select('id', { count: 'exact', head: true })
      .is('deleted_at', null).eq('status', 'open').eq('scheduled_date', today),
    supabase.from('gw_planner_tasks').select('id', { count: 'exact', head: true })
      .is('deleted_at', null).eq('status', 'open').lt('scheduled_date', today),
  ]);
  return { today: t.count ?? 0, overdue: o.count ?? 0 };
}
