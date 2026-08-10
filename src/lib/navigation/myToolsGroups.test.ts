import { describe, it, expect } from 'vitest';
import {
  parseMyTools, migrateToMyTools, sanitizeShelf,
  GROUP_NAME_MAX, MY_TOOLS_SANITY_MAX, type ToolGroup,
} from './myTools';

const g = (over: Partial<ToolGroup> = {}): ToolGroup =>
  ({ id: 'g1', name: 'Sunday', tools: ['liturgy'], collapsed: false, ...over });

// The on-disk version deliberately STAYS 4 — `groups` is an additive field,
// not a new schema version. See parseMyTools' comment in myTools.ts for why
// (bundled iOS readers). These tests pin that decision: if someone bumps the
// written version, the first two here fail loudly.
describe('parseMyTools — the stored version stays 4; groups is additive', () => {
  it('reads a genuine legacy v4 record with NO groups key as groups: []', () => {
    const v4 = { v: 4, tools: ['calendar', 'messages'], widgets: ['next-up'], setupComplete: true };
    expect(parseMyTools(v4)).toEqual({
      v: 4, tools: ['calendar', 'messages'], groups: [], widgets: ['next-up'], setupComplete: true,
    });
  });

  it('reads groups off a v4 record — v4-with-groups is what this branch WRITES', () => {
    const v4 = { v: 4, tools: ['calendar'], groups: [g()], widgets: [], setupComplete: true };
    const parsed = parseMyTools(v4);
    expect(parsed?.v).toBe(4);
    expect(parsed?.tools).toEqual(['calendar']);
    expect(parsed?.groups).toEqual([g()]);
  });

  it('round-trips a v4 record carrying groups with its filing intact', () => {
    const stored = {
      v: 4, tools: ['calendar'], widgets: [], setupComplete: true,
      groups: [g({ id: 'a', name: 'Sunday', tools: ['liturgy'] }), g({ id: 'b', name: 'Teaching', tools: ['academy'], collapsed: true })],
    };
    const parsed = parseMyTools(stored);
    expect(parsed).toEqual(stored);
  });

  it('still reads a v5 record written by earlier commits on this branch', () => {
    const v5 = { v: 5, tools: ['calendar'], groups: [g()], widgets: [], setupComplete: true };
    const parsed = parseMyTools(v5);
    expect(parsed?.tools).toEqual(['calendar']);
    expect(parsed?.groups).toEqual([g()]);
    // Read as v5, re-written as v4 — the record heals itself on the next save.
    expect(parsed?.v).toBe(4);
  });

  it('degrades malformed groups to [] rather than throwing', () => {
    const bad = { v: 4, tools: ['calendar'], groups: 'not-an-array', widgets: [], setupComplete: true };
    expect(parseMyTools(bad)?.groups).toEqual([]);
  });

  it('drops individual group entries that are missing an id or name', () => {
    const bad = {
      v: 4, tools: [], widgets: [], setupComplete: true,
      groups: [g(), { name: 'no id', tools: [] }, { id: 'x', tools: [] }],
    };
    expect(parseMyTools(bad)?.groups).toEqual([g()]);
  });

  it('clamps an over-long group name instead of rejecting the record', () => {
    const long = 'x'.repeat(GROUP_NAME_MAX + 20);
    const rec = { v: 4, tools: [], widgets: [], setupComplete: true, groups: [g({ name: long })] };
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
  it('returns an existing v4 record as-is, not replaced by role defaults', () => {
    const v4 = { v: 4, tools: ['studio'], widgets: [], setupComplete: true };
    const out = migrateToMyTools(v4, null, 'faculty');
    expect(out.tools).toEqual(['studio']);
    expect(out.groups).toEqual([]);
    expect(out.v).toBe(4);
  });

  it("keeps an existing v4 record's groups", () => {
    const v4 = { v: 4, tools: ['studio'], widgets: [], setupComplete: true, groups: [g()] };
    expect(migrateToMyTools(v4, null, 'faculty').groups).toEqual([g()]);
  });

  it('seeds role defaults with no groups for a member with nothing stored', () => {
    const out = migrateToMyTools(null, null, 'student');
    expect(out.groups).toEqual([]);
    expect(out.setupComplete).toBe(false);
    expect(out.v).toBe(4);
  });

  it('constructs a v4 record from a legacy home_tile_layout', () => {
    const out = migrateToMyTools(null, { v: 1, order: ['studio'] }, 'student');
    expect(out.v).toBe(4);
    expect(out.tools).toEqual(['studio']);
  });
});
