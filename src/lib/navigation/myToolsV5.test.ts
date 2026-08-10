import { describe, it, expect } from 'vitest';
import {
  parseMyTools, migrateToMyTools, sanitizeShelf,
  GROUP_NAME_MAX, MY_TOOLS_SANITY_MAX, type ToolGroup,
} from './myTools';

const g = (over: Partial<ToolGroup> = {}): ToolGroup =>
  ({ id: 'g1', name: 'Sunday', tools: ['liturgy'], collapsed: false, ...over });

describe('parseMyTools — v4 is read as v5 with no groups', () => {
  it('widens a v4 record without touching its tools', () => {
    const v4 = { v: 4, tools: ['calendar', 'messages'], widgets: ['next-up'], setupComplete: true };
    expect(parseMyTools(v4)).toEqual({
      v: 5, tools: ['calendar', 'messages'], groups: [], widgets: ['next-up'], setupComplete: true,
    });
  });

  it('reads a v5 record with groups', () => {
    const v5 = { v: 5, tools: ['calendar'], groups: [g()], widgets: [], setupComplete: true };
    expect(parseMyTools(v5)?.groups).toEqual([g()]);
  });

  it('degrades malformed groups to [] rather than throwing', () => {
    const bad = { v: 5, tools: ['calendar'], groups: 'not-an-array', widgets: [], setupComplete: true };
    expect(parseMyTools(bad)?.groups).toEqual([]);
  });

  it('drops individual group entries that are missing an id or name', () => {
    const bad = {
      v: 5, tools: [], widgets: [], setupComplete: true,
      groups: [g(), { name: 'no id', tools: [] }, { id: 'x', tools: [] }],
    };
    expect(parseMyTools(bad)?.groups).toEqual([g()]);
  });

  it('clamps an over-long group name instead of rejecting the record', () => {
    const long = 'x'.repeat(GROUP_NAME_MAX + 20);
    const rec = { v: 5, tools: [], widgets: [], setupComplete: true, groups: [g({ name: long })] };
    expect(parseMyTools(rec)?.groups[0].name).toHaveLength(GROUP_NAME_MAX);
  });

  it('still rejects a non-v4/v5 blob', () => {
    expect(parseMyTools({ v: 3, order: ['a'] })).toBeNull();
  });
});

describe('sanitizeShelf — one key, one home', () => {
  it('keeps the first occurrence when a key is in both loose and a group', () => {
    const out = sanitizeShelf(['calendar'], [g({ tools: ['calendar', 'liturgy'] })]);
    expect(out.tools).toEqual(['calendar']);
    expect(out.groups[0].tools).toEqual(['liturgy']);
  });

  it('keeps the first occurrence when a key is in two groups', () => {
    const out = sanitizeShelf([], [
      g({ id: 'a', tools: ['liturgy'] }),
      g({ id: 'b', tools: ['liturgy', 'academy'] }),
    ]);
    expect(out.groups[0].tools).toEqual(['liturgy']);
    expect(out.groups[1].tools).toEqual(['academy']);
  });

  it("strips 'home' from loose and from groups", () => {
    const out = sanitizeShelf(['home', 'calendar'], [g({ tools: ['home', 'liturgy'] })]);
    expect(out.tools).toEqual(['calendar']);
    expect(out.groups[0].tools).toEqual(['liturgy']);
  });

  it('preserves an empty group — the editor still shows it', () => {
    const out = sanitizeShelf([], [g({ tools: [] })]);
    expect(out.groups).toHaveLength(1);
  });

  it('bounds loose + grouped COMBINED at MY_TOOLS_SANITY_MAX', () => {
    const many = Array.from({ length: 50 }, (_, i) => `k${i}`);
    const more = Array.from({ length: 50 }, (_, i) => `j${i}`);
    const out = sanitizeShelf(many, [g({ tools: more })]);
    expect(out.tools.length + out.groups[0].tools.length).toBe(MY_TOOLS_SANITY_MAX);
  });
});

describe('migrateToMyTools', () => {
  it('returns an existing v4 record widened, not replaced by role defaults', () => {
    const v4 = { v: 4, tools: ['studio'], widgets: [], setupComplete: true };
    const out = migrateToMyTools(v4, null, 'faculty');
    expect(out.tools).toEqual(['studio']);
    expect(out.groups).toEqual([]);
    expect(out.v).toBe(5);
  });

  it('seeds role defaults with no groups for a member with nothing stored', () => {
    const out = migrateToMyTools(null, null, 'student');
    expect(out.groups).toEqual([]);
    expect(out.setupComplete).toBe(false);
  });
});
