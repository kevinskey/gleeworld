# My World Groups — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a member of any GleeWorld tenant create named groups on their My World shelf, so a shelf that has grown past a handful of tools reads as a filing system instead of a long list.

**Architecture:** `MyTools` grows from v4 to v5 by adding a `groups: ToolGroup[]` field beside the existing `tools: string[]`, which keeps its exact v4 meaning as the *loose* tools rendered above every group. Because that meaning is unchanged, v4 → v5 is a pure widening: no backfill, no DDL, and an existing shelf renders identically until its owner makes a group. Pure group operations live in a new `toolGroups.ts`; the shelf, the keycap grid, and the editor all read the same record.

**Tech Stack:** TypeScript, React 18, Vitest + Testing Library, dnd-kit (already a dependency), Radix (via shadcn `DropdownMenu`), TanStack Query, Supabase RPC `save_nav_item_order`.

**Spec:** `docs/superpowers/specs/2026-08-10-my-world-groups-design.md`

**Worktree:** `~/Documents/GitHub/gw-worktrees/my-world-groups`, branch `feat/my-world-groups`, off `origin/main`.

## Global Constraints

- **Scope is Phase 1 only** — member-personal groups. Phase 2 (tenant-seeded groups) is a separate plan, blocked on verifying the live type of `gw_tenant_nav_prefs.default_tools`. Touch no migration in this plan.
- **No DDL.** Everything persists in the existing `user_preferences.nav_item_order` jsonb column, through the existing `save_nav_item_order` RPC. That RPC is `SECURITY DEFINER` and is the *only* supported write path — a direct upsert 403s when the caller's subdomain-derived tenant disagrees with the stored row.
- **No product caps.** `MY_TOOLS_SANITY_MAX = 64` (now counting loose + grouped combined) and the new `GROUPS_SANITY_MAX = 32` are corruption guards only. `GROUP_NAME_MAX = 32` is a real rendering constraint, enforced by clamping input, never by rejecting a save. Comment each with that distinction — PR #584 removed a cap and its comments exist so nobody reinstates one as a "fix".
- **Gating filters at render, never at storage.** A tool whose module is switched off stays in the record so re-enabling restores its position.
- **Empty groups render in the editor only** — never on the shelf or the keycap grid. This covers both a never-filled group and one whose every tool is gated off for this viewer.
- **Deleting a group never unpins its tools.** They move to the end of the loose list.
- **A key appears at most once** across `tools` + every `groups[].tools`.
- **Radix menu triggers do not respond to `fireEvent.click`, and in this repo they do not respond to `mouseDown` either.** `fireEvent.click` on a Radix trigger passes vacuously — the assertion after it proves nothing, which has already silently killed 3+ tests on this feature. Corrected during Task 5 after reading the installed source: `@radix-ui/react-dropdown-menu@2.1.2` registers `onPointerDown` and **no** `onMouseDown`, and jsdom 20 has no global `PointerEvent`, so Testing Library falls back to a bare `Event` that drops `button`/`ctrlKey` and Radix ignores it. The working recipe, established in `MyWorldGroups.test.tsx`, is a suite-scoped `PointerEvent` polyfill extending `MouseEvent`, then:

  ```ts
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  ```

  Menu *items* are still driven with `fireEvent.click`, and may need `await screen.findByRole('menuitem', …)` because Radix portals asynchronously. If a menu test fails to find its item, never "fix" it by reverting the trigger to `click` — that reintroduces the vacuous pass.
- **Run `npm run test` and `npm run typecheck:guard` before every commit.** `typecheck:guard` is the real type gate; `tsconfig.app.json` sets `noCheck: true` so `tsc` alone proves nothing.
- Worktrees need their own install: `npm ci --legacy-peer-deps` before the first test run.

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/lib/navigation/toolGroups.ts` | Pure group operations (create/rename/collapse/move/delete/move-tool/flatten). No React, no I/O. |
| `src/lib/navigation/toolGroups.test.ts` | Unit tests for the above. |
| `src/components/dashboard/MyWorldGroupRow.tsx` | One group header row in the editor: caret, name, count, and its Rename / Move / Delete menu. |
| `src/components/dashboard/ToolRowMenu.tsx` | The per-tool "Move to…" menu shared by grouped and loose rows. |
| `src/components/dashboard/MyWorldGroups.test.tsx` | Editor-level group behavior tests. |
| `src/lib/navigation/myToolsV5.test.ts` | v4→v5 widening, parse, sanitize invariants. |

**Modified**

| File | Change |
|---|---|
| `src/lib/navigation/myTools.ts` | v5 types, `parseMyTools` accepts v4+v5, `sanitizeShelf`, new bounds. |
| `src/hooks/useMyTools.ts` | `saveMyTools` carries `groups`; writes `v: 5`. |
| `src/components/dashboard/NavShelf.tsx` | Renders group headers + collapse. |
| `src/components/dashboard/DashboardShell.tsx` | Passes groups to both `NavShelf` call sites. |
| `src/components/dashboard/MyWorldEditor.tsx` | Group headers, `＋ New Group`, per-row menus, multi-container drag. |
| `src/pages/dashboard/MyWorldPage.tsx` | Wires `groups` + `onGroupsChange`. |
| `src/lib/navigation/appDestinations.ts` | `bandDestinations` partitions the grid into bands. |
| `src/components/dashboard/HomeTileGrid.tsx` | Renders bands with headings. |
| `src/pages/dashboard/HouseHome.tsx` | Flattens the shelf for the tile pool; group-aware save. |

`MyWorldEditor.tsx` is 303 lines today and would pass 550 with the group UI inlined. The two new components exist to keep it in the range where a whole file fits in one reading.

---

### Task 1: `MyTools` v5 model

**Files:**
- Modify: `src/lib/navigation/myTools.ts:53-58` (interface), `:112-124` (`parseMyTools`), `:152-167` (`migrateToMyTools`), `:22-45` (bounds)
- Test: `src/lib/navigation/myToolsV5.test.ts`

**Interfaces:**
- Consumes: `MERGED_KEYS`, `resolveKey`, `parseTileLayout`, `DEFAULT_TOOLS_FACULTY`, `DEFAULT_TOOLS_STUDENT` (all already in this file).
- Produces:
  - `interface ToolGroup { id: string; name: string; tools: string[]; collapsed: boolean }`
  - `interface MyTools { v: 5; tools: string[]; groups: ToolGroup[]; widgets: string[]; setupComplete: boolean }`
  - `interface Shelf { tools: string[]; groups: ToolGroup[] }`
  - `sanitizeShelf(tools: string[], groups: ToolGroup[], map?: Record<string,string>): Shelf`
  - `const GROUPS_SANITY_MAX = 32`, `const GROUP_NAME_MAX = 32`
  - `parseMyTools(raw: unknown): MyTools | null` — now accepts `v: 4` and `v: 5`, always returns v5.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/navigation/myToolsV5.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/navigation/myToolsV5.test.ts`
Expected: FAIL — `sanitizeShelf` / `GROUP_NAME_MAX` are not exported.

- [ ] **Step 3: Add the types and bounds**

In `src/lib/navigation/myTools.ts`, replace the `MyTools` interface (currently at `:53-58`) with:

```ts
/**
 * A member-named group of tools. `id` is generated and never derived from
 * `name`, so a rename preserves collapse state, React identity, and the
 * editor's "Move to…" targets.
 */
export interface ToolGroup {
  id: string;
  /** member-authored, clamped to GROUP_NAME_MAX on read and on write */
  name: string;
  tools: string[];
  collapsed: boolean;
}

/** The orderable part of a member's shelf: loose tools, then groups. */
export interface Shelf {
  /** LOOSE tools, rendered above every group. v4's `tools`, meaning unchanged. */
  tools: string[];
  groups: ToolGroup[];
}

export interface MyTools extends Shelf {
  v: 5;
  widgets: string[];
  setupComplete: boolean;
}
```

Add beside `MY_TOOLS_SANITY_MAX`:

```ts
/**
 * Corruption bound on group COUNT, not a product limit — the same
 * distinction MY_TOOLS_SANITY_MAX draws above, for the same reason. A
 * member may make as many groups as they find useful. Do NOT surface this
 * as a "you have too many groups" state anywhere in the UI.
 */
export const GROUPS_SANITY_MAX = 32;

/**
 * The one genuine product constraint in this feature: a name longer than
 * this cannot render in a sidebar group header or a keycap band heading.
 * Enforced by CLAMPING the value (on parse and on save), never by
 * rejecting a save — a member must not lose an edit to a length rule.
 */
export const GROUP_NAME_MAX = 32;
```

Update `MY_TOOLS_SANITY_MAX`'s comment to say it now bounds loose + grouped combined.

- [ ] **Step 4: Implement `parseMyTools` and group parsing**

Replace `parseMyTools` (`:112-124`) with:

```ts
/** Defensive group reader. Anything malformed degrades to [] or is skipped:
 *  a hand-edited or future-version blob must yield a flat shelf, never a
 *  white screen. */
function parseGroups(raw: unknown): ToolGroup[] {
  if (!Array.isArray(raw)) return [];
  const out: ToolGroup[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.name !== 'string') continue;
    if (!Array.isArray(o.tools)) continue;
    out.push({
      id: o.id,
      name: o.name.slice(0, GROUP_NAME_MAX),
      tools: o.tools.filter((k): k is string => typeof k === 'string'),
      collapsed: o.collapsed === true,
    });
    if (out.length >= GROUPS_SANITY_MAX) break;
  }
  return out;
}

/**
 * Reads v4 AND v5, always returning v5. Anything else — including v1-v3 —
 * returns null.
 *
 * v4 → v5 is a pure widening, and that is the whole migration: because
 * unfiled tools stay LOOSE at the top of the shelf, v4's `tools` keeps its
 * exact meaning and a v4 record is simply a v5 record with no groups. There
 * is no backfill and no DDL. A v4 reader meeting a v5 record reads `tools`
 * and ignores `groups` — it loses the filing, never a tool.
 */
export function parseMyTools(raw: unknown): MyTools | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 4 && o.v !== 5) return null;
  if (!Array.isArray(o.tools) || !Array.isArray(o.widgets)) return null;
  return {
    v: 5,
    tools: o.tools.filter((k): k is string => typeof k === 'string'),
    groups: o.v === 5 ? parseGroups(o.groups) : [],
    widgets: o.widgets.filter((k): k is string => typeof k === 'string'),
    setupComplete: o.setupComplete === true,
  };
}
```

- [ ] **Step 5: Implement `sanitizeShelf`**

Add below the existing `sanitizeTools` (keep `sanitizeTools` — `pinTool` and the widgets path still call it):

```ts
/**
 * Resolve merges, drop 'home', and enforce the one-key-one-place invariant
 * across loose AND every group, keeping the FIRST occurrence in render
 * order (loose first, then groups in array order). Without this the grouped
 * keycap grid would render the same tile twice.
 *
 * The MY_TOOLS_SANITY_MAX budget is shared across loose and grouped rows —
 * it is corruption protection for the whole shelf, not a per-list quota.
 * Empty groups survive: the editor renders them so a member can fill the
 * group they just made.
 */
export function sanitizeShelf(
  tools: string[],
  groups: ToolGroup[],
  map: Record<string, string> = MERGED_KEYS,
): Shelf {
  const seen = new Set<string>();
  let budget = MY_TOOLS_SANITY_MAX;
  const take = (keys: string[]): string[] => {
    const out: string[] = [];
    for (const raw of keys) {
      if (budget <= 0) break;
      if (typeof raw !== 'string') continue;
      const k = resolveKey(raw, map);
      if (k === 'home' || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
      budget -= 1;
    }
    return out;
  };
  const nextTools = take(tools);
  const nextGroups = groups.slice(0, GROUPS_SANITY_MAX).map((group) => ({
    ...group,
    name: group.name.slice(0, GROUP_NAME_MAX),
    tools: take(group.tools),
  }));
  return { tools: nextTools, groups: nextGroups };
}
```

- [ ] **Step 6: Update `migrateToMyTools` to emit v5**

In `migrateToMyTools` (`:152-167`) change the two constructed records to include `groups: []` and `v: 5`:

```ts
  const tiles = parseTileLayout(tileLayoutRaw);
  if (tiles) {
    return { v: 5, tools: sanitizeTools(tiles.order), groups: [], widgets: [], setupComplete: true };
  }

  const defaults = role === 'faculty' ? DEFAULT_TOOLS_FACULTY : DEFAULT_TOOLS_STUDENT;
  return { v: 5, tools: sanitizeTools(defaults), groups: [], widgets: [], setupComplete: false };
```

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/lib/navigation/myToolsV5.test.ts`
Expected: PASS, all 13.

- [ ] **Step 8: Run the full suite and the type gate**

Run: `npm run test && npm run typecheck:guard`
Expected: PASS. Existing `myTools` tests that assert `v: 4` will fail — update those assertions to `v: 5`; do **not** weaken them to `expect.anything()`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/navigation/myTools.ts src/lib/navigation/myToolsV5.test.ts
git commit -m "feat(nav): MyTools v5 — groups beside loose tools

v4 -> v5 is a pure widening. Unfiled tools stay loose at the top, so
v4's \`tools\` keeps its exact meaning and a v4 record reads as v5 with
groups: []. No backfill, no DDL, identical render until the member makes
their first group.

sanitizeShelf enforces one-key-one-place across loose and every group,
sharing the MY_TOOLS_SANITY_MAX budget — a duplicate would render the
same keycap twice."
```

---

### Task 2: Pure group operations

**Files:**
- Create: `src/lib/navigation/toolGroups.ts`
- Test: `src/lib/navigation/toolGroups.test.ts`

**Interfaces:**
- Consumes: `Shelf`, `ToolGroup`, `GROUP_NAME_MAX` from Task 1.
- Produces — every function is pure, total, and returns a **new** `Shelf`:
  - `createGroup(shelf: Shelf, name: string, id: string): Shelf`
  - `renameGroup(shelf: Shelf, id: string, name: string): Shelf`
  - `setGroupCollapsed(shelf: Shelf, id: string, collapsed: boolean): Shelf`
  - `moveGroup(shelf: Shelf, id: string, delta: -1 | 1): Shelf`
  - `deleteGroup(shelf: Shelf, id: string): Shelf`
  - `moveTool(shelf: Shelf, key: string, targetGroupId: string | null): Shelf`
  - `flattenShelf(shelf: Shelf): string[]`
  - `groupIdOf(shelf: Shelf, key: string): string | null`

`id` is a **parameter**, not generated inside — these stay deterministic and testable. Callers pass `crypto.randomUUID()`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/navigation/toolGroups.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  createGroup, renameGroup, setGroupCollapsed, moveGroup, deleteGroup,
  moveTool, flattenShelf, groupIdOf,
} from './toolGroups';
import { GROUP_NAME_MAX, type Shelf } from './myTools';

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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/navigation/toolGroups.test.ts`
Expected: FAIL — `Failed to resolve import "./toolGroups"`.

- [ ] **Step 3: Implement the module**

Create `src/lib/navigation/toolGroups.ts`:

```ts
// Pure operations on a member's Shelf (loose tools + named groups).
//
// Every function returns a NEW Shelf and never mutates its input, so callers
// can hand the result straight to a save without worrying about the
// optimistic cache entry sharing structure with the record it replaced.
//
// `id` is a parameter rather than generated here on purpose: these stay
// deterministic and unit-testable, and the one place randomness enters
// (crypto.randomUUID) is the component that creates a group.
// Spec: docs/superpowers/specs/2026-08-10-my-world-groups-design.md §4
import { GROUP_NAME_MAX, type Shelf, type ToolGroup } from './myTools';

const clampName = (name: string): string => name.slice(0, GROUP_NAME_MAX);

export function createGroup(shelf: Shelf, name: string, id: string): Shelf {
  const group: ToolGroup = { id, name: clampName(name), tools: [], collapsed: false };
  return { ...shelf, groups: [...shelf.groups, group] };
}

export function renameGroup(shelf: Shelf, id: string, name: string): Shelf {
  return {
    ...shelf,
    groups: shelf.groups.map((g) => (g.id === id ? { ...g, name: clampName(name) } : g)),
  };
}

export function setGroupCollapsed(shelf: Shelf, id: string, collapsed: boolean): Shelf {
  return {
    ...shelf,
    groups: shelf.groups.map((g) => (g.id === id ? { ...g, collapsed } : g)),
  };
}

export function moveGroup(shelf: Shelf, id: string, delta: -1 | 1): Shelf {
  const from = shelf.groups.findIndex((g) => g.id === id);
  if (from === -1) return shelf;
  const to = from + delta;
  if (to < 0 || to >= shelf.groups.length) return shelf;
  const groups = [...shelf.groups];
  const [moved] = groups.splice(from, 1);
  groups.splice(to, 0, moved);
  return { ...shelf, groups };
}

/**
 * Delete a group and REHOME its tools at the end of the loose list.
 *
 * Deleting a group must never unpin a tool. A member who files eight tools
 * and then deletes the folder has reorganized, not un-chosen — silently
 * dropping their pins would be the worst failure this feature could have.
 */
export function deleteGroup(shelf: Shelf, id: string): Shelf {
  const target = shelf.groups.find((g) => g.id === id);
  if (!target) return shelf;
  return {
    tools: [...shelf.tools, ...target.tools],
    groups: shelf.groups.filter((g) => g.id !== id),
  };
}

/** Which group holds `key`, or null when it is loose or absent. */
export function groupIdOf(shelf: Shelf, key: string): string | null {
  return shelf.groups.find((g) => g.tools.includes(key))?.id ?? null;
}

/**
 * Move one tool to `targetGroupId`, or to the loose list when that is null.
 * Removes it from wherever it currently lives first, so the one-key-one-place
 * invariant holds without relying on sanitizeShelf to clean up after us.
 * A key that is not on the shelf, or a target that does not exist, is a no-op.
 */
export function moveTool(shelf: Shelf, key: string, targetGroupId: string | null): Shelf {
  const isLoose = shelf.tools.includes(key);
  const owner = groupIdOf(shelf, key);
  if (!isLoose && owner === null) return shelf;
  if (targetGroupId !== null && !shelf.groups.some((g) => g.id === targetGroupId)) return shelf;
  if (owner === targetGroupId && (targetGroupId !== null || isLoose)) return shelf;

  const stripped: Shelf = {
    tools: shelf.tools.filter((k) => k !== key),
    groups: shelf.groups.map((g) => ({ ...g, tools: g.tools.filter((k) => k !== key) })),
  };
  if (targetGroupId === null) {
    return { ...stripped, tools: [...stripped.tools, key] };
  }
  return {
    ...stripped,
    groups: stripped.groups.map((g) =>
      g.id === targetGroupId ? { ...g, tools: [...g.tools, key] } : g),
  };
}

/** Render order: loose tools, then each group's tools, groups in array order. */
export function flattenShelf(shelf: Shelf): string[] {
  return [...shelf.tools, ...shelf.groups.flatMap((g) => g.tools)];
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/lib/navigation/toolGroups.test.ts`
Expected: PASS, all 18.

- [ ] **Step 5: Commit**

```bash
git add src/lib/navigation/toolGroups.ts src/lib/navigation/toolGroups.test.ts
git commit -m "feat(nav): pure Shelf group operations

Every op returns a new Shelf and takes the new group's id as a parameter,
so the module is deterministic and the one place randomness enters is the
component that creates a group.

deleteGroup rehomes its tools to the end of loose rather than dropping
them: deleting a folder is a reorganization, not an un-choosing."
```

---

### Task 3: `useMyTools` persists groups

**Files:**
- Modify: `src/hooks/useMyTools.ts:123-185` (`saveMyTools`), `:210-230` (`pinTool`)
- Test: `src/hooks/useMyTools.test.tsx` (existing file — add cases)

**Interfaces:**
- Consumes: `sanitizeShelf`, `Shelf`, `ToolGroup` (Task 1); `flattenShelf` (Task 2).
- Produces:
  - `saveMyTools(patch: { tools?: string[]; groups?: ToolGroup[]; widgets?: string[]; setupComplete?: boolean }): Promise<boolean>`
  - `saveShelf(shelf: Shelf): Promise<boolean>` — the editor's one-call save.
  - `myTools` is now `MyTools | null` at v5, so `myTools.groups` is available to every consumer.

- [ ] **Step 1: Write the failing tests**

Append to `src/hooks/useMyTools.test.tsx`:

```tsx
it('a groups-only patch preserves the stored tools', async () => {
  const { result } = renderMyTools({
    nav_item_order: { v: 5, tools: ['calendar'], groups: [], widgets: [], setupComplete: true },
  });
  await waitFor(() => expect(result.current.loaded).toBe(true));
  await act(async () => {
    await result.current.saveMyTools({
      groups: [{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }],
    });
  });
  expect(lastSavedPayload().tools).toEqual(['calendar']);
  expect(lastSavedPayload().groups[0].name).toBe('Sunday');
  expect(lastSavedPayload().v).toBe(5);
});

it('a tools-only patch preserves the stored groups', async () => {
  const { result } = renderMyTools({
    nav_item_order: {
      v: 5, tools: ['calendar'], widgets: [], setupComplete: true,
      groups: [{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }],
    },
  });
  await waitFor(() => expect(result.current.loaded).toBe(true));
  await act(async () => { await result.current.saveTools(['calendar', 'messages']); });
  expect(lastSavedPayload().groups).toHaveLength(1);
});

it('deduplicates a key that a patch puts in both loose and a group', async () => {
  const { result } = renderMyTools({
    nav_item_order: { v: 5, tools: [], groups: [], widgets: [], setupComplete: true },
  });
  await waitFor(() => expect(result.current.loaded).toBe(true));
  await act(async () => {
    await result.current.saveShelf({
      tools: ['liturgy'],
      groups: [{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }],
    });
  });
  expect(lastSavedPayload().tools).toEqual(['liturgy']);
  expect(lastSavedPayload().groups[0].tools).toEqual([]);
});

it('pinTool lands the new tool loose, above every group', async () => {
  const { result } = renderMyTools({
    nav_item_order: {
      v: 5, tools: ['calendar'], widgets: [], setupComplete: true,
      groups: [{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }],
    },
  });
  await waitFor(() => expect(result.current.loaded).toBe(true));
  await act(async () => { await result.current.pinTool('studio'); });
  expect(lastSavedPayload().tools).toEqual(['calendar', 'studio']);
  expect(lastSavedPayload().groups[0].tools).toEqual(['liturgy']);
});

it('refuses to pin a key that already lives inside a group', async () => {
  const { result } = renderMyTools({
    nav_item_order: {
      v: 5, tools: [], widgets: [], setupComplete: true,
      groups: [{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }],
    },
  });
  await waitFor(() => expect(result.current.loaded).toBe(true));
  let ok = false;
  await act(async () => { ok = await result.current.pinTool('liturgy'); });
  expect(ok).toBe(true);
  expect(savedPayloadCount()).toBe(0);
});
```

If `renderMyTools`, `lastSavedPayload`, or `savedPayloadCount` do not already exist in that test file, add them as local helpers wrapping the existing Supabase mock — read the file's current setup block and follow its pattern rather than inventing a second mocking style.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/hooks/useMyTools.test.tsx`
Expected: FAIL — `saveShelf` is not a function; saved payloads carry `v: 4` and no `groups`.

- [ ] **Step 3: Carry groups through `saveMyTools`**

In `src/hooks/useMyTools.ts`, change the import to add `sanitizeShelf` and the types, then replace the patch type and the `next` construction inside `saveMyTools`:

```ts
  const saveMyTools = useCallback(async (patch: {
    tools?: string[]; groups?: ToolGroup[]; widgets?: string[]; setupComplete?: boolean;
  }): Promise<boolean> => {
    if (!uid) return false;
    const base = readLoadedRecord() ?? myTools;
    // sanitizeShelf, not two independent sanitizeTools calls: the
    // one-key-one-place invariant spans loose AND groups, so both lists have
    // to be cleaned in ONE pass that shares its `seen` set and its
    // MY_TOOLS_SANITY_MAX budget. Cleaning them separately would happily
    // store the same key loose and in a group, and the keycap grid would
    // render that tile twice.
    const shelf = sanitizeShelf(
      patch.tools !== undefined ? patch.tools : (base?.tools ?? []),
      patch.groups !== undefined ? patch.groups : (base?.groups ?? []),
    );
    const next: MyTools = {
      v: 5,
      tools: shelf.tools,
      groups: shelf.groups,
      widgets: patch.widgets !== undefined
        ? patch.widgets.slice(0, WIDGETS_CAP)
        : (base?.widgets ?? []),
      setupComplete: patch.setupComplete ?? true,
    };
```

The rest of the function (optimistic `setQueryData`, the RPC call, rollback) is unchanged — it already writes `next` into the raw-row shape.

- [ ] **Step 4: Add `saveShelf` and make `pinTool` group-aware**

Below `saveTools`:

```ts
  /** One-call save for the editor, which always edits both lists together. */
  const saveShelf = useCallback(
    (shelf: Shelf) => saveMyTools({ tools: shelf.tools, groups: shelf.groups }),
    [saveMyTools],
  );
```

In `pinTool`, replace the already-present check so it spans groups. A pin lands **loose**, above every group — the All Tools sheet and ⌘K have no idea which group the member meant, and asking would turn a one-tap action into two:

```ts
    // flattenShelf, not record.tools — a key already filed INSIDE a group is
    // still on the shelf, and appending it to loose would violate
    // one-key-one-place and render the tool twice. Resolve first for the
    // same reason the flat check does: a stored merged key ('merch') must
    // match an incoming resolved one ('shop').
    if (resolveKeys(flattenShelf(record)).includes(resolved)) return true;
    return saveMyTools({ tools: [...record.tools, resolved] });
```

Export `saveShelf` from the hook's return object.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/hooks/useMyTools.test.tsx`
Expected: PASS.

- [ ] **Step 6: Full suite + type gate**

Run: `npm run test && npm run typecheck:guard`
Expected: PASS. `HouseHome`, `MyWorldPage`, `DashboardShell` may fail to typecheck where they construct a `MyTools` literal — add `groups: []` at those sites.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useMyTools.ts src/hooks/useMyTools.test.tsx
git commit -m "feat(nav): persist groups through saveMyTools

Both lists are cleaned in ONE sanitizeShelf pass so the one-key-one-place
invariant, which spans loose and groups, actually holds — two independent
sanitize calls would store a key in both and the grid would render it twice.

pinTool checks the FLATTENED shelf, so pinning a tool already filed in a
group is a no-op rather than a duplicate, and new pins land loose: All
Tools cannot know which group the member meant."
```

---

### Task 4: The shelf renders groups

**Files:**
- Modify: `src/components/dashboard/NavShelf.tsx` (whole component + header comment), `src/components/dashboard/DashboardShell.tsx:327-329`, `:419-421`, `:459-461`, `:477-479`
- Test: `src/components/dashboard/NavShelf.test.tsx` (existing — add a describe block)

**Interfaces:**
- Consumes: `selectShelfEntries` (existing), `ToolGroup` (Task 1).
- Produces: `NavShelfProps` gains
  - `groups: Array<{ id: string; name: string; entries: CatalogEntry[]; collapsed: boolean }>`
  - `onToggleGroup: (id: string, collapsed: boolean) => void`

`DashboardShell` builds that array by running each group's keys through `selectShelfEntries` against the same `resolvedEntries` it already uses, then **dropping groups whose `entries` came back empty** — that one filter implements "empty groups never reach a live surface" for both the never-filled group and the fully-gated one.

- [ ] **Step 1: Write the failing tests**

Add to `src/components/dashboard/NavShelf.test.tsx`:

```tsx
const groupOf = (name: string, entries: CatalogEntry[], collapsed = false) =>
  ({ id: name.toLowerCase(), name, entries, collapsed });

describe('NavShelf — groups', () => {
  it('renders loose tools above every group header', () => {
    renderShelf({
      tools: [entry('calendar'), entry('messages')],
      groups: [groupOf('Sunday', [entry('liturgy')])],
    });
    const rows = screen.getByTestId('nav-shelf-tools').textContent ?? '';
    expect(rows.indexOf('Calendar')).toBeLessThan(rows.indexOf('Sunday'));
  });

  it('renders a group header and its members when expanded', () => {
    renderShelf({ tools: [], groups: [groupOf('Sunday', [entry('liturgy')])] });
    expect(screen.getByText('Sunday')).toBeInTheDocument();
    expect(screen.getByText('Liturgy Planner')).toBeInTheDocument();
  });

  it('hides members and shows a count when collapsed', () => {
    renderShelf({ tools: [], groups: [groupOf('Sunday', [entry('liturgy')], true)] });
    expect(screen.getByText('Sunday')).toBeInTheDocument();
    expect(screen.queryByText('Liturgy Planner')).not.toBeInTheDocument();
    expect(screen.getByTestId('nav-group-count-sunday')).toHaveTextContent('1');
  });

  it('shows no count when expanded — the rows speak for themselves', () => {
    renderShelf({ tools: [], groups: [groupOf('Sunday', [entry('liturgy')])] });
    expect(screen.queryByTestId('nav-group-count-sunday')).not.toBeInTheDocument();
  });

  it('reports a collapse toggle to its caller', () => {
    const onToggleGroup = vi.fn();
    renderShelf({ tools: [], groups: [groupOf('Sunday', [entry('liturgy')])], onToggleGroup });
    fireEvent.click(screen.getByRole('button', { name: /Sunday/ }));
    expect(onToggleGroup).toHaveBeenCalledWith('sunday', true);
  });

  it('renders exactly the flat shelf when there are no groups', () => {
    renderShelf({ tools: [entry('calendar')], groups: [] });
    expect(screen.queryByTestId(/nav-group-/)).not.toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
  });
});
```

Follow the existing `renderShelf`/`entry` helpers in that file; extend `renderShelf` to accept and forward `groups`/`onToggleGroup` with sane defaults (`groups: []`, `onToggleGroup: vi.fn()`).

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/dashboard/NavShelf.test.tsx`
Expected: FAIL — group headers do not render.

- [ ] **Step 3: Rewrite the `NavShelf` header comment**

The current comment states "No sections on the shelf, no accordions." Replace that paragraph with:

```
// The shelf now has member-named GROUPS. This is not the accordion sidebar
// the recut deleted: that one held all 52 destinations under 10 pre-made
// section headers, and this one holds only what this member pinned, under
// headers they wrote themselves. Ten pre-made sections is an inventory; a
// few member-made groups is a filing system. Keep that distinction — do not
// seed groups from NAV_SECTION_LABELS, and do not offer unpinned tools here.
// All Tools and Cmd-K are how a member reaches everything else.
//
// Arranging still happens on /dashboard/my-world, not by gesture on the live
// nav. The one exception is collapse, which is a reading action, not an
// arranging one, and persists so a member's chosen reading state survives.
```

- [ ] **Step 4: Implement group rendering**

Extend the props interface and add a header component, then render groups after the loose rows:

```tsx
export interface NavShelfGroup {
  id: string;
  name: string;
  entries: CatalogEntry[];
  collapsed: boolean;
}

// …added to NavShelfProps:
  groups: NavShelfGroup[];
  onToggleGroup: (id: string, collapsed: boolean) => void;
```

Inside the component, after the existing loose-row block and before the divider:

```tsx
      {groups.map((group) => (
        <div key={group.id} data-testid={`nav-group-${group.id}`} className="space-y-0.5">
          <button
            type="button"
            onClick={() => onToggleGroup(group.id, !group.collapsed)}
            aria-expanded={!group.collapsed}
            className={`${ROW_BASE} ${variant === 'desktop' ? ROW_DESKTOP : ROW_MOBILE} ${ROW_INACTIVE} text-muted-foreground`}
          >
            <ChevronRight
              className={`w-4 h-4 shrink-0 transition-transform motion-reduce:transition-none ${group.collapsed ? '' : 'rotate-90'}`}
              aria-hidden
            />
            <span className="truncate flex-1 text-left">{group.name}</span>
            {/* Count only while collapsed: expanded, the rows below say the
                same thing, and a permanent badge reads as a quota. */}
            {group.collapsed && (
              <span data-testid={`nav-group-count-${group.id}`} className="text-xs tabular-nums opacity-70">
                {group.entries.length}
              </span>
            )}
          </button>
          {!group.collapsed && (
            <div className="space-y-0.5 pl-3">
              {group.entries.map((entry) => (
                <Row key={entry.key} entry={entry} variant={variant} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </div>
      ))}
```

Import `ChevronRight` from `lucide-react` alongside the existing `LayoutGrid, Settings`.

- [ ] **Step 5: Wire `DashboardShell`**

At both shelf derivations (`:327-329` and `:459-461`), add below the existing `shelfTools`:

```tsx
  // Empty groups never reach a live surface. This single filter covers both
  // the group a member made but hasn't filled and the group whose every tool
  // is gated off for this viewer — a header over zero rows is noise in the
  // sidebar and worse over a keycap band. The editor still shows them, which
  // is where a member fills or deletes one.
  const shelfGroups = (myTools?.groups ?? [])
    .map((g) => ({
      id: g.id,
      name: g.name,
      entries: selectShelfEntries(resolvedEntries, g.tools),
      collapsed: g.collapsed,
    }))
    .filter((g) => g.entries.length > 0);

  const handleToggleGroup = useCallback((id: string, collapsed: boolean) => {
    // Gated on `loaded`, like every other write: saveMyTools fills omitted
    // fields from the current record, so a toggle fired before the record
    // arrives would persist an empty shelf over the member's real one.
    if (!toolsLoaded || !myTools) return;
    void saveMyTools({ groups: setGroupCollapsed(myTools, id, collapsed).groups });
  }, [toolsLoaded, myTools, saveMyTools]);
```

Pass `groups={shelfGroups}` and `onToggleGroup={handleToggleGroup}` at both `<NavShelf>` call sites (`:419-421`, `:477-479`). Pull `loaded: toolsLoaded` and `saveMyTools` from the existing `useMyTools(...)` call in each component, and import `setGroupCollapsed` from `@/lib/navigation/toolGroups`.

While the role is still resolving, `shelfGroups` must be `[]` — the `ROLE_INVARIANT_CORE_TOOLS` fallback branch has no groups by construction, so guard the mapping with the same `(roleLoading && !knownGood)` condition already used for `shelfTools`.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/components/dashboard/NavShelf.test.tsx src/components/dashboard/DashboardShell.test.tsx`
Expected: PASS.

- [ ] **Step 7: Full suite + type gate, then commit**

```bash
npm run test && npm run typecheck:guard
git add src/components/dashboard/NavShelf.tsx src/components/dashboard/NavShelf.test.tsx src/components/dashboard/DashboardShell.tsx
git commit -m "feat(nav): shelf renders member-named groups

Loose tools stay above every header, so a member with no groups sees the
shelf they saw yesterday. Collapse persists — it is a reading action, not
an arranging one.

Empty groups are filtered at the shell in one place, covering both the
never-filled group and the one whose every tool is gated off."
```

---

### Task 5: Group header row in the editor

**Files:**
- Create: `src/components/dashboard/MyWorldGroupRow.tsx`
- Test: `src/components/dashboard/MyWorldGroups.test.tsx`

**Interfaces:**
- Consumes: `ToolGroup` (Task 1).
- Produces:

```tsx
export interface MyWorldGroupRowProps {
  group: ToolGroup;
  count: number;
  disabled?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onRename: (id: string, name: string) => void;
  onToggle: (id: string, collapsed: boolean) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onDelete: (id: string) => void;
}
export function MyWorldGroupRow(props: MyWorldGroupRowProps): JSX.Element
```

- [ ] **Step 1: Write the failing tests**

Create `src/components/dashboard/MyWorldGroups.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyWorldGroupRow } from './MyWorldGroupRow';
import type { ToolGroup } from '@/lib/navigation/myTools';

const group: ToolGroup = { id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false };

const renderRow = (over: Partial<React.ComponentProps<typeof MyWorldGroupRow>> = {}) => {
  const props = {
    group, count: 1, isFirst: true, isLast: false,
    onRename: vi.fn(), onToggle: vi.fn(), onMove: vi.fn(), onDelete: vi.fn(),
    ...over,
  };
  render(<MyWorldGroupRow {...props} />);
  return props;
};

// Radix DropdownMenu triggers activate on mouseDown, NOT click. fireEvent.click
// on the trigger passes vacuously and asserts nothing — that mistake has
// already silently killed 3+ tests on this feature.
const openMenu = (name: RegExp) =>
  fireEvent.mouseDown(screen.getByRole('button', { name }));

describe('MyWorldGroupRow', () => {
  it('shows the group name and its count', () => {
    renderRow();
    expect(screen.getByText('Sunday')).toBeInTheDocument();
    expect(screen.getByTestId('my-world-group-count-a')).toHaveTextContent('1');
  });

  it('toggles collapse', () => {
    const props = renderRow();
    fireEvent.click(screen.getByRole('button', { name: /Collapse Sunday/ }));
    expect(props.onToggle).toHaveBeenCalledWith('a', true);
  });

  it('renames through an inline field committed on Enter', async () => {
    const props = renderRow();
    openMenu(/Options for Sunday/);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    const input = screen.getByLabelText('Group name');
    fireEvent.change(input, { target: { value: 'Liturgy' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onRename).toHaveBeenCalledWith('a', 'Liturgy');
  });

  it('abandons a rename on Escape', async () => {
    const props = renderRow();
    openMenu(/Options for Sunday/);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    fireEvent.keyDown(screen.getByLabelText('Group name'), { key: 'Escape' });
    expect(props.onRename).not.toHaveBeenCalled();
  });

  it('does not offer Move up on the first group', async () => {
    renderRow({ isFirst: true });
    openMenu(/Options for Sunday/);
    expect(await screen.findByRole('menuitem', { name: 'Move down' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Move up' })).not.toBeInTheDocument();
  });

  it('warns that delete keeps the tools', async () => {
    const props = renderRow();
    openMenu(/Options for Sunday/);
    fireEvent.click(await screen.findByRole('menuitem', { name: /Delete group/ }));
    expect(props.onDelete).toHaveBeenCalledWith('a');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/dashboard/MyWorldGroups.test.tsx`
Expected: FAIL — cannot resolve `./MyWorldGroupRow`.

- [ ] **Step 3: Implement the component**

Create `src/components/dashboard/MyWorldGroupRow.tsx`:

```tsx
// One group header inside MyWorldEditor's "In Your World" card: a collapse
// caret, the member's name for the group, a count, and an options menu.
//
// Extracted rather than inlined because MyWorldEditor is already 300 lines
// and the group UI would push it past 550 — past the point where the whole
// file fits in one reading.
// Spec: docs/superpowers/specs/2026-08-10-my-world-groups-design.md §5.4
import { useEffect, useRef, useState } from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GROUP_NAME_MAX, type ToolGroup } from '@/lib/navigation/myTools';

export interface MyWorldGroupRowProps {
  group: ToolGroup;
  /** Rendered tool count — may differ from group.tools.length when a tool is gated off. */
  count: number;
  disabled?: boolean;
  isFirst: boolean;
  isLast: boolean;
  onRename: (id: string, name: string) => void;
  onToggle: (id: string, collapsed: boolean) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onDelete: (id: string) => void;
}

const TAP_TARGET = 'shrink-0 p-2.5 -m-2.5 flex items-center justify-center disabled:opacity-40';

export function MyWorldGroupRow({
  group, count, disabled, isFirst, isLast, onRename, onToggle, onMove, onDelete,
}: MyWorldGroupRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const name = draft.trim();
    // An empty name is abandoned, not saved: a headerless group is
    // unreachable in the editor and invisible on the shelf.
    if (name) onRename(group.id, name);
    setEditing(false);
  };

  const abandon = () => {
    setDraft(group.name);
    setEditing(false);
  };

  return (
    <li className="flex items-center gap-2 min-h-11 px-4 bg-muted/40" data-testid={`my-world-group-${group.id}`}>
      <button
        type="button"
        onClick={() => onToggle(group.id, !group.collapsed)}
        aria-label={`${group.collapsed ? 'Expand' : 'Collapse'} ${group.name}`}
        aria-expanded={!group.collapsed}
        className={TAP_TARGET}
      >
        <ChevronRight
          className={`w-4 h-4 transition-transform motion-reduce:transition-none ${group.collapsed ? '' : 'rotate-90'}`}
          aria-hidden
        />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          aria-label="Group name"
          value={draft}
          maxLength={GROUP_NAME_MAX}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') abandon();
          }}
          className="flex-1 min-w-0 bg-transparent text-[15px] font-semibold outline-none border-b border-primary"
        />
      ) : (
        <span className="flex-1 min-w-0 truncate text-[15px] font-semibold">{group.name}</span>
      )}

      <span data-testid={`my-world-group-count-${group.id}`} className="text-[13px] text-muted-foreground tabular-nums">
        {count}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" disabled={disabled} aria-label={`Options for ${group.name}`} className={TAP_TARGET}>
            <MoreHorizontal className="w-4 h-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => { setDraft(group.name); setEditing(true); }}>
            Rename
          </DropdownMenuItem>
          {!isFirst && <DropdownMenuItem onSelect={() => onMove(group.id, -1)}>Move up</DropdownMenuItem>}
          {!isLast && <DropdownMenuItem onSelect={() => onMove(group.id, 1)}>Move down</DropdownMenuItem>}
          {/* The label says what happens to the tools. Deleting a group is a
              reorganization; a member must not fear losing pins to it. */}
          <DropdownMenuItem onSelect={() => onDelete(group.id)}>
            Delete group (keeps tools)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/dashboard/MyWorldGroups.test.tsx`
Expected: PASS, all 6.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/MyWorldGroupRow.tsx src/components/dashboard/MyWorldGroups.test.tsx
git commit -m "feat(nav): group header row for the My World editor

Rename is an inline field committed on Enter and abandoned on Escape; an
empty name is abandoned rather than saved, since a headerless group is
unreachable in the editor and invisible on the shelf.

The delete item reads 'Delete group (keeps tools)' — the label carries the
guarantee, so a member never has to risk a pin to find out."
```

---

### Task 6: "Move to…" menu on every tool row

**Files:**
- Create: `src/components/dashboard/ToolRowMenu.tsx`
- Modify: `src/components/dashboard/MyWorldEditor.tsx:59-115` (`ChosenRow`)
- Test: `src/components/dashboard/MyWorldGroups.test.tsx` (append)

**Interfaces:**
- Consumes: `ToolGroup` (Task 1).
- Produces:

```tsx
export interface ToolRowMenuProps {
  toolLabel: string;
  currentGroupId: string | null;
  groups: ToolGroup[];
  disabled?: boolean;
  onMoveTo: (targetGroupId: string | null) => void;
  onNewGroup: () => void;
}
export function ToolRowMenu(props: ToolRowMenuProps): JSX.Element
```

`ChosenRow` gains an optional `menu?: React.ReactNode` prop rendered before the drag handle, so the editor composes the menu in without `ChosenRow` learning about groups.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/dashboard/MyWorldGroups.test.tsx`:

```tsx
import { ToolRowMenu } from './ToolRowMenu';

const groups: ToolGroup[] = [
  { id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false },
  { id: 'b', name: 'Teaching', tools: [], collapsed: false },
];

describe('ToolRowMenu', () => {
  it('offers every group except the one the tool is already in', async () => {
    render(<ToolRowMenu toolLabel="Liturgy Planner" currentGroupId="a" groups={groups}
      onMoveTo={vi.fn()} onNewGroup={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /Move Liturgy Planner/ }));
    expect(await screen.findByRole('menuitem', { name: 'Teaching' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Sunday' })).not.toBeInTheDocument();
  });

  it('offers "Move out of group" only for a grouped tool', async () => {
    render(<ToolRowMenu toolLabel="Liturgy Planner" currentGroupId="a" groups={groups}
      onMoveTo={vi.fn()} onNewGroup={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /Move Liturgy Planner/ }));
    expect(await screen.findByRole('menuitem', { name: 'Move out of group' })).toBeInTheDocument();
  });

  it('omits "Move out of group" for a loose tool', async () => {
    render(<ToolRowMenu toolLabel="Calendar" currentGroupId={null} groups={groups}
      onMoveTo={vi.fn()} onNewGroup={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /Move Calendar/ }));
    expect(await screen.findByRole('menuitem', { name: 'Sunday' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Move out of group' })).not.toBeInTheDocument();
  });

  it('reports the chosen target', async () => {
    const onMoveTo = vi.fn();
    render(<ToolRowMenu toolLabel="Calendar" currentGroupId={null} groups={groups}
      onMoveTo={onMoveTo} onNewGroup={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /Move Calendar/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Sunday' }));
    expect(onMoveTo).toHaveBeenCalledWith('a');
  });

  it('reports "move out" as a null target', async () => {
    const onMoveTo = vi.fn();
    render(<ToolRowMenu toolLabel="Liturgy Planner" currentGroupId="a" groups={groups}
      onMoveTo={onMoveTo} onNewGroup={vi.fn()} />);
    fireEvent.mouseDown(screen.getByRole('button', { name: /Move Liturgy Planner/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Move out of group' }));
    expect(onMoveTo).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/dashboard/MyWorldGroups.test.tsx`
Expected: FAIL — cannot resolve `./ToolRowMenu`.

- [ ] **Step 3: Implement `ToolRowMenu`**

Create `src/components/dashboard/ToolRowMenu.tsx`:

```tsx
// The per-tool "Move to…" menu in MyWorldEditor.
//
// This exists so that NO group change depends on a drag. GleeWorld is used
// heavily on iPad and iOS, where drag-between-containers is the least
// reliable gesture available — if dragging were the only way to file a tool,
// a member who cannot complete the drag simply could not group. It is also
// the only path that works with a keyboard or VoiceOver. Drag still works
// for anyone who prefers it; it is just not load-bearing.
// Spec: docs/superpowers/specs/2026-08-10-my-world-groups-design.md §5.4
import { FolderInput } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ToolGroup } from '@/lib/navigation/myTools';

export interface ToolRowMenuProps {
  toolLabel: string;
  /** null when the tool is loose. */
  currentGroupId: string | null;
  groups: ToolGroup[];
  disabled?: boolean;
  onMoveTo: (targetGroupId: string | null) => void;
  onNewGroup: () => void;
}

// p-3.5, NOT the p-2.5 used in MyWorldEditor. That constant pads a 24px
// BADGE (w-6 h-6) to 24+10+10 = 44px. This row's control is a bare 16px
// icon (w-4 h-4), so the same padding would yield only 36px and miss the
// 44px minimum target. 16+14+14 = 44. The negative margin still pulls the
// padding back, so the hit area grows without moving a pixel of layout.
const TAP_TARGET = 'shrink-0 p-3.5 -m-3.5 flex items-center justify-center disabled:opacity-40';

export function ToolRowMenu({
  toolLabel, currentGroupId, groups, disabled, onMoveTo, onNewGroup,
}: ToolRowMenuProps) {
  const targets = groups.filter((g) => g.id !== currentGroupId);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" disabled={disabled} aria-label={`Move ${toolLabel}`} className={TAP_TARGET}>
          <FolderInput className="w-4 h-4 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {targets.map((g) => (
          <DropdownMenuItem key={g.id} onSelect={() => onMoveTo(g.id)}>
            {g.name}
          </DropdownMenuItem>
        ))}
        {currentGroupId !== null && (
          <DropdownMenuItem onSelect={() => onMoveTo(null)}>Move out of group</DropdownMenuItem>
        )}
        {(targets.length > 0 || currentGroupId !== null) && <DropdownMenuSeparator />}
        <DropdownMenuItem onSelect={onNewGroup}>New group…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 4: Let `ChosenRow` accept a menu slot**

In `MyWorldEditor.tsx`, add `menu?: React.ReactNode` to `ChosenRow`'s props and render it immediately before the drag-handle button:

```tsx
      {menu}
      {entry && (
        <button
          type="button"
          {...attributes}
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/components/dashboard/MyWorldGroups.test.tsx`
Expected: PASS, all 11.

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/ToolRowMenu.tsx src/components/dashboard/MyWorldEditor.tsx src/components/dashboard/MyWorldGroups.test.tsx
git commit -m "feat(nav): per-tool Move to... menu

No group change depends on a drag. Drag-between-containers is the least
reliable gesture on the iPads this app actually runs on, and it is
unreachable by keyboard and VoiceOver — so the menu is the primary path
and drag is the convenience."
```

---

### Task 7: Groups in the editor — headers, New Group, cross-group drag

**Files:**
- Modify: `src/components/dashboard/MyWorldEditor.tsx` (props, `chosenRows`, `handleDragEnd`, render), `src/pages/dashboard/MyWorldPage.tsx:93-140`, `:231-234`, `:269-272`
- Test: `src/components/dashboard/MyWorldGroups.test.tsx` (append an editor-level block)

**Interfaces:**
- Consumes: everything from Tasks 1, 2, 5, 6.
- Produces: `MyWorldEditorProps` gains **optional** `groups?: ToolGroup[]` and `onGroupsChange?: (next: ToolGroup[]) => void`. When `onGroupsChange` is omitted the editor renders **no group UI at all** — no headers, no `New Group` row, no `ToolRowMenu` — exactly as omitting `widgetOptions` suppresses the widgets section today. That is how the admin defaults tab stays flat in Phase 1 without a dead control. `MyWorldEditor` stays presentation-only: it computes the next `Shelf` with the Task 2 helpers and hands both lists up; it never saves.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/dashboard/MyWorldGroups.test.tsx`:

```tsx
import { MyWorldEditor } from './MyWorldEditor';
import { NAV_CATALOG } from '@/lib/navigation/navCatalog';

const available = NAV_CATALOG.filter((e) =>
  ['calendar', 'messages', 'liturgy', 'academy', 'studio'].includes(e.key));

const renderEditor = (over = {}) => {
  const props = {
    available,
    tools: ['calendar', 'messages'],
    groups: [{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }] as ToolGroup[],
    onToolsChange: vi.fn(),
    onGroupsChange: vi.fn(),
    ...over,
  };
  render(<MyWorldEditor {...props} />);
  return props;
};

describe('MyWorldEditor — groups', () => {
  it('renders loose rows, then the group header, then its members', () => {
    renderEditor();
    const text = screen.getByTestId('my-world-chosen').textContent ?? '';
    expect(text.indexOf('Calendar')).toBeLessThan(text.indexOf('Sunday'));
    expect(text.indexOf('Sunday')).toBeLessThan(text.indexOf('Liturgy Planner'));
  });

  it('shows an EMPTY group in the editor — unlike the shelf', () => {
    renderEditor({ groups: [{ id: 'z', name: 'Later', tools: [], collapsed: false }] });
    expect(screen.getByTestId('my-world-group-z')).toBeInTheDocument();
  });

  it('creates a group from the New Group row', () => {
    const props = renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'New Group' }));
    expect(props.onGroupsChange).toHaveBeenCalled();
    const next = props.onGroupsChange.mock.calls.at(-1)![0];
    expect(next).toHaveLength(2);
    expect(next.at(-1).tools).toEqual([]);
    expect(next.at(-1).id).toEqual(expect.any(String));
  });

  it('counts every chosen tool, loose and grouped', () => {
    renderEditor();
    expect(screen.getByTestId('my-world-count')).toHaveTextContent('3 tools');
  });

  it('moving a tool into a group updates BOTH lists in one interaction', () => {
    const props = renderEditor();
    fireEvent.mouseDown(screen.getByRole('button', { name: /Move Calendar/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sunday' }));
    expect(props.onToolsChange).toHaveBeenCalledWith(['messages']);
    expect(props.onGroupsChange.mock.calls.at(-1)![0][0].tools).toEqual(['liturgy', 'calendar']);
  });

  it('deleting a group rehomes its tools to loose', () => {
    const props = renderEditor();
    fireEvent.mouseDown(screen.getByRole('button', { name: /Options for Sunday/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Delete group/ }));
    expect(props.onToolsChange).toHaveBeenCalledWith(['calendar', 'messages', 'liturgy']);
    expect(props.onGroupsChange.mock.calls.at(-1)![0]).toEqual([]);
  });

  it('a tool added from More Tools lands loose', () => {
    const props = renderEditor();
    fireEvent.click(screen.getByRole('button', { name: 'Add Studio' }));
    expect(props.onToolsChange).toHaveBeenCalledWith(['calendar', 'messages', 'studio']);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/dashboard/MyWorldGroups.test.tsx`
Expected: FAIL — `MyWorldEditor` does not accept `groups`.

- [ ] **Step 3: Extend the editor's props and derivations**

Add to `MyWorldEditorProps`:

```tsx
  /** The member's groups, in their order. Empty groups ARE rendered here —
   *  the editor is the only surface that shows them, so it is the only place
   *  a member can fill or delete one. */
  groups: ToolGroup[];
  onGroupsChange: (next: ToolGroup[]) => void;
```

Replace `chosenKeys` and add a shelf-shaped view, so `More Tools` excludes grouped keys too:

```tsx
  const shelf = useMemo<Shelf>(() => ({ tools, groups }), [tools, groups]);
  const allChosen = useMemo(() => flattenShelf(shelf), [shelf]);
  const chosenKeys = useMemo(() => new Set(allChosen), [allChosen]);
```

Add one commit helper — every group mutation goes through it, so the two callbacks always fire together and can never drift apart:

```tsx
  // Both lists are handed up on every change. moveTool/deleteGroup can touch
  // loose AND groups in a single operation, so emitting only one callback
  // would let the parent persist half an edit.
  const commit = (next: Shelf) => {
    if (disabled) return;
    onToolsChange(next.tools);
    onGroupsChange(next.groups);
  };
```

Rewrite the row-level handlers in terms of it:

```tsx
  const removeTool = (key: string) => commit({
    tools: shelf.tools.filter((k) => k !== key),
    groups: shelf.groups.map((g) => ({ ...g, tools: g.tools.filter((k) => k !== key) })),
  });

  const addTool = (key: string) => {
    if (disabled || chosenKeys.has(key)) return;
    // New tools land LOOSE, matching where a pin from All Tools lands.
    onToolsChange([...tools, key]);
  };

  const handleNewGroup = () => commit(createGroup(shelf, 'New Group', crypto.randomUUID()));
```

- [ ] **Step 4: Render headers, members, and the New Group row**

Build a single render list so the editor mirrors the shelf: loose rows first, then for each group its `MyWorldGroupRow` followed by its member rows when expanded. Inside the existing `<ul>`:

```tsx
                  {tools.map((key) => (
                    <ChosenRow
                      key={key}
                      entryKey={key}
                      entry={byKey.get(key)}
                      disabled={disabled}
                      onRemove={removeTool}
                      menu={
                        <ToolRowMenu
                          toolLabel={byKey.get(key)?.label ?? key}
                          currentGroupId={null}
                          groups={groups}
                          disabled={disabled}
                          onMoveTo={(target) => commit(moveTool(shelf, key, target))}
                          onNewGroup={handleNewGroup}
                        />
                      }
                    />
                  ))}
                  {groups.map((group, index) => (
                    <Fragment key={group.id}>
                      <MyWorldGroupRow
                        group={group}
                        count={group.tools.length}
                        disabled={disabled}
                        isFirst={index === 0}
                        isLast={index === groups.length - 1}
                        onRename={(id, name) => commit(renameGroup(shelf, id, name))}
                        onToggle={(id, collapsed) => commit(setGroupCollapsed(shelf, id, collapsed))}
                        onMove={(id, delta) => commit(moveGroup(shelf, id, delta))}
                        onDelete={(id) => commit(deleteGroup(shelf, id))}
                      />
                      {!group.collapsed && group.tools.map((key) => (
                        <ChosenRow
                          key={key}
                          entryKey={key}
                          entry={byKey.get(key)}
                          disabled={disabled}
                          onRemove={removeTool}
                          menu={
                            <ToolRowMenu
                              toolLabel={byKey.get(key)?.label ?? key}
                              currentGroupId={group.id}
                              groups={groups}
                              disabled={disabled}
                              onMoveTo={(target) => commit(moveTool(shelf, key, target))}
                              onNewGroup={handleNewGroup}
                            />
                          }
                        />
                      ))}
                    </Fragment>
                  ))}
```

Below the card, add the New Group row:

```tsx
        <button
          type="button"
          onClick={handleNewGroup}
          disabled={disabled}
          className="w-full flex items-center gap-3 min-h-11 px-4 text-left text-primary disabled:opacity-40"
        >
          <Plus className="w-4 h-4" aria-hidden />
          <span className="text-[17px]">New Group</span>
        </button>
```

Update the count to `allChosen.length`, and change the empty-state condition from `chosenRows.length === 0` to `allChosen.length === 0 && groups.length === 0`.

Import `Fragment` from `react`, `MyWorldGroupRow`, `ToolRowMenu`, and the Task 2 helpers.

- [ ] **Step 5: Make drag group-aware**

`SortableContext` now needs every draggable id in render order, and a drop must land the tool in the band it was dropped into:

```tsx
  const sortableIds = useMemo(
    () => [...tools, ...groups.flatMap((g) => (g.collapsed ? [] : g.tools))],
    [tools, groups],
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (disabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    // The band the tool was dropped INTO decides its new group; its index
    // within that band decides its position. Dropping onto a row in another
    // group is therefore a move, not just a reorder — which is what makes
    // drag equivalent to the Move to… menu rather than a weaker sibling.
    const targetGroupId = groupIdOf(shelf, overKey);
    const moved = moveTool(shelf, activeKey, targetGroupId);
    const band = targetGroupId === null
      ? moved.tools
      : moved.groups.find((g) => g.id === targetGroupId)!.tools;
    const from = band.indexOf(activeKey);
    const to = band.indexOf(overKey);
    if (from === -1 || to === -1) return;
    const reordered = arrayMove(band, from, to);
    commit(targetGroupId === null
      ? { ...moved, tools: reordered }
      : { ...moved, groups: moved.groups.map((g) => (g.id === targetGroupId ? { ...g, tools: reordered } : g)) });
  };
```

Pass `items={sortableIds}` to `SortableContext`.

- [ ] **Step 6: Wire `MyWorldPage`**

In `src/pages/dashboard/MyWorldPage.tsx`, take `groups` off the record beside `tools`, add a handler mirroring `handleToolsChange`, and pass both to each `<MyWorldEditor>`:

```tsx
  const groups = useMemo(() => myTools?.groups ?? [], [myTools]);

  const handleGroupsChange = async (next: ToolGroup[]) => {
    // Same gate as handleToolsChange: saveMyTools fills omitted fields from
    // the current record, so an edit committed before the record loads would
    // persist emptiness over the member's real shelf.
    if (!ready) return;
    const ok = await saveMyTools({ groups: next });
    if (!ok) toast.error('Could not save your groups');
  };
```

The admin "Defaults for members" `<MyWorldEditor>` at `:231-234` is **deliberately NOT wired to groups in Phase 1** — its stored shape (`gw_tenant_nav_prefs.default_tools`) cannot hold groups until the Phase 2 migration. Leave that call site's props exactly as they are today and add only a comment:

```tsx
            {/* Tenant defaults stay FLAT in Phase 1: default_tools is still
                text[] and cannot carry groups, so the group props are omitted
                and the editor renders no group UI here at all. Phase 2
                migrates the column and turns this on — see the spec's §6.1
                warning about ADD COLUMN IF NOT EXISTS. */}
            <MyWorldEditor
              available={defaultsAvailable}
              tools={defaultsTools}
              onToolsChange={handleDefaultsChange}
            />
```

This works because the group props are **optional**, following the precedent `widgetOptions` already sets in this file ("Omit the whole widgets group — tenant-defaults mode has no widgets"). Omitting `onGroupsChange` must suppress the entire group UI: no headers, no `New Group` row, and no `ToolRowMenu` on any row. A visible New Group button wired to a no-op would be a dead control, which is worse than no control.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/components/dashboard/MyWorldGroups.test.tsx src/pages/dashboard/MyWorldPage.test.tsx`
Expected: PASS.

- [ ] **Step 8: Full suite + type gate, then commit**

```bash
npm run test && npm run typecheck:guard
git add src/components/dashboard/MyWorldEditor.tsx src/components/dashboard/MyWorldGroups.test.tsx src/pages/dashboard/MyWorldPage.tsx
git commit -m "feat(nav): group editing in My World

One commit() helper fires both callbacks on every change: moveTool and
deleteGroup touch loose AND groups in a single operation, so emitting one
callback would let the parent persist half an edit.

Drag is now equivalent to the Move to... menu rather than a weaker sibling
— the band a tool is dropped into decides its group, the index decides its
position. Empty groups render here and only here."
```

---

### Task 8: Grouped keycap bands on the home grid

**Files:**
- Modify: `src/lib/navigation/appDestinations.ts` (add `bandDestinations`), `src/components/dashboard/HomeTileGrid.tsx:25-29` + its primary renderer, `src/pages/dashboard/HouseHome.tsx:206-240`
- Test: `src/lib/navigation/appDestinations.test.ts`, `src/components/dashboard/HomeTileGrid.uncapped.test.tsx`

**Interfaces:**
- Consumes: `Shelf`, `ToolGroup` (Task 1); `flattenShelf` (Task 2); existing `getAppTiles`.
- Produces:
  - `interface TileBand { groupId: string | null; name: string | null; tiles: Destination[] }`
  - `bandDestinations(primary: Destination[], groups: ToolGroup[]): TileBand[]`
  - `HomeTileGridProps` swaps `primary: Destination[]` for `bands: TileBand[]`.

`getAppTiles` is left alone. `HouseHome` passes `flattenShelf(shelf)` as its `tools` argument, so `primary` comes back already in loose-then-groups order, and `bandDestinations` only has to partition it.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/navigation/appDestinations.test.ts`:

```ts
import { bandDestinations } from './appDestinations';
import type { ToolGroup } from './myTools';

const dest = (key: string) => ({ key, to: `/${key}`, label: key, icon: (() => null) as never });

describe('bandDestinations', () => {
  const groups: ToolGroup[] = [
    { id: 'a', name: 'Sunday', tools: ['liturgy', 'worship-aids'], collapsed: false },
    { id: 'b', name: 'Teaching', tools: ['academy'], collapsed: false },
  ];

  it('puts ungrouped tiles in a leading band with no name', () => {
    const bands = bandDestinations([dest('calendar'), dest('liturgy')], groups);
    expect(bands[0]).toEqual({ groupId: null, name: null, tiles: [dest('calendar')] });
  });

  it('bands grouped tiles under their group name, in group order', () => {
    const bands = bandDestinations(
      [dest('calendar'), dest('liturgy'), dest('worship-aids'), dest('academy')], groups);
    expect(bands.map((b) => b.name)).toEqual([null, 'Sunday', 'Teaching']);
    expect(bands[1].tiles.map((t) => t.key)).toEqual(['liturgy', 'worship-aids']);
  });

  it('drops a band whose every tile is gated off — no heading over nothing', () => {
    const bands = bandDestinations([dest('calendar'), dest('liturgy')], groups);
    expect(bands.map((b) => b.name)).toEqual([null, 'Sunday']);
  });

  it('omits the loose band entirely when nothing is loose', () => {
    const bands = bandDestinations([dest('liturgy')], groups);
    expect(bands.map((b) => b.name)).toEqual(['Sunday']);
  });

  it('returns one unnamed band when there are no groups', () => {
    const bands = bandDestinations([dest('calendar'), dest('messages')], []);
    expect(bands).toHaveLength(1);
    expect(bands[0].groupId).toBeNull();
    expect(bands[0].tiles).toHaveLength(2);
  });

  it('keeps a tile whose key is in no group in the loose band', () => {
    const bands = bandDestinations([dest('studio')], groups);
    expect(bands).toEqual([{ groupId: null, name: null, tiles: [dest('studio')] }]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/navigation/appDestinations.test.ts`
Expected: FAIL — `bandDestinations` is not exported.

- [ ] **Step 3: Implement `bandDestinations`**

Add to `src/lib/navigation/appDestinations.ts`:

```ts
/** A run of keycaps under one heading. `name` is null for the loose band,
 *  which renders with no heading at all. */
export interface TileBand {
  groupId: string | null;
  name: string | null;
  tiles: Destination[];
}

/**
 * Partition already-ordered grid tiles into bands: the loose tiles first
 * under no heading, then one band per group.
 *
 * Empty bands are dropped, which is how "empty groups never reach a live
 * surface" holds on the grid — a group can be empty because the member
 * hasn't filled it or because every tool in it is gated off for this
 * viewer, and a heading over zero tiles is noise either way.
 *
 * Pure partitioning only: `primary` already arrives in loose-then-groups
 * order (HouseHome passes flattenShelf as getAppTiles' `tools`), so this
 * never reorders and never re-gates.
 */
export function bandDestinations(primary: Destination[], groups: ToolGroup[]): TileBand[] {
  const groupOf = new Map<string, ToolGroup>();
  for (const group of groups) {
    for (const key of group.tools) groupOf.set(key, group);
  }
  const loose = primary.filter((tile) => !groupOf.has(tile.key));
  const bands: TileBand[] = [];
  if (loose.length > 0) bands.push({ groupId: null, name: null, tiles: loose });
  for (const group of groups) {
    const tiles = primary.filter((tile) => groupOf.get(tile.key)?.id === group.id);
    if (tiles.length > 0) bands.push({ groupId: group.id, name: group.name, tiles });
  }
  return bands;
}
```

Import `ToolGroup` from `./myTools`.

- [ ] **Step 4: Render bands in `HomeTileGrid`**

Swap the prop and render a heading above each named band:

```tsx
interface HomeTileGridProps {
  bands: TileBand[];
  overflow: Destination[];
  onSave: (order: string[]) => Promise<boolean>;
}
```

Where the component currently maps `primary` into the keycap grid, map bands instead:

```tsx
      {bands.map((band) => (
        <section key={band.groupId ?? '__loose'} className="space-y-2">
          {band.name && (
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {band.name}
            </h3>
          )}
          <div className={GRID_CLASSES}>
            {band.tiles.map((tile) => renderTile(tile))}
          </div>
        </section>
      ))}
```

Reuse the existing per-tile markup for `renderTile` — extract it from the current `primary.map(...)` body verbatim rather than rewriting it, so long-press, edit mode, and tone handling are unchanged.

In edit mode, keep each band its own `SortableContext` so a drag reorders **within** a band. Cross-band moves are the editor's job — a drag that changed a tool's group here would be a second, less discoverable grouping UI competing with the Move to… menu.

- [ ] **Step 5: Wire `HouseHome`**

At `:206-240`:

```tsx
  const shelf = useMemo<Shelf>(
    () => ({ tools: myTools?.tools ?? [], groups: myTools?.groups ?? [] }),
    [myTools],
  );

  const { primary, overflow } = modulesLoading || layoutLoading || roleLoading
    ? { primary: [], overflow: [] }
    : getAppTiles(
        isFaculty ? 'faculty' : 'student',
        // flattenShelf, not myTools.tools — the pool must contain every
        // chosen tool, grouped or not, and in the shelf's render order so
        // bandDestinations only has to partition what it is handed.
        flags, nav, myTools ? flattenShelf(shelf) : null, { tabBarVisible },
      );

  const bands = useMemo(() => bandDestinations(primary, shelf.groups), [primary, shelf.groups]);
```

`storedTools` becomes `flattenShelf(shelf)` run through `resolvedTools`' existing merged-key resolution, and `handleSave` must rebuild the shelf rather than saving a flat list:

```tsx
  // mergeGridOrder still owns the lossy-projection problem — every stored key
  // the grid could not represent survives at its stored index. What is NEW is
  // that the merged flat order is then RE-SPLIT into loose + groups by
  // membership, so a grid edit can never flatten a member's filing. Saving
  // the flat draft here is exactly the lossy write that cost this feature a
  // review round the first time; do not simplify this back to saveTools.
  const handleSave = useCallback(
    (draft: string[]) => {
      const merged = mergeGridOrder(storedTools, draft, representable);
      const kept = new Set(merged);
      return saveShelf({
        tools: merged.filter((k) => groupIdOf(shelf, k) === null),
        groups: shelf.groups.map((g) => ({ ...g, tools: g.tools.filter((k) => kept.has(k)) })),
      });
    },
    [saveShelf, storedTools, representable, shelf],
  );
```

Pass `bands={bands}` to `<HomeTileGrid>` in place of `primary`.

- [ ] **Step 6: Add the regression test for the flattening trap**

Append to `src/components/dashboard/HomeTileGrid.uncapped.test.tsx`:

```tsx
it('a grid edit never flattens the member groups', async () => {
  const saveShelf = vi.fn().mockResolvedValue(true);
  renderHouseHome({
    myTools: {
      v: 5, tools: ['calendar'], widgets: [], setupComplete: true,
      groups: [{ id: 'a', name: 'Sunday', tools: ['liturgy'], collapsed: false }],
    },
    saveShelf,
  });
  await removeTileViaEditMode('Calendar');
  const saved = saveShelf.mock.calls.at(-1)![0];
  expect(saved.groups).toHaveLength(1);
  expect(saved.groups[0].tools).toEqual(['liturgy']);
  expect(saved.tools).not.toContain('calendar');
});
```

Follow the existing helpers in that file for `renderHouseHome` and edit-mode interaction; if it drives edit mode through long-press, reuse that same path rather than adding a second one.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run src/lib/navigation/appDestinations.test.ts src/components/dashboard/HomeTileGrid.uncapped.test.tsx src/pages/dashboard/HouseHome.test.tsx`
Expected: PASS.

- [ ] **Step 8: Full suite, type gate, and a real build**

```bash
npm run test && npm run typecheck:guard && npm run build
```

Expected: all pass. The build matters here — `HomeTileGrid` and `HouseHome` are in the main chunk, and a broken import surfaces as a white screen on iPad rather than a test failure.

- [ ] **Step 9: Commit**

```bash
git add src/lib/navigation/appDestinations.ts src/lib/navigation/appDestinations.test.ts src/components/dashboard/HomeTileGrid.tsx src/components/dashboard/HomeTileGrid.uncapped.test.tsx src/pages/dashboard/HouseHome.tsx
git commit -m "feat(nav): grouped keycap bands on the home grid

The grid keeps showing the SAME set as the shelf; it now shows the same
STRUCTURE too. Bands with no tiles are dropped, so an unfilled or
fully-gated group never renders a heading over nothing.

A grid edit re-splits the merged flat order back into loose + groups by
membership. Saving the flat draft is precisely the lossy projection that
cost this feature a review round — mergeGridOrder still guards the keys
the grid cannot represent, and this guards the filing."
```

---

## Self-Review

**Spec coverage.** §4 model → Task 1. §4.2 invariants → Tasks 1, 2, 3. §4.3 bounds → Task 1. §5.1 shelf → Task 4. §5.2 keycaps + no-flatten rule → Task 8. §5.3 empty groups → Tasks 4 (shell filter), 7 (editor shows them), 8 (band drop). §5.4 editor → Tasks 5, 6, 7. §7 error handling → Task 1 (malformed degrade), Task 3 (omitted-field fill), Tasks 4 and 7 (loading gates). §8 acceptance tests 1–9 → mapped across the task tests. §6 tenant seeding and acceptance test 10 → **deliberately out of scope**, deferred to the Phase 2 plan per the spec's own phasing; Task 7 Step 6 pins the admin tab to its current behavior so nothing half-built ships.

**Placeholder scan.** No TBD/TODO, no "add error handling", no "similar to Task N". Every code step carries the actual code. Two steps say "follow the existing helpers in that file" — for `useMyTools.test.tsx`, `NavShelf.test.tsx`, and `HomeTileGrid.uncapped.test.tsx` — because inventing a second Supabase-mocking or long-press style beside the established one would be the wrong instruction; the test bodies themselves are written out in full.

**Type consistency.** `Shelf` is `{tools, groups}` everywhere. `moveTool(shelf, key, targetGroupId)` and `groupIdOf(shelf, key)` keep that argument order in Tasks 2, 7, 8. `TileBand` uses `groupId`/`name`/`tiles` in both the producer and the consumer. `saveShelf(shelf)` is introduced in Task 3 and is the only save used in Tasks 7 and 8. `NavShelfGroup` (shell-facing, holds `entries: CatalogEntry[]`) is deliberately distinct from `ToolGroup` (storage-facing, holds `tools: string[]`) — the shell maps between them in Task 4.

---

## Phase 2 (not in this plan)

Tenant-seeded groups. Blocked on one fact: the live type of `gw_tenant_nav_prefs.default_tools`. The unapplied migration says `ADD COLUMN IF NOT EXISTS default_tools text[]`, so if that column already exists in production, editing the file to `jsonb` silently no-ops and leaves readers expecting a type the database does not have. Verify first, then write that plan.
