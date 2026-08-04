import { describe, it, expect } from 'vitest';
import { tokenize, buildIndex, searchAcademy } from '../search';
import type { AcademyChunk } from '../types';

const chunk = (id: string, title: string, text: string): AcademyChunk => ({
  id, title, text,
  page: 'terms',
  pageTitle: 'Choral Terminology',
  url: 'https://kevinphillipjohnson.com/academy/terms.html',
});

const CORPUS: AcademyChunk[] = [
  chunk('a', 'Hemiola', 'A hemiola is a rhythmic device where three beats replace two. Common in Baroque choral music.'),
  chunk('b', 'Tempo Markings', 'Largo is very slow and broad. Andante is a walking pace. Presto is very fast.'),
  chunk('c', 'Choir Seating', 'A choir may stand in sections or in mixed formation depending on the ensemble.'),
  chunk('d', 'Baroque Ornamentation', 'Ornamentation in Baroque music includes trills and appoggiaturas sung by the choir.'),
];

describe('tokenize', () => {
  it('lowercases, splits, and drops stopwords and single characters', () => {
    expect(tokenize('What IS the Hemiola?')).toEqual(['hemiola']);
  });

  it('keeps hyphenated and numeric tokens', () => {
    expect(tokenize('19th-century')).toContain('19th-century');
  });

  it('returns an empty array for a query that is all stopwords', () => {
    expect(tokenize('what is the')).toEqual([]);
  });
});

describe('searchAcademy', () => {
  const index = buildIndex(CORPUS);

  it('ranks a title match above a body-only match', () => {
    const hits = searchAcademy('hemiola', index);
    expect(hits[0].chunk.id).toBe('a');
  });

  it('weighs a rare term above a common one', () => {
    // "choir" appears in c and d; "ornamentation" only in d.
    const hits = searchAcademy('choir ornamentation', index);
    expect(hits[0].chunk.id).toBe('d');
  });

  it('returns an empty array when the query is all stopwords', () => {
    expect(searchAcademy('what is the', index)).toEqual([]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(searchAcademy('trombone embouchure', index)).toEqual([]);
  });

  it('respects the limit option', () => {
    const hits = searchAcademy('choir music baroque', index, { limit: 2 });
    expect(hits).toHaveLength(2);
  });

  it('caps total characters and truncates the tail hit', () => {
    const hits = searchAcademy('choir music baroque', index, { maxChars: 120 });
    const total = hits.reduce((n, h) => n + h.text.length, 0);
    expect(total).toBeLessThanOrEqual(120);
    expect(hits.length).toBeGreaterThan(0);
  });

  it('never truncates a chunk to an empty string', () => {
    const hits = searchAcademy('hemiola', index, { maxChars: 10 });
    expect(hits[0].text.length).toBeGreaterThan(0);
  });

  it('leaves chunk.text intact even when the returned text is truncated', () => {
    const hits = searchAcademy('hemiola', index, { maxChars: 30 });
    expect(hits[0].chunk.text).toContain('rhythmic device');
  });

  it('gives an exact phrase match a bonus over scattered terms', () => {
    const hits = searchAcademy('walking pace', index);
    expect(hits[0].chunk.id).toBe('b');
  });
});
