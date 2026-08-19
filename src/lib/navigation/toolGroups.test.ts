import { describe, it, expect } from 'vitest';
import {
  categorizeShelf, createGroup, deleteGroup, fileToolByCategory, flattenShelf,
  groupIdOf, moveGroup, moveTool, renameGroup, setGroupCollapsed,
} from './toolGroups';
import { GROUP_NAME_MAX, GROUPS_SANITY_MAX, type Shelf } from './myTools';

const shelf = (): Shelf => ({
  tools: ['calendar', 'messages'],
  groups: [
    { id: 'a', name: 'Sunday', tools: ['liturgy', 'worship-aids'], collapsed: false },
    { id: 'b', name: 'Teaching', tools: ['academy'], collapsed: true },
  ],
});

describe('createGroup', () => {
  it('appends an empty expanded group', () => {
    const out = createGroup(shelf(), 'Money', 'c');
    expect(out.groups.at(-1)).toEqual({ id: 'c', name: 'Money', tools: [], collapsed: false });
  });
  it('clamps the name', () => {
    const out = createGroup(shelf(), 'y'.repeat(GROUP_NAME_MAX + 5), 'c');
    expect(out.groups.at(-1)!.name).toHaveLength(GROUP_NAME_MAX);
  });
  it('leaves loose tools untouched', () => {
    expect(createGroup(shelf(), 'Money', 'c').tools).toEqual(['calendar', 'messages']);
  });
});

describe('renameGroup', () => {
  it('renames without disturbing tools or collapse', () => {
    const out = renameGroup(shelf(), 'a', 'Liturgy');
    expect(out.groups[0]).toEqual({ id: 'a', name: 'Liturgy', tools: ['liturgy', 'worship-aids'], collapsed: false });
  });
  it('is a no-op for an unknown id', () => {
    expect(renameGroup(shelf(), 'zzz', 'X')).toEqual(shelf());
  });
});

describe('setGroupCollapsed', () => {
  it('toggles only the named group', () => {
    const out = setGroupCollapsed(shelf(), 'a', true);
    expect(out.groups[0].collapsed).toBe(true);
    expect(out.groups[1].collapsed).toBe(true);
  });
});

describe('moveGroup', () => {
  it('moves a group down', () => {
    expect(moveGroup(shelf(), 'a', 1).groups.map((g) => g.id)).toEqual(['b', 'a']);
  });
  it('clamps at the top', () => {
    expect(moveGroup(shelf(), 'a', -1).groups.map((g) => g.id)).toEqual(['a', 'b']);
  });
  it('clamps at the bottom', () => {
    expect(moveGroup(shelf(), 'b', 1).groups.map((g) => g.id)).toEqual(['a', 'b']);
  });
});

describe('deleteGroup', () => {
  it('never unpins a tool — members fall back to the end of loose', () => {
    const out = deleteGroup(shelf(), 'a');
    expect(out.groups.map((g) => g.id)).toEqual(['b']);
    expect(out.tools).toEqual(['calendar', 'messages', 'liturgy', 'worship-aids']);
  });
  it('conserves the total tool count', () => {
    const before = flattenShelf(shelf()).length;
    expect(flattenShelf(deleteGroup(shelf(), 'a'))).toHaveLength(before);
  });
});

describe('moveTool', () => {
  it('moves a loose tool into a group', () => {
    const out = moveTool(shelf(), 'calendar', 'a');
    expect(out.tools).toEqual(['messages']);
    expect(out.groups[0].tools).toEqual(['liturgy', 'worship-aids', 'calendar']);
  });
  it('moves a grouped tool out to loose', () => {
    const out = moveTool(shelf(), 'liturgy', null);
    expect(out.groups[0].tools).toEqual(['worship-aids']);
    expect(out.tools).toEqual(['calendar', 'messages', 'liturgy']);
  });
  it('moves a tool between groups without duplicating it', () => {
    const out = moveTool(shelf(), 'academy', 'a');
    expect(out.groups[0].tools).toEqual(['liturgy', 'worship-aids', 'academy']);
    expect(out.groups[1].tools).toEqual([]);
    expect(flattenShelf(out).filter((k) => k === 'academy')).toHaveLength(1);
  });
  it('is a no-op for a key that is not on the shelf', () => {
    expect(moveTool(shelf(), 'nope', 'a')).toEqual(shelf());
  });
  it('is a no-op for an unknown target group', () => {
    expect(moveTool(shelf(), 'calendar', 'zzz')).toEqual(shelf());
  });
});

describe('flattenShelf / groupIdOf', () => {
  it('flattens loose first, then groups in order', () => {
    expect(flattenShelf(shelf())).toEqual([
      'calendar', 'messages', 'liturgy', 'worship-aids', 'academy',
    ]);
  });
  it('reports the owning group, or null for loose', () => {
    expect(groupIdOf(shelf(), 'liturgy')).toBe('a');
    expect(groupIdOf(shelf(), 'calendar')).toBeNull();
    expect(groupIdOf(shelf(), 'nope')).toBeNull();
  });
});

describe('fileToolByCategory', () => {
  it('creates the category group on first use', () => {
    const out = fileToolByCategory(shelf(), 'finance', 'Money', 'c');
    expect(out.groups.at(-1)).toEqual({ id: 'c', name: 'Money', tools: ['finance'], collapsed: false });
    expect(out.tools).toEqual(['calendar', 'messages']);
  });
  it('appends into an existing group with that exact name', () => {
    const out = fileToolByCategory(shelf(), 'readings', 'Sunday', 'unused');
    expect(out.groups[0].tools).toEqual(['liturgy', 'worship-aids', 'readings']);
    expect(out.groups).toHaveLength(2);
  });
  it('does not repurpose a member-renamed group — name must match exactly', () => {
    const out = fileToolByCategory(shelf(), 'academy', 'Teach', 'c');
    // 'Teaching' (member's group) is not 'Teach' — a new group appears.
    expect(out.groups.map((g) => g.name)).toEqual(['Sunday', 'Teaching', 'Teach']);
  });
  it('lands the tool loose at GROUPS_SANITY_MAX rather than losing the pin', () => {
    const full: Shelf = {
      tools: [],
      groups: Array.from({ length: GROUPS_SANITY_MAX }, (_, i) => ({
        id: `g${i}`, name: `G${i}`, tools: [], collapsed: false,
      })),
    };
    const out = fileToolByCategory(full, 'finance', 'Money', 'c');
    expect(out.groups).toHaveLength(GROUPS_SANITY_MAX);
    expect(out.tools).toEqual(['finance']);
  });
});

describe('categorizeShelf', () => {
  const category = (key: string): string | null =>
    ({ calendar: 'Today', messages: 'Today', finance: 'Money' } as Record<string, string>)[key] ?? null;
  let n = 0;
  const makeId = () => `id${n++}`;

  it('files every loose tool into its category group, leaving member groups intact', () => {
    const out = categorizeShelf(shelf(), category, makeId);
    expect(out.tools).toEqual([]);
    expect(out.groups.map((g) => [g.name, ...g.tools])).toEqual([
      ['Sunday', 'liturgy', 'worship-aids'],
      ['Teaching', 'academy'],
      ['Today', 'calendar', 'messages'],
    ]);
  });
  it('keeps a key with no category loose', () => {
    const out = categorizeShelf({ tools: ['ghost', 'finance'], groups: [] }, category, makeId);
    expect(out.tools).toEqual(['ghost']);
    expect(out.groups.map((g) => [g.name, ...g.tools])).toEqual([['Money', 'finance']]);
  });
  it('never duplicates or drops a key', () => {
    const before = shelf();
    const out = categorizeShelf(before, category, makeId);
    expect([...flattenShelf(out)].sort()).toEqual([...flattenShelf(before)].sort());
  });
});
