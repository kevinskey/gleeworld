import { describe, it, expect } from 'vitest';
import { normalize, scoreEntry, searchNav } from '../navSearch';
import { NAV_CATALOG, type CatalogEntry } from '../navCatalog';

const byKey = new Map(NAV_CATALOG.map((e) => [e.key, e]));
const pick = (...keys: string[]): CatalogEntry[] => keys.map((k) => byKey.get(k)!);

describe('normalize', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalize('Répertoire')).toBe('repertoire');
    expect(normalize('  MÚSICA ')).toBe('musica');
  });
  it('is a no-op on plain ascii', () => {
    expect(normalize('Seating Charts')).toBe('seating charts');
  });
});

describe('scoreEntry', () => {
  const academy = byKey.get('academy')!;
  it('scores an exact label match highest', () => {
    expect(scoreEntry(academy, 'Academy')).toBe(100);
  });
  it('scores a prefix above a contains', () => {
    const seating = byKey.get('seating-charts')!;
    expect(scoreEntry(seating, 'seat')).toBeGreaterThan(scoreEntry(seating, 'charts'));
  });
  it('matches a later word in the label', () => {
    expect(scoreEntry(byKey.get('seating-charts')!, 'charts')).toBeGreaterThan(0);
  });
  it('matches on the section name', () => {
    // 'finance' lives in the Money section
    expect(scoreEntry(byKey.get('finance')!, 'money')).toBeGreaterThan(0);
  });
  it('returns 0 for no match', () => {
    expect(scoreEntry(academy, 'zzzzz')).toBe(0);
  });
  it('ignores case and diacritics', () => {
    expect(scoreEntry(academy, 'ACADEMY')).toBe(100);
  });
});

describe('searchNav', () => {
  it('returns the input unchanged for an empty query', () => {
    const entries = pick('academy', 'finance');
    expect(searchNav(entries, '')).toEqual(entries);
    expect(searchNav(entries, '   ')).toEqual(entries);
  });

  it('finds Seating Charts by prefix — the spec\'s own example', () => {
    const got = searchNav(NAV_CATALOG, 'seat');
    expect(got[0].key).toBe('seating-charts');
  });

  it('drops non-matches entirely', () => {
    const got = searchNav(pick('academy', 'finance'), 'academy');
    expect(got.map((e) => e.key)).toEqual(['academy']);
  });

  it('ranks a label prefix above a section-only match', () => {
    const got = searchNav(pick('finance', 'music-library'), 'mu');
    expect(got[0].key).toBe('music-library');
  });

  it('breaks ties by catalog order, deterministically', () => {
    const a = searchNav(NAV_CATALOG, 'a').map((e) => e.key);
    const b = searchNav(NAV_CATALOG, 'a').map((e) => e.key);
    expect(a).toEqual(b);
  });

  it('never invents an entry that was not passed in', () => {
    const entries = pick('academy');
    for (const e of searchNav(entries, 'a')) expect(entries).toContain(e);
  });

  it('every catalog entry is reachable by a prefix of its own label', () => {
    for (const entry of NAV_CATALOG) {
      const q = entry.label.slice(0, 3);
      const hit = searchNav(NAV_CATALOG, q).some((e) => e.key === entry.key);
      expect(hit, `${entry.label} unreachable by "${q}"`).toBe(true);
    }
  });
});
