// My Tools — the single ordered set of destinations a member has chosen.
// Renders as rows in the sidebar shelf and as keycaps on the House home,
// replacing the two separate systems it supersedes:
//   user_preferences.nav_item_order  (v1-v3, sidebar order + section moves)
//   user_preferences.home_tile_layout (v1, keycap order)
// Stored back into the nav_item_order column as v4 — no DDL required.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §6
import { parseTileLayout } from './appDestinations';
import { parseNavOrder } from './legacyNavOrder';
import type { CatalogEntry } from './navCatalog';

/** Matches the shipped keycap cap, so migration never truncates a member's tiles. */
export const MY_TOOLS_CAP = 8;

export interface MyTools {
  v: 4;
  /** ordered catalog keys, max MY_TOOLS_CAP. 'home' is implicit and never stored. */
  tools: string[];
  /** chosen role widgets; [] means "use the role default". Filled in Phase 2. */
  widgets: string[];
  /** true once the member has a deliberate layout (or has seen first-run) */
  setupComplete: boolean;
}

// Retired catalog keys → their surviving successor. Ships EMPTY: the §4
// catalog recut is Phase 5. The resolver exists from day one so that when
// entries do merge, no stored layout has to be rewritten — resolution
// happens on read. NEVER rename a key; add it here instead.
export const MERGED_KEYS: Record<string, string> = {};

/**
 * Follow `map` until the key is unmapped. Cycle-safe: before following a
 * hop, checks whether the destination has already been visited in this
 * walk; if so, stops and returns the current key rather than re-entering
 * the cycle. A hand-edited or mistakenly circular map degrades to a
 * stale-but-finite answer instead of hanging the render.
 */
export function resolveKey(key: string, map: Record<string, string> = MERGED_KEYS): string {
  const seen = new Set<string>([key]);
  let k = key;
  while (map[k] !== undefined) {
    const next = map[k];
    if (seen.has(next)) return k;
    seen.add(next);
    k = next;
  }
  return k;
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

/** Resolve merges, drop 'home', dedupe keeping first position, cap. */
export function sanitizeTools(keys: string[], map: Record<string, string> = MERGED_KEYS): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of keys) {
    if (typeof raw !== 'string') continue;
    const k = resolveKey(raw, map);
    if (k === 'home' || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= MY_TOOLS_CAP) break;
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
 *   2. home_tile_layout.order           → already a curated <=8 set
 *   3. nav_item_order.order (v1-v3)     → first 8 that survive sanitizing
 *   4. the role default
 * Nobody loses a tool they had placed. setupComplete is true for 2 and 3 so
 * the Phase 2 first-run sheet only greets genuinely new members.
 */
export function migrateToMyTools(
  navOrderRaw: unknown,
  tileLayoutRaw: unknown,
  role: 'student' | 'faculty',
): MyTools {
  const existing = parseMyTools(navOrderRaw);
  if (existing) return existing;

  const tiles = parseTileLayout(tileLayoutRaw);
  if (tiles && tiles.order.length > 0) {
    return { v: 4, tools: sanitizeTools(tiles.order), widgets: [], setupComplete: true };
  }

  const legacy = parseNavOrder(navOrderRaw);
  if (legacy && legacy.order.length > 0) {
    return { v: 4, tools: sanitizeTools(legacy.order), widgets: [], setupComplete: true };
  }

  const defaults = role === 'faculty' ? DEFAULT_TOOLS_FACULTY : DEFAULT_TOOLS_STUDENT;
  return { v: 4, tools: sanitizeTools(defaults), widgets: [], setupComplete: false };
}

/**
 * Map stored keys onto gated catalog entries, preserving STORED order (not
 * catalog order — that ordering is the whole point of the shelf). A tool
 * whose gate has closed is skipped here but deliberately left in the stored
 * record, so re-enabling the module restores its original position.
 */
export function selectShelfEntries(resolved: CatalogEntry[], tools: string[]): CatalogEntry[] {
  const byKey = new Map(resolved.map((e) => [e.key, e]));
  return tools
    .map((k) => byKey.get(resolveKey(k)))
    .filter((e): e is CatalogEntry => e !== undefined);
}
