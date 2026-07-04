import { describe, it, expect } from 'vitest';
import { getTabItems, getAppTiles, type ModuleFlags } from '../appDestinations';

const allOn: ModuleFlags = {
  hasViewer: true, hasPartTracks: true, hasStudio: true, hasSightReading: true,
  hasBoxOffice: true, hasConcertPlanner: true, hasMerch: true, hasFinance: true, hasAcademy: true,
  hasStore: true,
};

const allOff: ModuleFlags = {
  hasViewer: false, hasPartTracks: false, hasStudio: false, hasSightReading: false,
  hasBoxOffice: false, hasConcertPlanner: false, hasMerch: false, hasFinance: false, hasAcademy: false,
  hasStore: false,
};

// Routes that are always available regardless of module flags (Home,
// Messages, Schedule, and the flagless attendance/roster surface).
const FLAGLESS_CORE_ROUTES = new Set(['/dashboard', '/messenger', '/dashboard/calendar', '/attendance', '/dashboard/people']);

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
  it('student gets Home/Messages/Music/Studio/Schedule', () => {
    expect(getTabItems('student', allOn).map((t) => t.label))
      .toEqual(['Home', 'Messages', 'Music', 'Studio', 'Schedule']);
  });
  it('faculty gets Roster instead of Studio', () => {
    expect(getTabItems('faculty', allOn).map((t) => t.label))
      .toEqual(['Home', 'Messages', 'Roster', 'Music', 'Schedule']);
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
    expect(tabs.map((t) => t.label)).toEqual(['Home', 'Messages', 'Attendance', 'Schedule']);
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

        // Fixed positions: Home first, Messages second, Schedule last.
        expect(tabs[0].label).toBe('Home');
        expect(tabs[1].label).toBe('Messages');
        expect(tabs[tabs.length - 1].label).toBe('Schedule');

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
]);

describe('getAppTiles', () => {
  it('never returns more than 8 primary tiles', () => {
    const { primary } = getAppTiles('faculty', allOn);
    expect(primary.length).toBeLessThanOrEqual(8);
  });
  it('gates module tiles off when flag is false', () => {
    const { primary, overflow } = getAppTiles('student', { ...allOn, hasBoxOffice: false });
    const labels = [...primary, ...overflow].map((t) => t.label);
    expect(labels).not.toContain('Tickets');
  });
  it('never repeats a tab destination in the grid, even when keys differ but routes match', () => {
    const tabRoutes = new Set(getTabItems('faculty', allOn).map((t) => t.to));
    const { primary, overflow } = getAppTiles('faculty', allOn);
    const gridRoutes = [...primary, ...overflow].map((t) => t.to);
    for (const route of gridRoutes) {
      expect(tabRoutes.has(route)).toBe(false);
    }
  });

  // The tab sweep test above only walks getTabItems, so a grid-only
  // destination (e.g. Merch) with a stale `to` (like the old, nonexistent
  // '/dashboard/merch') would never be caught. Pin every grid destination's
  // route to routes that actually exist in src/App.tsx.
  it('every grid destination (all flags on, both roles) routes to a known, existing App.tsx path', () => {
    for (const role of ['student', 'faculty'] as const) {
      const { primary, overflow } = getAppTiles(role, allOn);
      for (const dest of [...primary, ...overflow]) {
        expect(KNOWN_ROUTES.has(dest.to)).toBe(true);
      }
    }
  });

  it('faculty grid still surfaces an Attendance tile at /attendance now that Roster routes elsewhere', () => {
    const { primary, overflow } = getAppTiles('faculty', allOn);
    const attendance = [...primary, ...overflow].find((t) => t.label === 'Attendance');
    expect(attendance?.to).toBe('/attendance');
  });
});
