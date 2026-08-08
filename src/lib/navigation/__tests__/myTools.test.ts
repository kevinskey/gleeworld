import { describe, it, expect } from 'vitest';
import {
  MY_TOOLS_CAP, parseMyTools, migrateToMyTools, sanitizeTools, resolveKey,
  selectShelfEntries, DEFAULT_TOOLS_STUDENT, DEFAULT_TOOLS_FACULTY,
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
  it('prefers home_tile_layout over legacy nav order', () => {
    const tiles = { v: 1, order: ['studio', 'academy'] };
    const legacy = { v: 3, order: ['finance'], sections: {}, sectionOrder: [] };
    expect(migrateToMyTools(legacy, tiles, 'student').tools).toEqual(['studio', 'academy']);
  });
  it('falls back to legacy nav order when no tile layout exists', () => {
    const legacy = { v: 3, order: ['home', 'finance', 'studio'], sections: {}, sectionOrder: [] };
    expect(migrateToMyTools(legacy, null, 'student').tools).toEqual(['finance', 'studio']);
  });
  it('falls back to role defaults when the member has customized nothing', () => {
    expect(migrateToMyTools(null, null, 'student').tools).toEqual(DEFAULT_TOOLS_STUDENT);
    expect(migrateToMyTools(null, null, 'faculty').tools).toEqual(DEFAULT_TOOLS_FACULTY);
  });
  it('marks setupComplete only when the member had a real prior layout', () => {
    expect(migrateToMyTools(null, { v: 1, order: ['studio'] }, 'student').setupComplete).toBe(true);
    expect(migrateToMyTools(null, null, 'student').setupComplete).toBe(false);
  });
  it('caps a long legacy nav order at 8', () => {
    const legacy = { v: 3, order: NAV_CATALOG.map((e) => e.key), sections: {}, sectionOrder: [] };
    expect(migrateToMyTools(legacy, null, 'faculty').tools).toHaveLength(MY_TOOLS_CAP);
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
