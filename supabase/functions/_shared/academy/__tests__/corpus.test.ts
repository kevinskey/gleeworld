import { describe, it, expect } from 'vitest';
import { ACADEMY_CORPUS } from '../corpus';
import { buildIndex, searchAcademy } from '../search';
import { SOURCES } from '../../../../../scripts/academy/manifest.mjs';

describe('ACADEMY_CORPUS', () => {
  it('is substantial', () => {
    expect(ACADEMY_CORPUS.length).toBeGreaterThan(500);
  });

  it('has a unique id for every chunk', () => {
    const ids = new Set(ACADEMY_CORPUS.map((c) => c.id));
    expect(ids.size).toBe(ACADEMY_CORPUS.length);
  });

  it('has non-empty required fields on every chunk', () => {
    for (const c of ACADEMY_CORPUS) {
      expect(c.title.trim(), c.id).not.toBe('');
      expect(c.text.trim(), c.id).not.toBe('');
      expect(c.url, c.id).toMatch(/^https:\/\/kevinphillipjohnson\.com\//);
    }
  });

  it('contains no HTML tags', () => {
    const offenders = ACADEMY_CORPUS.filter((c) => /<[a-z/][^>]*>/i.test(c.text));
    expect(offenders.map((c) => c.id)).toEqual([]);
  });

  it('has no absurdly long chunk', () => {
    const offenders = ACADEMY_CORPUS.filter((c) => c.text.length > 12_000);
    expect(offenders.map((c) => c.id)).toEqual([]);
  });

  it('draws every chunk from a page in the manifest', () => {
    const pages = new Set(SOURCES.map((s: { page: string }) => s.page));
    for (const c of ACADEMY_CORPUS) expect(pages.has(c.page), c.id).toBe(true);
  });

  it('covers every manifest page', () => {
    const covered = new Set(ACADEMY_CORPUS.map((c) => c.page));
    for (const s of SOURCES as Array<{ page: string }>) expect(covered.has(s.page), s.page).toBe(true);
  });

  it('excludes the merch and concert-attire pages', () => {
    expect(ACADEMY_CORPUS.some((c) => c.page === 'merch')).toBe(false);
    expect(ACADEMY_CORPUS.some((c) => c.page === 'performance-wear')).toBe(false);
  });

  // Guards against a silent extraction regression: if the site is restructured
  // so a page still yields records but far fewer of them, the ingest succeeds
  // and only this test notices. Floors are ~80% of the 2026-08-04 counts.
  it('holds a plausible chunk count for every page', () => {
    const counts = new Map<string, number>();
    for (const c of ACADEMY_CORPUS) counts.set(c.page, (counts.get(c.page) ?? 0) + 1);

    const FLOORS: Record<string, number> = {
      'conductors-guide': 10, 'conducting-history': 6, conductors: 100,
      spirituals: 7, history: 7, patterns: 5, terms: 6, workbook: 24,
      works: 12, 'minor-works': 12, 'mini-major-works': 12,
      education: 54, church: 20, associations: 7, conventions: 18,
      repertoire: 146,
    };

    for (const [page, floor] of Object.entries(FLOORS)) {
      expect(counts.get(page) ?? 0, page).toBeGreaterThanOrEqual(floor);
    }
  });

  it('answers a representative conducting query', () => {
    const index = buildIndex(ACADEMY_CORPUS);
    const hits = searchAcademy('what is cheironomy', index);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].text.toLowerCase()).toContain('cheironom');
  });

  it('answers a representative terminology query', () => {
    const index = buildIndex(ACADEMY_CORPUS);
    const hits = searchAcademy('what does andante mean', index);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.text.toLowerCase().includes('walking'))).toBe(true);
  });

  it('answers a repertoire query', () => {
    const index = buildIndex(ACADEMY_CORPUS);
    const hits = searchAcademy('Palestrina Sicut Cervus', index);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].chunk.title.toLowerCase()).toContain('sicut cervus');
  });
});
