// My Tools — the single ordered set of destinations a member has chosen.
// Renders as rows in the sidebar shelf and as keycaps on the House home,
// replacing the two separate systems it supersedes:
//   user_preferences.nav_item_order  (v1-v3, sidebar order + section moves)
//     — superseded, and NOT migrated from: see migrateToMyTools's comment.
//   user_preferences.home_tile_layout (v1, keycap order)
// Stored back into the nav_item_order column as v4 — no DDL required. Groups
// were added as an ADDITIVE FIELD on v4 rather than as a v5; see
// parseMyTools' comment before changing `v`.
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
 * Corruption bound, NOT a product limit. Only `sanitizeTools`/`sanitizeShelf`
 * apply it, and only so a hand-edited or corrupt `nav_item_order` blob cannot
 * make the shelf render unbounded rows. Matches `parseTileLayout`'s own 64
 * (appDestinations.ts), which exists for exactly this reason — the whole
 * catalog is well under it, so a member cannot reach it by pinning every tool
 * that exists. Since `groups` was added, this budget is shared across LOOSE
 * and GROUPED tools combined (sanitizeShelf enforces the combined bound) — it
 * was never a per-list quota, it is corruption protection for the whole shelf.
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

/** House spec §5.1 caps the home at two role widgets. */
export const WIDGETS_CAP = 2;

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
  /**
   * The ONE on-disk schema version this app writes, and a literal on purpose:
   * `groups` was added to v4 as an extra field instead of minting a v5, so
   * there is nothing here for a version discriminator to discriminate. Every
   * record — legacy, grouped, or a stray v5 from this branch's own dev runs —
   * normalizes to 4 in memory. Read parseMyTools' comment before touching it.
   */
  v: 4;
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
 * Reads v4 and v5, always returning a v4-shaped record. Anything else —
 * including v1-v3 — returns null.
 *
 * WHY GROUPS DID NOT BUMP THE VERSION. `groups` is an ADDITIVE FIELD on v4,
 * deliberately, and this is the load-bearing compatibility decision of the
 * whole feature. The reader that ships in every ALREADY-RELEASED bundle is:
 *
 *     if (o.v !== 4) return null;
 *
 * — a hard reject, not a "read what I understand and ignore the rest". Handed
 * a v5 record it returns null, migrateToMyTools falls through to
 * home_tile_layout or the ROLE DEFAULTS with setupComplete: false, and because
 * the row itself fetched fine (`loaded === true`) nothing refuses the next
 * write. The fabricated default shelf is then persisted straight over the
 * member's real one. A version bump therefore costs TOOLS, not filing.
 *
 * That is not hypothetical: capacitor.config.ts sets no `server.url`, so every
 * iOS build ships its own frozen copy of this file in its bundle and runs it
 * against the same user_preferences row the web app writes. Members on an
 * older TestFlight/App Store build cannot be upgraded by a web deploy. Group
 * on the web, open last month's iOS build, shelf gone.
 *
 * Keeping `v: 4` and adding a key makes the compatibility story actually true:
 * an old reader accepts the record, reads `tools` exactly as before, and never
 * looks at `groups`. What it loses is only the FILING — and only if it then
 * saves, since it rewrites the record without a `groups` key and the member's
 * groups are dropped. Losing an edit's worth of organization is recoverable;
 * losing the tools is not. That asymmetry is the entire justification.
 *
 * BEFORE YOU BUMP `v` LATER: audit what the oldest iOS bundle still in the
 * field does with the new version FIRST. It is not enough for the web reader
 * to be forward-compatible — the reader that matters is the one frozen inside
 * a binary you cannot redeploy. A safe bump needs the tolerant reader
 * ("unknown version → read what you can, never null") to have shipped, and
 * been adopted, well before the first record carrying the new version is
 * written.
 *
 * v5 is still accepted on read because this branch's own dev/test runs wrote
 * v5 records before this was corrected; they normalize to 4 and heal on the
 * next save. `parseGroups` runs for BOTH versions — it is defensive, so a
 * genuine legacy v4 record with no `groups` key simply yields [].
 */
export function parseMyTools(raw: unknown): MyTools | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 4 && o.v !== 5) return null;
  if (!Array.isArray(o.tools) || !Array.isArray(o.widgets)) return null;
  return {
    v: 4,
    tools: o.tools.filter((k): k is string => typeof k === 'string'),
    groups: parseGroups(o.groups),
    widgets: o.widgets.filter((k): k is string => typeof k === 'string'),
    setupComplete: o.setupComplete === true,
  };
}

/**
 * Produce a MyTools record from whatever the member already had, in
 * preference order (spec §6.3):
 *   1. an existing v4 or v5 record      → normalized to v4, otherwise untouched
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
    return { v: 4, tools: sanitizeTools(tiles.order), groups: [], widgets: [], setupComplete: true };
  }

  const defaults = role === 'faculty' ? DEFAULT_TOOLS_FACULTY : DEFAULT_TOOLS_STUDENT;
  return { v: 4, tools: sanitizeTools(defaults), groups: [], widgets: [], setupComplete: false };
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
 * What the sidebar shelf shows of the member's ungrouped tools — their
 * FAVORITES, in the Command Center grid's language.
 *
 * Nothing, when they have at least one group. Kevin, 2026-08-20: "i dont
 * need to list favorites in the left nav because its on page cards." The
 * favorites row already sits at the top of the Command Center grid as full
 * keycaps; repeating the same handful of apps as the first rows of the
 * sidebar spends the most valuable nav real estate on a duplicate.
 *
 * The `groups.length === 0` escape hatch is not a stylistic hedge: a member
 * who never made a group keeps EVERY tool ungrouped, so dropping them
 * unconditionally would leave that member a sidebar of Home and All Tools
 * and no way to reach anything they picked. Grouped members lose nothing —
 * their groups still render, and the grid still shows favorites.
 */
export function shelfLooseTools(
  looseEntries: CatalogEntry[],
  groupCount: number,
): CatalogEntry[] {
  return groupCount > 0 ? [] : looseEntries;
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
