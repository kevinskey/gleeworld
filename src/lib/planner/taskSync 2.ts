// Task ↔ note synchronization (the load-bearing invariant of Planner):
// a task that lives in a note is a `taskItem` node carrying a stable
// attrs.blockId, mirrored by a gw_planner_tasks row keyed on
// (note_id, block_id). One direction at a time:
//
//   note save  → extractTaskBlocks(doc) → diffTasks(rows, blocks)
//   list/kanban toggle → setTaskCheckedInDoc(doc, blockId, checked)
//
// so a completion made anywhere shows up everywhere, and the same task
// is never duplicated just to appear in two views.
import type { DocNode, PlannerTask } from './types';

export interface TaskBlock {
  blockId: string;
  title: string;
  checked: boolean;
  position: number;
}

/** All taskItem nodes with blockIds, in document order. */
export function extractTaskBlocks(doc: DocNode): TaskBlock[] {
  const out: TaskBlock[] = [];
  const walk = (node: DocNode) => {
    if (node.type === 'taskItem') {
      const blockId = node.attrs?.blockId;
      if (typeof blockId === 'string' && blockId) {
        out.push({
          blockId,
          title: nodeText(node).trim(),
          checked: node.attrs?.checked === true,
          position: out.length,
        });
      }
    }
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc);
  return out;
}

function nodeText(node: DocNode): string {
  if (node.text !== undefined) return node.text;
  return (node.content ?? []).map(nodeText).join('');
}

/**
 * Assign blockIds to taskItems that lack one. Returns a new doc and
 * whether anything changed. `makeId` is injectable for tests.
 */
export function ensureBlockIds(
  doc: DocNode,
  makeId: () => string = defaultId,
): { doc: DocNode; changed: boolean } {
  let changed = false;
  const walk = (node: DocNode): DocNode => {
    let next = node;
    if (node.type === 'taskItem' && typeof node.attrs?.blockId !== 'string') {
      changed = true;
      next = { ...node, attrs: { ...node.attrs, blockId: makeId() } };
    }
    if (next.content) {
      const content = next.content.map(walk);
      if (content.some((c, i) => c !== next.content![i])) {
        next = next === node ? { ...node, content } : { ...next, content };
      }
    }
    return next;
  };
  const out = walk(doc);
  return { doc: out, changed };
}

function defaultId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `blk-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/** Set a taskItem's checked attr by blockId. Returns null if not found. */
export function setTaskCheckedInDoc(doc: DocNode, blockId: string, checked: boolean): DocNode | null {
  let found = false;
  const walk = (node: DocNode): DocNode => {
    if (node.type === 'taskItem' && node.attrs?.blockId === blockId) {
      found = true;
      return { ...node, attrs: { ...node.attrs, checked } };
    }
    if (node.content) {
      const content = node.content.map(walk);
      if (content.some((c, i) => c !== node.content![i])) return { ...node, content };
    }
    return node;
  };
  const out = walk(doc);
  return found ? out : null;
}

export interface TaskSyncPlan {
  /** blocks that need a new task row */
  creates: TaskBlock[];
  /** existing rows whose title/status/position drifted from the doc */
  updates: { task: PlannerTask; block: TaskBlock }[];
  /**
   * rows whose block vanished from the doc. Scheduled/recurring tasks
   * are detached (survive standalone); the rest are soft-deleted.
   */
  detaches: PlannerTask[];
  deletes: PlannerTask[];
}

/** Diff note-linked task rows against the doc's task blocks. */
export function diffTasks(rows: PlannerTask[], blocks: TaskBlock[]): TaskSyncPlan {
  const byBlock = new Map(rows.filter((t) => t.block_id).map((t) => [t.block_id as string, t]));
  const plan: TaskSyncPlan = { creates: [], updates: [], detaches: [], deletes: [] };

  for (const block of blocks) {
    const task = byBlock.get(block.blockId);
    if (!task) {
      plan.creates.push(block);
      continue;
    }
    byBlock.delete(block.blockId);
    // cancelled is a deliberate list-side state; a doc checkbox never overrides it
    const statusDrifted =
      (block.checked && task.status === 'open') || (!block.checked && task.status === 'done');
    if (task.title !== block.title || statusDrifted || task.position !== block.position) {
      plan.updates.push({ task, block });
    }
  }

  for (const task of byBlock.values()) {
    if (task.deleted_at) continue;
    if (task.scheduled_date || task.due_at || task.recurrence) plan.detaches.push(task);
    else plan.deletes.push(task);
  }
  return plan;
}
