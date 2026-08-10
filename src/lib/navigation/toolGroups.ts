// Pure operations on a member's Shelf (loose tools + named groups).
//
// Every function returns a NEW Shelf and never mutates its input.
//
// What that does NOT mean: a returned Shelf is not deeply independent of the
// one it came from. These use STRUCTURAL SHARING — createGroup, renameGroup,
// setGroupCollapsed, moveGroup and deleteGroup all carry untouched ToolGroup
// objects, and their nested `tools` arrays, through by reference. Only
// moveTool rebuilds the whole graph, because only it has to strip a key from
// every group. That is safe under this codebase's no-in-place-mutation
// convention and is why these functions are cheap, but do not read "returns a
// new Shelf" as a licence to mutate a returned array — you would be editing
// the previous record too, including the optimistic cache entry.
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
