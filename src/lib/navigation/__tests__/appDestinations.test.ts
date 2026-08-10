import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Music } from 'lucide-react';
import {
  getTabItems, getAppTiles, parseTileLayout, bandDestinations, DEFAULT_GRID_ORDER,
  type ModuleFlags, type Destination,
} from '../appDestinations';
import type { NavContext } from '../navCatalog';
import type { ToolGroup } from '../myTools';

const allOn: ModuleFlags = {
  hasViewer: true, hasStudio: true, hasSightReading: true,
  hasBoxOffice: true, hasConcertPlanner: true, hasMerch: true, hasFinance: true, hasAcademy: true,
  hasStore: true, hasSongwriting: true, hasPlanner: true,
};

const allOff: ModuleFlags = {
  hasViewer: false, hasStudio: false, hasSightReading: false,
  hasBoxOffice: false, hasConcertPlanner: false, hasMerch: false, hasFinance: false, hasAcademy: false,
  hasStore: false, hasSongwriting: false, hasPlanner: false,
};

// Mirrors toModuleFlags's key set so flags and nav agree in tests.
const FLAG_MODULE: Record<keyof ModuleFlags, string> = {
  hasViewer: 'viewer', hasStudio: 'studio',
  hasSightReading: 'sight_reading', hasBoxOffice: 'box_office',
  hasConcertPlanner: 'concert_planner', hasMerch: 'merch', hasStore: 'store',
  hasFinance: 'finance', hasAcademy: 'academy', hasSongwriting: 'songwriting', hasPlanner: 'planner',
};
const navFor = (flags: ModuleFlags, over: Partial<NavContext> = {}): NavContext => ({
  hasModule: (k) => Object.entries(FLAG_MODULE).some(([f, m]) => m === k && flags[f as keyof ModuleFlags]),
  isTenantAdmin: false, isPlatformAdmin: false, canLibrarian: false, isPartner: false,
  hiddenRoutes: new Set(), ...over,
});

// Routes that are always available regardless of module flags (Home,
// Messages, Calendar, and the flagless attendance/roster surface).
const FLAGLESS_CORE_ROUTES = new Set(['/dashboard', '/dashboard/messenger', '/dashboard/calendar', '/attendance', '/dashboard/people']);

// Maps a destination route to the ModuleFlags key that gates it, when the
// route is module-gated (used only by the sweep invariant test below).
const ROUTE_FLAG: Record<string, keyof ModuleFlags> = {
  '/dashboard/viewer': 'hasViewer',
  '/studio': 'hasStudio',
  '/dashboard/reading-music': 'hasSightReading',
  '/dashboard/academy': 'hasAcademy',
};

describe('getTabItems', () => {
  it('student gets Home/Messages/Music/Studio/Calendar', () => {
    expect(getTabItems('student', allOn).map((t) => t.label))
      .toEqual(['Home', 'Messages', 'Music', 'Studio', 'Calendar']);
  });
  it('faculty gets Roster instead of Studio', () => {
    expect(getTabItems('faculty', allOn).map((t) => t.label))
      .toEqual(['Home', 'Messages', 'Roster', 'Music', 'Calendar']);
  });
  it('student without Studio module gets Schedule slot filled, never a dead tab', () => {
    const tabs = getTabItems('student', { ...allOn, hasStudio: false });
    expect(tabs).toHaveLength(5);
    expect(tabs.map((t) => t.label)).not.toContain('Studio');
  });
  it('student without Viewer or Studio never resolves two slots to the same destination', () => {
    const tabs = getTabItems('student', { ...allOn, hasViewer: false, hasStudio: false });
    expect(tabs).toHaveLength(5);
    expect(new Set(tabs.map((t) => t.key)).size).toBe(5);
    expect(new Set(tabs.map((t) => t.to)).size).toBe(5);
  });
  it('student with all module flags false falls back to Attendance only, never a duplicate', () => {
    const tabs = getTabItems('student', allOff);
    expect(tabs.map((t) => t.label)).toEqual(['Home', 'Messages', 'Attendance', 'Calendar']);
    expect(tabs).toHaveLength(4);
    expect(new Set(tabs.map((t) => t.key)).size).toBe(4);
    expect(new Set(tabs.map((t) => t.to)).size).toBe(4);
  });
  it('faculty without Viewer or Academy never shows a dead Academy tab, keeps Roster', () => {
    const tabs = getTabItems('faculty', { ...allOn, hasViewer: false, hasAcademy: false });
    expect(tabs.map((t) => t.to)).not.toContain('/dashboard/academy');
    expect(tabs.map((t) => t.label)).toContain('Roster');
    expect(new Set(tabs.map((t) => t.key)).size).toBe(tabs.length);
    expect(new Set(tabs.map((t) => t.to)).size).toBe(tabs.length);
  });

  it('faculty Roster tab routes to the People hub, not the attendance page', () => {
    const tabs = getTabItems('faculty', allOn);
    const roster = tabs.find((t) => t.label === 'Roster');
    expect(roster?.to).toBe('/dashboard/people');
  });

  it('every hand-picked flag combo yields 3-5 distinct, flag-respecting, correctly-ordered tabs', () => {
    const flagKeys = Object.keys(allOn) as Array<keyof ModuleFlags>;
    const combos: ModuleFlags[] = [
      allOn,
      allOff,
      ...flagKeys.map((key) => ({ ...allOff, [key]: true })),
    ];

    for (const flags of combos) {
      for (const role of ['student', 'faculty'] as const) {
        const tabs = getTabItems(role, flags);

        // 3-5 tabs, always distinct keys and distinct routes.
        expect(tabs.length).toBeGreaterThanOrEqual(3);
        expect(tabs.length).toBeLessThanOrEqual(5);
        expect(new Set(tabs.map((t) => t.key)).size).toBe(tabs.length);
        expect(new Set(tabs.map((t) => t.to)).size).toBe(tabs.length);

        // Fixed positions: Home first, Messages second, Calendar last.
        expect(tabs[0].label).toBe('Home');
        expect(tabs[1].label).toBe('Messages');
        expect(tabs[tabs.length - 1].label).toBe('Calendar');

        // Every tab is either a flagless-core route or gated by a
        // currently-true module flag — never a dead, flag-off route.
        for (const tab of tabs) {
          const gatingFlag = ROUTE_FLAG[tab.to];
          const isLive = FLAGLESS_CORE_ROUTES.has(tab.to) || (gatingFlag !== undefined && flags[gatingFlag]);
          expect(isLive).toBe(true);
        }
      }
    }
  });
});

// Every route currently wired up in src/App.tsx, READ FROM App.tsx rather than
// hand-copied here.
//
// This list used to be maintained by hand, on the theory that it should only
// change when someone deliberately re-verified it. In practice a hand-kept
// mirror of a 378-route file drifts: `/all-state` shipped with a real
// <Route path="/all-state"> and a real grid tile, and the list simply never
// learned about it, so the suite failed for a route that was working fine.
// That is the second time (see the Student Fees note this replaces).
//
// Deriving it is also STRICTLY STRONGER than the copy was. A hand-kept list can
// only catch a tile pointing at a route nobody remembered to add; it can never
// catch a tile pointing at a route that was DELETED from App.tsx, because the
// stale entry keeps the dead tile green forever. Reading the real route table
// catches both directions.
//
// Read as text, not imported: App.tsx is ~3000 lines wired to Auth/Tenant/Query
// providers with import-time side effects, and nothing in this repo imports it
// whole (see src/__tests__/legacyStoreRedirects.test.tsx, which reads it the
// same way and for the same reason).
const APP_SOURCE = readFileSync(join(__dirname, '..', '..', '..', 'App.tsx'), 'utf-8');
const KNOWN_ROUTES = new Set(
  [...APP_SOURCE.matchAll(/path="([^"]+)"/g)]
    .map((m) => m[1])
    // Absolute paths only. The handful of relative ones ("profile", "scores",
    // "scores/new", "*") are children of a parent <Route> and are never a grid
    // destination — tiles always carry a full path.
    .filter((p) => p.startsWith('/')),
);

// A tile's `to` may carry a query string (e.g. '/dashboard/workspace?tab=parents').
// React Router matches on the path alone, so compare on the path alone.
const routeOf = (to: string) => to.split(/[?#]/)[0];

describe('getAppTiles', () => {
  it('never returns more than 8 primary tiles', () => {
    const { primary } = getAppTiles('faculty', allOn, navFor(allOn));
    expect(primary.length).toBeLessThanOrEqual(8);
  });
  it('gates module tiles off when flag is false', () => {
    const { primary, overflow } = getAppTiles('student', { ...allOn, hasBoxOffice: false }, navFor({ ...allOn, hasBoxOffice: false }));
    const labels = [...primary, ...overflow].map((t) => t.label);
    expect(labels).not.toContain('Tickets');
  });
  it('never repeats a tab destination in the grid, even when keys differ but routes match', () => {
    const tabRoutes = new Set(getTabItems('faculty', allOn).map((t) => t.to));
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn));
    const gridRoutes = [...primary, ...overflow].map((t) => t.to);
    for (const route of gridRoutes) {
      expect(tabRoutes.has(route)).toBe(false);
    }
  });

  // The tab sweep test above only walks getTabItems, so a grid-only
  // destination (e.g. Merch) with a stale `to` (like the old, nonexistent
  // '/dashboard/merch') would never be caught. Pin every grid destination's
  // route to routes that actually exist in src/App.tsx.
  it('every grid destination (all flags on, both roles, admin-open nav) routes to a known, existing App.tsx path', () => {
    // hasModule: () => true (not navFor's flag-derived hasModule) so
    // catalog entries gated on modules outside the 10 ModuleFlags keys
    // (liturgy_planner, tour, auditions, pr_hub, feeds, alumni,
    // librarian) actually resolve and get their routes pinned by this
    // sweep, instead of silently never appearing.
    const adminNav: NavContext = {
      hasModule: () => true, isTenantAdmin: true, isPlatformAdmin: true, canLibrarian: true, isPartner: true,
      hiddenRoutes: new Set(),
    };
    for (const role of ['student', 'faculty'] as const) {
      const { primary, overflow } = getAppTiles(role, allOn, adminNav);
      for (const dest of [...primary, ...overflow]) {
        // Name the offender: a bare `expected false to be true` gives no clue
        // which tile is dead, which is most of the cost of this test failing.
        expect(
          KNOWN_ROUTES.has(routeOf(dest.to)),
          `${role} grid tile "${dest.label}" points at ${dest.to}, which has no ` +
            `<Route path="${routeOf(dest.to)}"> in src/App.tsx — the tile is dead.`,
        ).toBe(true);
      }
    }
  });

  it('faculty grid still surfaces an Attendance tile at /attendance now that Roster routes elsewhere', () => {
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn));
    const attendance = [...primary, ...overflow].find((t) => t.label === 'Attendance');
    expect(attendance?.to).toBe('/attendance');
  });
});

describe('parseTileLayout', () => {
  it('accepts a valid v1 layout', () => {
    expect(parseTileLayout({ v: 1, order: ['tickets', 'studio'] }))
      .toEqual({ v: 1, order: ['tickets', 'studio'] });
  });
  it('rejects null, non-objects, wrong version, and non-string entries', () => {
    expect(parseTileLayout(null)).toBeNull();
    expect(parseTileLayout('garbage')).toBeNull();
    expect(parseTileLayout({ v: 2, order: ['tickets'] })).toBeNull();
    expect(parseTileLayout({ v: 1, order: ['tickets', 7] })).toBeNull();
    expect(parseTileLayout({ v: 1 })).toBeNull();
  });
  it('dedupes repeated keys so a corrupt blob cannot render duplicate tiles', () => {
    expect(parseTileLayout({ v: 1, order: ['tickets', 'tickets', 'studio'] }))
      .toEqual({ v: 1, order: ['tickets', 'studio'] });
  });
});

describe('getAppTiles with a custom tools list', () => {
  it('null tools keeps the default slice-at-8 behavior', () => {
    expect(getAppTiles('faculty', allOn, navFor(allOn), null)).toEqual(getAppTiles('faculty', allOn, navFor(allOn)));
  });
  it('primary follows the saved order exactly; everything else enabled goes to overflow', () => {
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn), ['tickets', 'finance', 'attendance']);
    expect(primary.map((t) => t.key)).toEqual(['tickets', 'finance', 'attendance']);
    const overflowKeys = overflow.map((t) => t.key);
    expect(overflowKeys).not.toContain('tickets');
    // No duplicates and no losses versus the default enabled set.
    const defaults = getAppTiles('faculty', allOn, navFor(allOn));
    const allDefault = [...defaults.primary, ...defaults.overflow].map((t) => t.key).sort();
    const allCustom = [...primary, ...overflow].map((t) => t.key).sort();
    expect(allCustom).toEqual(allDefault);
  });
  // Review round 1, Important 1: this branch did a bare `byKey.get(k)` with
  // no resolveKey call, so a stored ['merch'] resolved on the sidebar shelf
  // (selectShelfEntries calls resolveKey itself) but yielded `primary: []`
  // here — an admin who had the Merch keycap lost it from their home grid
  // even though the shelf still showed "Store Admin". Verified before the
  // fix; see myTools.test.ts's resolvedTools tests for the same guard on
  // the other consumers (AllToolsSheet's pinned check, MyWorldPage editor).
  it('resolves a merged key on the My Tools (grid) path — the bug this fix closes', () => {
    const { primary } = getAppTiles('faculty', allOn, navFor(allOn, { isTenantAdmin: true }), ['merch']);
    expect(primary.map((t) => t.key)).toEqual(['shop']);
  });
  it('a merged key and its own successor in the same stored list collapse to one tile, not two', () => {
    const { primary } = getAppTiles('faculty', allOn, navFor(allOn, { isTenantAdmin: true }), ['merch', 'shop', 'finance']);
    expect(primary.map((t) => t.key)).toEqual(['shop', 'finance']);
  });
  it('silently drops stale keys (disabled module) without losing the rest', () => {
    const { primary } = getAppTiles('faculty', { ...allOn, hasBoxOffice: false }, navFor({ ...allOn, hasBoxOffice: false }), ['tickets', 'finance']);
    expect(primary.map((t) => t.key)).toEqual(['finance']);
  });
  it('silently drops keys whose route the tab bar claims', () => {
    // Student allOn tab bar contains Music and Studio (see getTabItems test).
    const { primary, overflow } = getAppTiles('student', allOn, navFor(allOn), ['music', 'tickets']);
    expect(primary.map((t) => t.key)).toEqual(['tickets']);
    expect(overflow.map((t) => t.key)).not.toContain('music');
  });
  it('drops unknown keys from a corrupt-but-parseable order', () => {
    const { primary } = getAppTiles('faculty', allOn, navFor(allOn), ['nonsense', 'tickets']);
    expect(primary.map((t) => t.key)).toEqual(['tickets']);
  });
  it('empty tools list is a deliberate clear: empty primary, everything enabled goes to overflow', () => {
    // Product ruling (round 1 review): a stored empty set means the member
    // removed every keycap and tapped Done. That is a real choice, not "no
    // record yet" — respect it. The sidebar shelf has no empty→default
    // fallback, so if the grid papered over an empty array with
    // DEFAULT_GRID_ORDER, the two surfaces would disagree again (grid full,
    // shelf empty) — the exact bug this task exists to eliminate. Home and
    // All Tools always render, so nobody is stranded by an empty grid.
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn), []);
    expect(primary).toEqual([]);
    expect(overflow.length).toBeGreaterThan(0);
  });
  it('null and an empty array diverge: only null (no record) falls back to the default grid', () => {
    // Pins the distinction the guard must preserve: `tools == null` (hook
    // still loading, or no stored preference at all) is not the same state
    // as `tools: []` (a stored, deliberate empty set). A future refactor
    // that re-collapses `if (!tools || tools.length === 0)` would pass
    // every other test in this file yet silently regress this one.
    const withNull = getAppTiles('faculty', allOn, navFor(allOn), null);
    const withEmpty = getAppTiles('faculty', allOn, navFor(allOn), []);
    expect(withNull.primary.length).toBeGreaterThan(0);
    expect(withEmpty.primary).toEqual([]);
    expect(withNull).not.toEqual(withEmpty);
  });
  it('custom lists are not capped at 8', () => {
    const defaults = getAppTiles('faculty', allOn, navFor(allOn));
    const everyKey = [...defaults.primary, ...defaults.overflow].map((t) => t.key);
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn), everyKey);
    expect(primary.map((t) => t.key)).toEqual(everyKey);
    expect(overflow).toEqual([]);
  });
});

describe('getAppTiles catalog parity', () => {
  it('default primary is byte-identical to the pre-catalog grid for both roles (allOn)', () => {
    // Faculty tabs claim /dashboard/viewer (Music); student tabs claim
    // /dashboard/viewer AND /studio — so those keys dedupe out of the grid.
    // With Part Tracks removed, the grid now has more room (8 max, not 8 with tracks).
    // 'merch' (Phase 5, 2026-08-09) merged into 'shop' — DEFAULT_GRID_ORDER's
    // trailing slot was deliberately updated to 'shop' (see that const's own
    // comment) so a fresh ADMIN member still gets it on day one. It's still
    // absent from primary here because 'shop' is now adminOnly and this
    // context (navFor's default) is a non-admin — see the isTenantAdmin:
    // true variant of this exact check below.
    expect(getAppTiles('faculty', allOn, navFor(allOn)).primary.map((t) => t.key))
      .toEqual(['studio', 'sight', 'attendance', 'academy', 'tickets', 'planner', 'finance']);
    expect(getAppTiles('student', allOn, navFor(allOn)).primary.map((t) => t.key))
      .toEqual(['sight', 'attendance', 'academy', 'tickets', 'planner', 'finance']);
  });
  it('DEFAULT_GRID_ORDER is the frozen 9-key list — merch -> shop as of 2026-08-09', () => {
    expect(DEFAULT_GRID_ORDER).toEqual(['music', 'studio', 'sight', 'attendance', 'academy', 'tickets', 'planner', 'finance', 'shop']);
  });
  it('an admin DOES get Store Admin in the default day-one grid (no stored record)', () => {
    const { primary } = getAppTiles('faculty', allOn, navFor(allOn, { isTenantAdmin: true }));
    expect(primary.map((t) => t.key)).toContain('shop');
  });
  it('sidebar-parity destinations land in overflow, never default primary', () => {
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn, { isTenantAdmin: true }));
    const overflowKeys = overflow.map((t) => t.key);
    // 'shop' deliberately excluded from this list: it IS in DEFAULT_GRID_ORDER
    // now (as of the merch -> shop swap above), so for an admin context it
    // belongs in primary, not overflow — see the "an admin DOES get Store
    // Admin" test just above this one.
    for (const key of ['music-library', 'media-library', 'office-hours', 'video', 'music-tools', 'people', 'analytics', 'settings', 'box-office', 'practice', 'fan-page', 'site-setup']) {
      expect(overflowKeys, key).toContain(key);
      expect(primary.map((t) => t.key)).not.toContain(key);
    }
  });
  it('parity invariant: every resolved grid-surface non-tab entry is a candidate', async () => {
    const { resolveNav, entrySurfaces } = await import('../navCatalog');
    // Same rationale as the route-validity sweep above: use an
    // always-true hasModule so every catalog entry (including the
    // non-ModuleFlags-gated ones) is a real candidate here, keeping
    // this invariant honest against the full catalog.
    const nav: NavContext = {
      hasModule: () => true, isTenantAdmin: true, isPlatformAdmin: true, canLibrarian: true, isPartner: true,
      hiddenRoutes: new Set(),
    };
    const tabRoutes = new Set(getTabItems('faculty', allOn).map((t) => t.to));
    const expected = resolveNav(nav)
      .filter((e) => entrySurfaces(e).includes('grid') && !tabRoutes.has(e.to))
      .map((e) => e.key).sort();
    const { primary, overflow } = getAppTiles('faculty', allOn, nav);
    expect([...primary, ...overflow].map((t) => t.key).sort()).toEqual(expected);
  });
  it('admin-gated tiles absent for non-admins', () => {
    const { primary, overflow } = getAppTiles('student', allOn, navFor(allOn));
    const keys = [...primary, ...overflow].map((t) => t.key);
    for (const key of ['box-office', 'practice', 'fan-page', 'site-setup']) expect(keys, key).not.toContain(key);
  });
  it('hidden-nav routes are not pinnable', () => {
    const nav = navFor(allOn, { hiddenRoutes: new Set(['/dashboard/music-tools']) });
    const keys = [...getAppTiles('student', allOn, nav).primary, ...getAppTiles('student', allOn, nav).overflow].map((t) => t.key);
    expect(keys).not.toContain('music-tools');
  });
  it('custom tools lists can pin parity destinations', () => {
    const { primary } = getAppTiles('faculty', allOn, navFor(allOn, { isTenantAdmin: true }), ['people', 'music-library', 'tickets']);
    expect(primary.map((t) => t.key)).toEqual(['people', 'music-library', 'tickets']);
  });
  it('grid tiles carry their catalog section and grid label/icon overrides', () => {
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn));
    const planner = [...primary, ...overflow].find((t) => t.key === 'planner');
    expect(planner?.label).toBe('Programs');
    expect(planner?.section).toBe('plan');
  });
});

describe('getAppTiles with a My Tools key list', () => {
  const nav: NavContext = {
    hasModule: () => true, isTenantAdmin: true, isPlatformAdmin: false,
    canLibrarian: true, isPartner: false, hiddenRoutes: new Set(),
  };
  const flags: ModuleFlags = {
    hasViewer: true, hasStudio: true, hasSightReading: true, hasBoxOffice: true,
    hasConcertPlanner: true, hasMerch: true, hasFinance: true, hasAcademy: true,
    hasStore: true, hasSongwriting: true, hasPlanner: true,
  };

  it('honours stored order', () => {
    const { primary } = getAppTiles('faculty', flags, nav, ['finance', 'academy']);
    expect(primary.map((d) => d.key)).toEqual(['finance', 'academy']);
  });

  it('drops keys the tab bar already claims by route', () => {
    const tabRoutes = new Set(getTabItems('faculty', flags).map((t) => t.to));
    const { primary } = getAppTiles('faculty', flags, nav, ['messages', 'finance']);
    for (const d of primary) expect(tabRoutes.has(d.to)).toBe(false);
  });

  it('falls back to the frozen default grid when handed nothing', () => {
    const { primary } = getAppTiles('faculty', flags, nav, null);
    expect(primary.length).toBeGreaterThan(0);
    expect(primary.length).toBeLessThanOrEqual(8);
  });

  it('surfaces sidebar-only entries as keycaps — the shelf pool, not the grid pool', () => {
    // C1 (final review): Calendar and Messages are surfaces: ['sidebar'] yet
    // are the first two entries of BOTH role defaults. Filtering the My
    // Tools pool by grid surface rendered a shorter grid than the shelf,
    // and HomeTileGrid then wrote that shorter list back. Kevin's ruling:
    // the keycaps show the SAME set as the shelf.
    const { primary } = getAppTiles('faculty', flags, nav, ['calendar', 'messages', 'finance'], { tabBarVisible: false });
    expect(primary.map((d) => d.key)).toEqual(['calendar', 'messages', 'finance']);
  });

  it('still hides tab-bar routes while the tab bar is on screen', () => {
    const { primary } = getAppTiles('faculty', flags, nav, ['calendar', 'messages', 'finance'], { tabBarVisible: true });
    expect(primary.map((d) => d.key)).toEqual(['finance']);
  });

  it('defaults to deduping — a caller that has not measured the viewport never duplicates a tab', () => {
    const withDefault = getAppTiles('faculty', flags, nav, ['calendar', 'finance']);
    const withExplicit = getAppTiles('faculty', flags, nav, ['calendar', 'finance'], { tabBarVisible: true });
    expect(withDefault.primary.map((d) => d.key)).toEqual(withExplicit.primary.map((d) => d.key));
  });

  it('never offers Home as a keycap — it is implicit, and the grid lives on it', () => {
    const { primary, overflow } = getAppTiles('faculty', flags, nav, ['home', 'finance'], { tabBarVisible: false });
    expect([...primary, ...overflow].map((d) => d.key)).not.toContain('home');
  });

  it('leaves the no-record branch untouched regardless of the tab bar', () => {
    // DEFAULT_GRID_ORDER is a separately frozen list; widening the pool for
    // a My Tools set must not quietly re-cut the day-one default grid.
    expect(getAppTiles('faculty', flags, nav, null, { tabBarVisible: false }))
      .toEqual(getAppTiles('faculty', flags, nav, null, { tabBarVisible: true }));
  });
});

// The keycap grid shows the same SET as the sidebar shelf (see the
// "surfaces sidebar-only entries" test above); bandDestinations is what
// makes it show the same STRUCTURE — loose tiles first under no heading,
// then one band per member-named group.
describe('bandDestinations', () => {
  // One shared icon reference: `toEqual` compares functions by identity, so
  // a fresh arrow per call would make two structurally-identical
  // destinations unequal.
  const dest = (key: string): Destination => ({ key, to: `/${key}`, label: key, icon: Music });

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

  it('drops a band a member made but never filled', () => {
    const unfilled: ToolGroup[] = [{ id: 'empty', name: 'Someday', tools: [], collapsed: false }];
    expect(bandDestinations([dest('calendar')], unfilled).map((b) => b.name)).toEqual([null]);
  });

  it('partitions without reordering — the caller owns the order', () => {
    // HouseHome hands getAppTiles flattenShelf(shelf), so `primary` already
    // arrives loose-then-groups. Handing it a deliberately scrambled order
    // must not be "corrected" here: re-sorting would silently override the
    // member's own arrangement.
    const bands = bandDestinations(
      [dest('worship-aids'), dest('liturgy'), dest('calendar')], groups);
    expect(bands.map((b) => b.tiles.map((t) => t.key))).toEqual([
      ['calendar'], ['worship-aids', 'liturgy'],
    ]);
  });
});
