import { describe, it, expect } from 'vitest';
import {
  MY_TOOLS_CAP, parseMyTools, migrateToMyTools, sanitizeTools, resolveKey,
  selectShelfEntries, mergeGridOrder, DEFAULT_TOOLS_STUDENT, DEFAULT_TOOLS_FACULTY,
  MERGED_KEYS,
} from '../myTools';
import { NAV_CATALOG } from '../navCatalog';

describe('parseMyTools', () => {
  it('accepts a v4 record', () => {
    const raw = { v: 4, tools: ['calendar'], widgets: [], setupComplete: true };
    expect(parseMyTools(raw)).toEqual(raw);
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

describe('sanitizeTools', () => {
  it('caps at MY_TOOLS_CAP', () => {
    const many = Array.from({ length: 20 }, (_, i) => `k${i}`);
    expect(sanitizeTools(many)).toHaveLength(MY_TOOLS_CAP);
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
  it('returns an existing v4 record untouched', () => {
    const existing = { v: 4, tools: ['studio'], widgets: ['today'], setupComplete: true };
    expect(migrateToMyTools(existing, null, 'student')).toEqual(existing);
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
  it('documents exactly which 8 of an oversized tile layout survive', () => {
    // I2: HomeTileGrid's add path is capped now, but layouts written before
    // that cap could hold every enabled destination, and sanitizeTools keeps
    // only the first MY_TOOLS_CAP. Truncation is deliberate — pin WHICH keys
    // survive so it is visible rather than accidental.
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
      'studio', 'sight',
    ]);
    expect(migrated.tools).toHaveLength(MY_TOOLS_CAP);
    // The tail is dropped, not reordered or shuffled to the front.
    for (const dropped of ['attendance', 'tickets', 'merch', 'video']) {
      expect(migrated.tools).not.toContain(dropped);
    }
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
  it('fit within the cap', () => {
    expect(DEFAULT_TOOLS_STUDENT.length).toBeLessThanOrEqual(MY_TOOLS_CAP);
    expect(DEFAULT_TOOLS_FACULTY.length).toBeLessThanOrEqual(MY_TOOLS_CAP);
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
});
