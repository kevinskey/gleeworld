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
    // 'seat' is a label prefix (80); 'ting' only occurs mid-word, inside
    // "Seating" — not a prefix of the label or of either word (40, contains).
    expect(scoreEntry(seating, 'seat')).toBeGreaterThan(scoreEntry(seating, 'ting'));
  });
  it('matches a later word in the label', () => {
    expect(scoreEntry(byKey.get('seating-charts')!, 'charts')).toBeGreaterThan(0);
  });
  it('matches on the section name', () => {
    // 'finance' lives in the Money section
    expect(scoreEntry(byKey.get('finance')!, 'money')).toBeGreaterThan(0);
  });
  it('scores a section-only match on its own, above zero', () => {
    // 'parents' (label "Parents") lives in the People section. "people"
    // doesn't match "Parents" by any label rule (not equal, not a prefix of
    // the label or either word, not contained) — only the section branch
    // fires. Pinned to the exact section-match score (20) so deleting that
    // branch (which would drop this to 0) is caught, not just weakened.
    expect(scoreEntry(byKey.get('parents')!, 'people')).toBe(20);
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

  it('ranks a label match above a section-only match', () => {
    // 'people' (label "People") matches the query on its label (100).
    // 'parents' (label "Parents", section People) does not match "people" by
    // any label rule — it only matches via its section name (20). Both are
    // real matches for the same query, so this actually compares 100 vs 20
    // (the original version compared 'finance' against 'mu', but 'finance'
    // scores 0 for that query — "money" doesn't start with or contain "mu" —
    // so nothing was really being compared).
    const got = searchNav(pick('people', 'parents'), 'people');
    expect(got.map((e) => e.key)).toEqual(['people', 'parents']);
  });

  it('breaks ties by catalog order, not alphabetical or reverse', () => {
    // "st" gives a genuine 3-way tie at score 80 (label starts with "st"):
    // Studio Hours (index 15), Studio (index 21), Store/shop (index 35).
    // Catalog order is office-hours < studio < shop. Alphabetical-by-label
    // order would be Store < Studio < Studio Hours (shop, studio,
    // office-hours) — the opposite — so this distinguishes the real
    // index-based tiebreak from either wrong-but-deterministic alternative.
    const got = searchNav(NAV_CATALOG, 'st').map((e) => e.key);
    const officeHoursIdx = got.indexOf('office-hours');
    const studioIdx = got.indexOf('studio');
    const shopIdx = got.indexOf('shop');
    expect(officeHoursIdx).toBeGreaterThanOrEqual(0);
    expect(officeHoursIdx).toBeLessThan(studioIdx);
    expect(studioIdx).toBeLessThan(shopIdx);
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
