import { describe, expect, it } from 'vitest';
import { diffTasks, ensureBlockIds, extractTaskBlocks, setTaskCheckedInDoc } from '../taskSync';
import type { DocNode, PlannerTask } from '../types';

const taskItem = (blockId: string | undefined, text: string, checked = false): DocNode => ({
  type: 'taskItem',
  attrs: blockId ? { checked, blockId } : { checked },
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
});

const docWith = (...items: DocNode[]): DocNode => ({
  type: 'doc',
  content: [{ type: 'taskList', content: items }],
});

const row = (over: Partial<PlannerTask>): PlannerTask => ({
  id: 'id', user_id: 'u', note_id: 'n', block_id: null, title: '', status: 'open',
  priority: 'none', scheduled_date: null, due_at: null, completed_at: null,
  recurrence: null, recurrence_parent_id: null, tags: [], position: 0,
  deleted_at: null, created_at: '', updated_at: '', ...over,
});

describe('extractTaskBlocks', () => {
  it('walks in document order, skipping id-less items', () => {
    const doc = docWith(taskItem('a', 'First'), taskItem(undefined, 'No id'), taskItem('b', 'Second', true));
    expect(extractTaskBlocks(doc)).toEqual([
      { blockId: 'a', title: 'First', checked: false, position: 0 },
      { blockId: 'b', title: 'Second', checked: true, position: 1 },
    ]);
  });
});

describe('ensureBlockIds', () => {
  it('assigns ids only where missing, immutably', () => {
    let n = 0;
    const doc = docWith(taskItem('keep', 'Has id'), taskItem(undefined, 'Needs id'));
    const { doc: out, changed } = ensureBlockIds(doc, () => `gen-${n++}`);
    expect(changed).toBe(true);
    const blocks = extractTaskBlocks(out);
    expect(blocks.map((b) => b.blockId)).toEqual(['keep', 'gen-0']);
    expect(extractTaskBlocks(doc).length).toBe(1); // original untouched
  });

  it('reports no change when all items have ids', () => {
    const doc = docWith(taskItem('a', 'x'));
    expect(ensureBlockIds(doc, () => 'nope').changed).toBe(false);
  });
});

describe('setTaskCheckedInDoc', () => {
  it('toggles the matching item and returns null on miss', () => {
    const doc = docWith(taskItem('a', 'x'), taskItem('b', 'y'));
    const out = setTaskCheckedInDoc(doc, 'b', true)!;
    expect(extractTaskBlocks(out)[1].checked).toBe(true);
    expect(extractTaskBlocks(doc)[1].checked).toBe(false);
    expect(setTaskCheckedInDoc(doc, 'zzz', true)).toBeNull();
  });
});

describe('diffTasks', () => {
  it('creates rows for new blocks', () => {
    const plan = diffTasks([], [{ blockId: 'a', title: 'New', checked: false, position: 0 }]);
    expect(plan.creates).toHaveLength(1);
    expect(plan.updates).toHaveLength(0);
  });

  it('updates on title/status/position drift', () => {
    const rows = [row({ id: '1', block_id: 'a', title: 'Old', status: 'open', position: 0 })];
    const plan = diffTasks(rows, [{ blockId: 'a', title: 'Old', checked: true, position: 0 }]);
    expect(plan.updates).toHaveLength(1);
  });

  it('does not let a doc checkbox resurrect a cancelled task', () => {
    const rows = [row({ id: '1', block_id: 'a', title: 'T', status: 'cancelled', position: 0 })];
    const plan = diffTasks(rows, [{ blockId: 'a', title: 'T', checked: false, position: 0 }]);
    expect(plan.updates).toHaveLength(0);
  });

  it('detaches scheduled tasks whose block vanished, deletes unscheduled ones', () => {
    const rows = [
      row({ id: '1', block_id: 'gone-scheduled', scheduled_date: '2026-10-17' }),
      row({ id: '2', block_id: 'gone-plain' }),
    ];
    const plan = diffTasks(rows, []);
    expect(plan.detaches.map((t) => t.id)).toEqual(['1']);
    expect(plan.deletes.map((t) => t.id)).toEqual(['2']);
  });
});
