import { describe, it, expect } from 'vitest';
import { getTabItems, getAppTiles, parseTileLayout, DEFAULT_GRID_ORDER, type ModuleFlags, type TileLayout } from '../appDestinations';
import type { NavContext } from '../navCatalog';

const allOn: ModuleFlags = {
  hasViewer: true, hasPartTracks: true, hasStudio: true, hasSightReading: true,
  hasBoxOffice: true, hasConcertPlanner: true, hasMerch: true, hasFinance: true, hasAcademy: true,
  hasStore: true, hasSongwriting: true, hasPlanner: true,
};

const allOff: ModuleFlags = {
  hasViewer: false, hasPartTracks: false, hasStudio: false, hasSightReading: false,
  hasBoxOffice: false, hasConcertPlanner: false, hasMerch: false, hasFinance: false, hasAcademy: false,
  hasStore: false, hasSongwriting: false, hasPlanner: false,
};

// Mirrors toModuleFlags's key set so flags and nav agree in tests.
const FLAG_MODULE: Record<keyof ModuleFlags, string> = {
  hasViewer: 'viewer', hasPartTracks: 'part_tracks', hasStudio: 'studio',
  hasSightReading: 'sight_reading', hasBoxOffice: 'box_office',
  hasConcertPlanner: 'concert_planner', hasMerch: 'merch', hasStore: 'store',
  hasFinance: 'finance', hasAcademy: 'academy', hasSongwriting: 'songwriting', hasPlanner: 'planner',
};
const navFor = (flags: ModuleFlags, over: Partial<NavContext> = {}): NavContext => ({
  hasModule: (k) => Object.entries(FLAG_MODULE).some(([f, m]) => m === k && flags[f as keyof ModuleFlags]),
  isTenantAdmin: false, isPlatformAdmin: false, canLibrarian: false,
  hiddenRoutes: new Set(), ...over,
});

// Routes that are always available regardless of module flags (Home,
// Messages, Calendar, and the flagless attendance/roster surface).
const FLAGLESS_CORE_ROUTES = new Set(['/dashboard', '/dashboard/messenger', '/dashboard/calendar', '/attendance', '/dashboard/people']);

// Maps a destination route to the ModuleFlags key that gates it, when the
// route is module-gated (used only by the sweep invariant test below).
const ROUTE_FLAG: Record<string, keyof ModuleFlags> = {
  '/dashboard/viewer': 'hasViewer',
  '/dashboard/part-tracks': 'hasPartTracks',
  '/studio': 'hasStudio',
  '/dashboard/sight-reading': 'hasSightReading',
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
  '/dashboard/viewer', '/dashboard/part-tracks', '/studio',
  '/dashboard/sight-reading', '/attendance', '/dashboard/academy',
  '/box-office', '/dashboard/concert-planner', '/dashboard/finance',
  '/store', '/dashboard/people',
  '/dashboard/music-library', '/dashboard/repertoire', '/dashboard/media-library', '/dashboard/librarian',
  '/dashboard/office-hours', '/dashboard/practice-recordings', '/video',
  '/dashboard/music-tools', '/dashboard/liturgy', '/tour-manager',
  '/dashboard/auditions', '/dashboard/pr-hub', '/admin/fan-page',
  '/dashboard/feeds', '/dashboard/shop', '/dashboard/alumni',
  '/dashboard/box-office', '/dashboard/users', '/admin/public-page',
  '/dashboard/analytics', '/dashboard/workspace', '/songwriting',
  '/planner', '/dashboard/fundraising',
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
      hasModule: () => true, isTenantAdmin: true, isPlatformAdmin: true, canLibrarian: true,
      hiddenRoutes: new Set(),
    };
    for (const role of ['student', 'faculty'] as const) {
      const { primary, overflow } = getAppTiles(role, allOn, adminNav);
      for (const dest of [...primary, ...overflow]) {
        expect(KNOWN_ROUTES.has(dest.to)).toBe(true);
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

describe('getAppTiles with a custom layout', () => {
  const layout = (order: string[]): TileLayout => ({ v: 1, order });

  it('null layout keeps the default slice-at-8 behavior', () => {
    expect(getAppTiles('faculty', allOn, navFor(allOn), null)).toEqual(getAppTiles('faculty', allOn, navFor(allOn)));
  });
  it('primary follows the saved order exactly; everything else enabled goes to overflow', () => {
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn), layout(['tickets', 'finance', 'attendance']));
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
    const { primary } = getAppTiles('faculty', { ...allOn, hasBoxOffice: false }, navFor({ ...allOn, hasBoxOffice: false }), layout(['tickets', 'finance']));
    expect(primary.map((t) => t.key)).toEqual(['finance']);
  });
  it('silently drops keys whose route the tab bar claims', () => {
    // Student allOn tab bar contains Music and Studio (see getTabItems test).
    const { primary, overflow } = getAppTiles('student', allOn, navFor(allOn), layout(['music', 'tickets']));
    expect(primary.map((t) => t.key)).toEqual(['tickets']);
    expect(overflow.map((t) => t.key)).not.toContain('music');
  });
  it('drops unknown keys from a corrupt-but-parseable order', () => {
    const { primary } = getAppTiles('faculty', allOn, navFor(allOn), layout(['nonsense', 'tickets']));
    expect(primary.map((t) => t.key)).toEqual(['tickets']);
  });
  it('empty order means empty primary and everything in overflow', () => {
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn), layout([]));
    expect(primary).toEqual([]);
    expect(overflow.length).toBeGreaterThan(0);
  });
  it('custom layouts are not capped at 8', () => {
    const defaults = getAppTiles('faculty', allOn, navFor(allOn));
    const everyKey = [...defaults.primary, ...defaults.overflow].map((t) => t.key);
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn), layout(everyKey));
    expect(primary.map((t) => t.key)).toEqual(everyKey);
    expect(overflow).toEqual([]);
  });
});

describe('getAppTiles catalog parity', () => {
  it('default primary is byte-identical to the pre-catalog grid for both roles (allOn)', () => {
    // Faculty tabs claim /dashboard/viewer (Music); student tabs claim
    // /dashboard/viewer AND /studio — so those keys dedupe out of the grid,
    // exactly as before this change.
    expect(getAppTiles('faculty', allOn, navFor(allOn)).primary.map((t) => t.key))
      .toEqual(['tracks', 'studio', 'sight', 'attendance', 'academy', 'tickets', 'planner', 'finance']);
    expect(getAppTiles('student', allOn, navFor(allOn)).primary.map((t) => t.key))
      .toEqual(['tracks', 'sight', 'attendance', 'academy', 'tickets', 'planner', 'finance', 'merch']);
  });
  it('DEFAULT_GRID_ORDER is the frozen 10-key list', () => {
    expect(DEFAULT_GRID_ORDER).toEqual(['music', 'tracks', 'studio', 'sight', 'attendance', 'academy', 'tickets', 'planner', 'finance', 'merch']);
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
      hasModule: () => true, isTenantAdmin: true, isPlatformAdmin: true, canLibrarian: true,
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
  it('custom layouts can pin parity destinations', () => {
    const layout: TileLayout = { v: 1, order: ['people', 'music-library', 'tickets'] };
    const { primary } = getAppTiles('faculty', allOn, navFor(allOn), layout);
    expect(primary.map((t) => t.key)).toEqual(['people', 'music-library', 'tickets']);
  });
  it('grid tiles carry their catalog section and grid label/icon overrides', () => {
    const { primary, overflow } = getAppTiles('faculty', allOn, navFor(allOn));
    const planner = [...primary, ...overflow].find((t) => t.key === 'planner');
    expect(planner?.label).toBe('Programs');
    expect(planner?.section).toBe('plan');
  });
});
