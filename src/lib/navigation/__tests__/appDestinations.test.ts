import { describe, it, expect } from 'vitest';
import { getTabItems, getAppTiles, parseTileLayout, DEFAULT_GRID_ORDER, type ModuleFlags } from '../appDestinations';
import type { NavContext } from '../navCatalog';

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

// Every route currently wired up in src/App.tsx for a grid destination.
// Copied here (not imported) so this list only changes when someone
// deliberately re-verifies it against App.tsx's <Route path="..."> entries.
const KNOWN_ROUTES = new Set([
  '/dashboard/concierge',
  '/dashboard/viewer', '/studio',
  '/dashboard/sight-reading', '/dashboard/reading-music', '/attendance', '/dashboard/academy',
  '/box-office', '/dashboard/concert-planner', '/dashboard/finance',
  '/store', '/store/products', '/dashboard/people',
  '/partner', '/admin/partners',
  '/dashboard/music-library', '/dashboard/part-tracks', '/dashboard/media-library', '/dashboard/librarian',
  '/seating-charts', '/dashboard/workspace?tab=parents',
  '/dashboard/office-hours', '/dashboard/practice-recordings', '/video',
  '/dashboard/music-tools', '/dashboard/liturgy', '/dashboard/worship-aids', '/tour-manager',
  '/dashboard/auditions', '/dashboard/pr-hub', '/admin/fan-page',
  '/dashboard/feeds', '/dashboard/shop', '/dashboard/alumni',
  // Verified against src/App.tsx: both <Route path="/dashboard/fees"> and
  // <Route path="/dashboard/my-fees"> exist. Both were missed when the Student
  // Fees ledger shipped — exactly the drift this test is here to catch.
  '/dashboard/fees', '/dashboard/my-fees',
  // Verified against src/App.tsx: both routes exist.
  '/prayer', '/bible',
  '/dashboard/box-office', '/dashboard/users', '/admin/public-page',
  '/dashboard/analytics', '/dashboard/workspace', '/songwriting',
  '/planner', '/dashboard/fundraising', '/qr-generator',
]);

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
          KNOWN_ROUTES.has(dest.to),
          `${role} grid tile "${dest.label}" points at ${dest.to}, which is not in KNOWN_ROUTES. ` +
            `Check src/App.tsx: if the route exists, add it to KNOWN_ROUTES above; if it does not, the tile is dead.`,
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
    expect(getAppTiles('faculty', allOn, navFor(allOn)).primary.map((t) => t.key))
      .toEqual(['studio', 'sight', 'attendance', 'academy', 'tickets', 'planner', 'finance', 'merch']);
    expect(getAppTiles('student', allOn, navFor(allOn)).primary.map((t) => t.key))
      .toEqual(['sight', 'attendance', 'academy', 'tickets', 'planner', 'finance', 'merch']);
  });
  it('DEFAULT_GRID_ORDER is the frozen 9-key list', () => {
    expect(DEFAULT_GRID_ORDER).toEqual(['music', 'studio', 'sight', 'attendance', 'academy', 'tickets', 'planner', 'finance', 'merch']);
  });
  it('sidebar-parity destinations land in overflow, never default primary', () => {
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn, { isTenantAdmin: true }));
    const overflowKeys = overflow.map((t) => t.key);
    for (const key of ['music-library', 'media-library', 'office-hours', 'video', 'music-tools', 'people', 'analytics', 'settings', 'shop', 'box-office', 'practice', 'fan-page', 'site-setup']) {
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
