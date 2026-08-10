// My Tools — the single ordered set of destinations a member has chosen.
// Renders as rows in the sidebar shelf and as keycaps on the House home,
// replacing the two separate systems it supersedes:
//   user_preferences.nav_item_order  (v1-v3, sidebar order + section moves)
//     — superseded, and NOT migrated from: see migrateToMyTools's comment.
//   user_preferences.home_tile_layout (v1, keycap order)
// Stored back into the nav_item_order column as v4 — no DDL required.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §6
import { parseTileLayout } from './appDestinations';
import type { CatalogEntry } from './navCatalog';
import { MERGED_KEYS, resolveKey, resolveKeys } from './mergedKeys';

// Re-exported for backward compatibility — every existing import site
// (useMyTools.ts, this file's own tests) reads these from here. The
// definitions themselves live in mergedKeys.ts now; see that file's header
// for why (appDestinations.ts needs them too, and importing them from here
// would have made this module and appDestinations.ts a cycle).
export { MERGED_KEYS, resolveKey, resolveKeys };

/**
 * How many tools a member STARTS with — the size of the seeded shelf, not a
 * ceiling. Both role defaults below are exactly this long, and a migrating
 * member's curated keycap grid is seeded from its first this-many keys.
 * Nothing enforces it after seeding: adding a ninth tool is ordinary use.
 */
export const MY_TOOLS_SEED_SIZE = 8;

/**
 * Corruption bound, NOT a product limit. Only `sanitizeTools` applies it, and
 * only so a hand-edited or corrupt `nav_item_order` blob cannot make the shelf
 * render unbounded rows. Matches `parseTileLayout`'s own 64 (appDestinations.ts),
 * which exists for exactly this reason — the whole catalog is well under it, so
 * a member cannot reach it by pinning every tool that exists.
 *
 * WHY THERE IS NO HARD CAP ANYMORE (decided by the product owner, 2026-08-09):
 * an 8-tool ceiling was justified while the shelf was the ONLY way to reach a
 * destination — an overfull shelf meant an unusable nav. All Tools and ⌘K
 * removed that: everything in the catalog is one tap away regardless of what
 * is on the shelf, so exceeding 8 now costs a tap, not access. The other
 * original reason — never truncate an existing tile set during migration — is
 * spent; everyone has migrated. Do NOT reinstate a cap here, in the editor,
 * in the All Tools sheet, in NavShelf, or in HomeTileGrid as a "fix" for a
 * long shelf: length is the member's choice, and the shelf scrolls.
 */
export const MY_TOOLS_SANITY_MAX = 64;

/** House spec §5.1 caps the home at two role widgets. */
export const WIDGETS_CAP = 2;

export interface MyTools {
  v: 4;
  /** ordered catalog keys, member-chosen length. 'home' is implicit and never stored. */
  tools: string[];
  /** chosen role widgets; [] means "use the role default". Filled in Phase 2. */
  widgets: string[];
  /** true once the member has a deliberate layout (or has seen first-run) */
  setupComplete: boolean;
}

// Frozen day-one shelves. Changing either list changes what every new member
// in every tenant sees, so it is a deliberate reviewable diff — the same
// discipline DEFAULT_GRID_ORDER follows in appDestinations.ts.
// 'home' is deliberately absent from both: it is always rendered first.
export const DEFAULT_TOOLS_FACULTY = [
  'calendar', 'messages', 'music-library', 'academy',
  'planner', 'people', 'finance', 'part-tracks',
];
export const DEFAULT_TOOLS_STUDENT = [
  'calendar', 'messages', 'music-library', 'academy',
  'part-tracks', 'sight', 'studio', 'my-fees',
];

/**
 * Keys both role defaults agree on — safe to show before the caller knows
 * which role it's rendering for. Computed, not hand-copied, so it can never
 * drift out of sync with the two lists above as they change. Order follows
 * DEFAULT_TOOLS_FACULTY.
 *
 * Consumer: DashboardShell's Sidebar/MobileNav. `role` is a client-side
 * guess (`useUserRole().profile` starts null and resolves async) that is
 * recomputed on every mount — and DashboardShell mounts fresh on every
 * route change (it's per-route in App.tsx, not a persistent layout), so
 * "wait for role" is not a one-time startup cost, it recurs on every
 * navigation. Rendering this set while role is unresolved AND the member
 * has no confirmed stored record yet (MyTools.setupComplete !== true) means
 * the shelf never fully blanks and never guesses wrong — see the shelfTools
 * derivation in DashboardShell.tsx for the actual gate.
 */
export const ROLE_INVARIANT_CORE_TOOLS = DEFAULT_TOOLS_FACULTY.filter((k) =>
  DEFAULT_TOOLS_STUDENT.includes(k),
);

/**
 * Resolve merges, drop 'home', dedupe keeping first position, and bound the
 * result at MY_TOOLS_SANITY_MAX. That bound is corruption protection only —
 * see its comment. A member's ordinary set is never truncated here.
 */
export function sanitizeTools(keys: string[], map: Record<string, string> = MERGED_KEYS): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of keys) {
    if (typeof raw !== 'string') continue;
    const k = resolveKey(raw, map);
    if (k === 'home' || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= MY_TOOLS_SANITY_MAX) break;
  }
  return out;
}

/** Strict v4 reader. Anything else — including v1-v3 — returns null. */
export function parseMyTools(raw: unknown): MyTools | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 4) return null;
  if (!Array.isArray(o.tools) || !Array.isArray(o.widgets)) return null;
  return {
    v: 4,
    tools: o.tools.filter((k): k is string => typeof k === 'string'),
    widgets: o.widgets.filter((k): k is string => typeof k === 'string'),
    setupComplete: o.setupComplete === true,
  };
}

/**
 * Produce a MyTools record from whatever the member already had, in
 * preference order (spec §6.3):
 *   1. an existing v4 record            → returned untouched
 *   2. home_tile_layout (any v1 blob)   → a curated pick list, kept WHOLE
 *   3. the role default (MY_TOOLS_SEED_SIZE keys), setupComplete: false
 *
 * Case 2 used to be truncated to the first 8. It no longer is: 8 is a
 * starting size, not a ceiling (see MY_TOOLS_SANITY_MAX), and truncating a
 * member's own curated pick list is precisely the silent drop the cap
 * removal exists to end.
 *
 * A legacy v1-v3 `nav_item_order` blob is deliberately NOT a source. It was
 * never a pick list: the old sidebar stored the ENTIRE flat display order of
 * every visible entry (~40 keys), so "first 8" is top-of-catalog order, not
 * preference — a typical school admin migrated to `messages, calendar,
 * notes, concierge, bible, music-library, music, sight`, with no Academy,
 * People, Finance or Concert Planner, and `setupComplete: true` then locked
 * them out of Phase 2's first-run sheet. Falling through to the role default
 * with `setupComplete: false` gives them a sane shelf AND the sheet.
 *
 * A v1 tile layout IS a pick list (the member added/removed keycaps
 * deliberately), including an empty one — `{v:1, order:[]}` means "I cleared
 * my grid", the same deliberate empty set an empty v4 record carries, and is
 * respected rather than overwritten with the role default.
 */
export function migrateToMyTools(
  navOrderRaw: unknown,
  tileLayoutRaw: unknown,
  role: 'student' | 'faculty',
): MyTools {
  const existing = parseMyTools(navOrderRaw);
  if (existing) return existing;

  const tiles = parseTileLayout(tileLayoutRaw);
  if (tiles) {
    return { v: 4, tools: sanitizeTools(tiles.order), widgets: [], setupComplete: true };
  }

  const defaults = role === 'faculty' ? DEFAULT_TOOLS_FACULTY : DEFAULT_TOOLS_STUDENT;
  return { v: 4, tools: sanitizeTools(defaults), widgets: [], setupComplete: false };
}

/**
 * Fold a keycap-grid edit back into the stored My Tools record WITHOUT
 * losing what the grid could not show.
 *
 * The grid is a lossy view of the record: on a phone the tab bar claims
 * Home / Messages / Calendar, so those stored keys never render as keycaps,
 * and a tool whose module was switched off doesn't render either. Writing
 * the grid's draft back verbatim therefore DELETED every unrepresented key —
 * Edit → Done with zero edits permanently shortened the record (the branch's
 * one Critical finding).
 *
 * The merge:
 *   - every stored key the grid could not represent survives, at its stored
 *     index (so re-widening the viewport or re-enabling a module puts the
 *     tool back exactly where it was);
 *   - the slots the grid COULD represent are refilled from `draft`, in the
 *     draft's order — that is the member's reorder/remove;
 *   - draft keys with no slot left (the member added tiles) append at the end.
 *
 * Pure and total: with `stored: []` it returns the draft unchanged, so a
 * member with no record yet simply stores what they see.
 */
export function mergeGridOrder(
  stored: string[],
  draft: string[],
  representable: ReadonlySet<string>,
): string[] {
  const queue = [...draft];
  const out: string[] = [];
  for (const key of stored) {
    if (representable.has(key)) {
      const next = queue.shift();
      if (next !== undefined) out.push(next);
    } else {
      out.push(key);
    }
  }
  out.push(...queue);
  return out;
}

/**
 * Map stored keys onto gated catalog entries, preserving STORED order (not
 * catalog order — that ordering is the whole point of the shelf). A tool
 * whose gate has closed is skipped here but deliberately left in the stored
 * record, so re-enabling the module restores its original position.
 */
export function selectShelfEntries(resolved: CatalogEntry[], tools: string[]): CatalogEntry[] {
  const byKey = new Map(resolved.map((e) => [e.key, e]));
  // resolveKeys (resolve + dedupe), not a bare per-element resolveKey: a
  // record saved before 'merch' merged into 'shop' can legitimately hold
  // BOTH keys (they were separate pinnable entries until 2026-08-09), and
  // without the dedupe step they'd resolve to the same entry and render
  // twice.
  return resolveKeys(tools)
    .map((k) => byKey.get(k))
    .filter((e): e is CatalogEntry => e !== undefined);
}

/**
 * The member's stored tool keys, ready to consume anywhere: resolved
 * through MERGED_KEYS, deduped, capped — `sanitizeTools` made a first-class
 * read helper.
 *
 * Every call site that reads `myTools.tools` should go through this rather
 * than the raw field. `migrateToMyTools` deliberately returns an existing
 * v4 record's `tools` UNTOUCHED (see its own comment — that "untouched" is
 * about not silently truncating or reordering a member's real record, not
 * about skipping key resolution), so a stored key that has since been
 * retired into MERGED_KEYS reaches every consumer of `myTools.tools` raw.
 *
 * `selectShelfEntries` already resolves internally (calling it here first
 * is a harmless no-op redundancy, not a conflict), which is exactly why the
 * bug this fixes was invisible on the sidebar shelf and only showed up on
 * the home keycap grid, the "already pinned" check in the All Tools sheet,
 * and the My World editor's chosen-tools list — three consumers that read
 * `myTools.tools` directly instead of going through selectShelfEntries.
 * Route ALL of them through here so "did I remember to resolve" can't
 * become a per-call-site question again.
 */
export function resolvedTools(myTools: Pick<MyTools, 'tools'> | null | undefined): string[] {
  return sanitizeTools(myTools?.tools ?? []);
}
