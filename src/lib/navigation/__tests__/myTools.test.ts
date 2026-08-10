import { describe, it, expect } from 'vitest';
import {
  MY_TOOLS_SEED_SIZE, MY_TOOLS_SANITY_MAX, parseMyTools, migrateToMyTools, sanitizeTools, resolveKey,
  selectShelfEntries, mergeGridOrder, DEFAULT_TOOLS_STUDENT, DEFAULT_TOOLS_FACULTY,
  MERGED_KEYS, resolvedTools,
} from '../myTools';
import { NAV_CATALOG } from '../navCatalog';

describe('parseMyTools', () => {
  it('accepts a v4 record, widened to v5 with no groups', () => {
    const raw = { v: 4, tools: ['calendar'], widgets: [], setupComplete: true };
    expect(parseMyTools(raw)).toEqual({
      v: 5, tools: ['calendar'], groups: [], widgets: [], setupComplete: true,
    });
  });
  it('rejects legacy versions and junk', () => {
    expect(parseMyTools({ v: 3, order: ['calendar'] })).toBeNull();
    expect(parseMyTools(null)).toBeNull();
    expect(parseMyTools('nope')).toBeNull();
    expect(parseMyTools([])).toBeNull();
  });
  it('drops non-string entries rather than throwing', () => {
    const parsed = parseMyTools({ v: 4, tools: ['calendar', 7, null], widgets: [], setupComplete: false });
    expect(parsed?.tools).toEqual(['calendar']);
  });
});

describe('resolveKey', () => {
  it('follows a merge map', () => {
    expect(resolveKey('my-fees', { 'my-fees': 'fees' })).toBe('fees');
  });
  it('follows a chain', () => {
    expect(resolveKey('a', { a: 'b', b: 'c' })).toBe('c');
  });
  it('terminates on a cycle instead of hanging', () => {
    expect(resolveKey('a', { a: 'b', b: 'a' })).toBe('b');
  });
  it('returns the key unchanged when unmapped', () => {
    expect(resolveKey('calendar', {})).toBe('calendar');
  });
});

describe('MERGED_KEYS — merch retired into shop (Phase 5, 2026-08-09)', () => {
  it('resolveKey follows the real MERGED_KEYS default, not just a hand-built test map', () => {
    expect(resolveKey('merch')).toBe('shop');
  });
  it('a stored layout containing merch resolves to shop', () => {
    expect(sanitizeTools(['merch'])).toEqual(['shop']);
  });
  it('a stored layout with both merch and shop does not duplicate — merch resolves onto the same slot', () => {
    expect(sanitizeTools(['merch', 'shop'])).toEqual(['shop']);
    expect(sanitizeTools(['shop', 'merch'])).toEqual(['shop']);
  });
  it('merch has no live catalog entry of its own — it only exists via the merge map', () => {
    expect(NAV_CATALOG.find((e) => e.key === 'merch')).toBeUndefined();
    expect(MERGED_KEYS.merch).toBe('shop');
  });
});

// Review round 1, Important 1: MERGED_KEYS resolution only reached
// selectShelfEntries (the sidebar shelf) — getAppTiles's My Tools path
// (the home keycap grid), DashboardShell's AllToolsSheet "already pinned"
// check, and MyWorldPage's editor all read `myTools.tools` raw, so a
// stored 'merch' resolved on the shelf and nowhere else. resolvedTools is
// the one helper all of those now go through instead of `myTools?.tools ??
// []` directly.
describe('resolvedTools', () => {
  it('resolves a merged key', () => {
    expect(resolvedTools({ tools: ['merch'] })).toEqual(['shop']);
  });
  it('dedupes a merged key against its own successor, wherever each appears', () => {
    expect(resolvedTools({ tools: ['merch', 'calendar', 'shop'] })).toEqual(['shop', 'calendar']);
  });
  it('is null/undefined-safe — no stored record yet', () => {
    expect(resolvedTools(null)).toEqual([]);
    expect(resolvedTools(undefined)).toEqual([]);
  });
  it('leaves an already-resolved record unchanged', () => {
    expect(resolvedTools({ tools: ['calendar', 'academy'] })).toEqual(['calendar', 'academy']);
  });
});

describe('sanitizeTools', () => {
  // The hard 8-tool cap is gone (product owner, 2026-08-09). What is left is
  // MY_TOOLS_SANITY_MAX, corruption protection only — a member's ordinary
  // set must pass through untouched however long it is.
  it('does NOT truncate an ordinary oversized set — 8 is not a ceiling', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `k${i}`);
    expect(sanitizeTools(twenty)).toEqual(twenty);
  });

  it('still bounds a corrupt blob at MY_TOOLS_SANITY_MAX', () => {
    const absurd = Array.from({ length: MY_TOOLS_SANITY_MAX + 25 }, (_, i) => `k${i}`);
    expect(sanitizeTools(absurd)).toHaveLength(MY_TOOLS_SANITY_MAX);
  });

  it('bounds at 64, matching parseTileLayout — not at the seed size', () => {
    expect(MY_TOOLS_SANITY_MAX).toBe(64);
    expect(MY_TOOLS_SEED_SIZE).toBe(8);
  });
  it('drops home — it is implicit and never stored', () => {
    expect(sanitizeTools(['home', 'calendar'])).toEqual(['calendar']);
  });
  it('dedupes, keeping first position', () => {
    expect(sanitizeTools(['calendar', 'music-library', 'calendar'])).toEqual(['calendar', 'music-library']);
  });
  it('dedupes across a merge map', () => {
    expect(sanitizeTools(['fees', 'my-fees'], { 'my-fees': 'fees' })).toEqual(['fees']);
  });
});

describe('migrateToMyTools', () => {
  it('returns an existing v4 record widened to v5, not replaced by role defaults', () => {
    const existing = { v: 4, tools: ['studio'], widgets: ['today'], setupComplete: true };
    expect(migrateToMyTools(existing, null, 'student')).toEqual({
      v: 5, tools: ['studio'], groups: [], widgets: ['today'], setupComplete: true,
    });
  });
  it('prefers home_tile_layout over a legacy nav order', () => {
    const tiles = { v: 1, order: ['studio', 'academy'] };
    const legacy = { v: 3, order: ['finance'], sections: {}, sectionOrder: [] };
    expect(migrateToMyTools(legacy, tiles, 'student').tools).toEqual(['studio', 'academy']);
  });
  it('IGNORES a legacy v1-v3 nav order entirely — it was never a pick list', () => {
    // I3 (final review). The old sidebar stored the whole flat display
    // order of every visible entry, so "first 8" was top-of-catalog order,
    // not preference: a school admin got messages/calendar/notes/concierge/
    // bible/... with no Academy, People, Finance or Concert Planner — AND
    // setupComplete:true, which would skip them past Phase 2's first-run
    // sheet. Role default + setupComplete:false is the better answer.
    const legacy = { v: 3, order: NAV_CATALOG.map((e) => e.key), sections: {}, sectionOrder: [] };
    const migrated = migrateToMyTools(legacy, null, 'faculty');
    expect(migrated.tools).toEqual(DEFAULT_TOOLS_FACULTY);
    expect(migrated.setupComplete).toBe(false);
  });
  it('falls back to role defaults when the member has customized nothing', () => {
    expect(migrateToMyTools(null, null, 'student').tools).toEqual(DEFAULT_TOOLS_STUDENT);
    expect(migrateToMyTools(null, null, 'faculty').tools).toEqual(DEFAULT_TOOLS_FACULTY);
  });
  it('marks setupComplete only when the member had a real prior layout', () => {
    expect(migrateToMyTools(null, { v: 1, order: ['studio'] }, 'student').setupComplete).toBe(true);
    expect(migrateToMyTools(null, null, 'student').setupComplete).toBe(false);
  });
  it('respects a deliberately CLEARED tile layout instead of refilling it', () => {
    // M6: an empty v4 record is respected everywhere else (getAppTiles
    // distinguishes null from []), so an empty v1 layout — the same
    // deliberate "I cleared my grid" — must be too.
    const cleared = migrateToMyTools(null, { v: 1, order: [] }, 'faculty');
    expect(cleared.tools).toEqual([]);
    expect(cleared.setupComplete).toBe(true);
  });
  it('migrates an oversized tile layout WHOLE — no tail is dropped', () => {
    // This used to keep only the first 8 and assert the other four were
    // dropped. Truncating a member's own curated pick list is exactly the
    // silent drop the cap removal ends, so all twelve now survive, in order.
    const twelve = {
      v: 1,
      order: [
        'music-library', 'academy', 'planner', 'people', 'finance', 'part-tracks',
        'studio', 'sight', 'attendance', 'tickets', 'merch', 'video',
      ],
    };
    const migrated = migrateToMyTools(null, twelve, 'faculty');
    expect(migrated.tools).toEqual([
      'music-library', 'academy', 'planner', 'people', 'finance', 'part-tracks',
      // 'merch' resolves to 'shop' through MERGED_KEYS.
      'studio', 'sight', 'attendance', 'tickets', 'shop', 'video',
    ]);
    expect(migrated.tools).toHaveLength(12);
  });
});

describe('mergeGridOrder', () => {
  // The grid is a lossy view of the stored record; this is what keeps a
  // save from deleting what the grid could not show. See
  // __tests__/gridRoundTrip.test.ts for the same guard end-to-end.
  const representable = new Set(['a', 'b', 'c', 'd']);

  it('is a no-op when the draft matches what the grid rendered', () => {
    const stored = ['x', 'a', 'b', 'y', 'c'];
    expect(mergeGridOrder(stored, ['a', 'b', 'c'], representable)).toEqual(stored);
  });
  it('keeps un-representable keys at their stored index', () => {
    expect(mergeGridOrder(['x', 'a', 'b'], ['b', 'a'], representable)).toEqual(['x', 'b', 'a']);
  });
  it('applies the draft order to the representable slots', () => {
    expect(mergeGridOrder(['a', 'b', 'c'], ['c', 'a', 'b'], representable)).toEqual(['c', 'a', 'b']);
  });
  it('drops only what the draft dropped', () => {
    expect(mergeGridOrder(['x', 'a', 'b', 'c'], ['a', 'c'], representable)).toEqual(['x', 'a', 'c']);
  });
  it('appends keys the draft added beyond the available slots', () => {
    expect(mergeGridOrder(['x', 'a'], ['a', 'b', 'c'], representable)).toEqual(['x', 'a', 'b', 'c']);
  });
  it('returns the draft unchanged when nothing is stored yet', () => {
    expect(mergeGridOrder([], ['a', 'b'], representable)).toEqual(['a', 'b']);
  });
  it('returns only the preserved keys when the member clears the grid', () => {
    expect(mergeGridOrder(['x', 'a', 'b'], [], representable)).toEqual(['x']);
  });
});

describe('role defaults', () => {
  it('reference only real catalog keys', () => {
    const keys = new Set(NAV_CATALOG.map((e) => e.key));
    for (const k of [...DEFAULT_TOOLS_STUDENT, ...DEFAULT_TOOLS_FACULTY]) {
      expect(keys.has(k), `${k} is not a catalog key`).toBe(true);
    }
  });
  // Not "fit within a cap" — there is no cap. These two lists ARE the seed:
  // MY_TOOLS_SEED_SIZE is defined as how long they are, so an edit that
  // lengthened one without a deliberate decision shows up here.
  it('are exactly MY_TOOLS_SEED_SIZE long', () => {
    expect(DEFAULT_TOOLS_STUDENT).toHaveLength(MY_TOOLS_SEED_SIZE);
    expect(DEFAULT_TOOLS_FACULTY).toHaveLength(MY_TOOLS_SEED_SIZE);
  });
});

describe('selectShelfEntries', () => {
  const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
  const resolved = ['calendar', 'studio', 'academy'].map((k) => byKey.get(k)!);

  it('returns entries in stored order, not catalog order', () => {
    const got = selectShelfEntries(resolved, ['academy', 'calendar']);
    expect(got.map((e) => e.key)).toEqual(['academy', 'calendar']);
  });
  it('drops tools whose gate closed without disturbing the rest', () => {
    const got = selectShelfEntries(resolved, ['academy', 'box-office', 'calendar']);
    expect(got.map((e) => e.key)).toEqual(['academy', 'calendar']);
  });

  // Review round 1, Important 1: a stored record from before 'merch'
  // merged into 'shop' (2026-08-09) can legitimately hold both — they were
  // two separately pinnable entries until then. Resolve without a dedupe
  // step would render the same catalog entry twice.
  it('resolves a merged key to its live entry', () => {
    const shopEntries = [byKey.get('shop')!];
    const got = selectShelfEntries(shopEntries, ['merch']);
    expect(got.map((e) => e.key)).toEqual(['shop']);
  });
  it('a merged key and its own successor in the same stored list render as ONE tile', () => {
    const shopEntries = [byKey.get('calendar')!, byKey.get('shop')!];
    const got = selectShelfEntries(shopEntries, ['merch', 'calendar', 'shop']);
    expect(got.map((e) => e.key)).toEqual(['shop', 'calendar']);
  });
});
