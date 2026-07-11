import { describe, expect, it } from 'vitest';
import {
  entityRoute, extractEntityRefs, extractTags, extractWikiLinks, isDateKeyTarget,
} from '../wikiLinks';

describe('extractWikiLinks', () => {
  it('finds targets, dedupes case-insensitively, keeps order', () => {
    const links = extractWikiLinks(
      'See [[Fall Concert]] and [[2026-10-17]]; also [[fall concert]] again and [[Spelman Glee Club]].',
    );
    expect(links.map((l) => l.target)).toEqual(['Fall Concert', '2026-10-17', 'Spelman Glee Club']);
  });

  it('ignores empty and nested brackets', () => {
    expect(extractWikiLinks('[[ ]] and [[a[[b]]c]]')).toEqual([{ target: 'b' }]);
  });
});

describe('extractTags', () => {
  it('finds #tags with nesting and dedupes lowercased', () => {
    expect(extractTags('Plan #concert and #Rehearsal, also #music-library/choral #concert'))
      .toEqual(['concert', 'rehearsal', 'music-library/choral']);
  });

  it('does not match mid-word hashes', () => {
    expect(extractTags('measure#3')).toEqual([]);
  });
});

describe('entity refs', () => {
  const id = '123e4567-e89b-12d3-a456-426614174000';
  it('parses gleeworld:// links', () => {
    const refs = extractEntityRefs(`gleeworld://concert_program/${id} plus text`);
    expect(refs).toEqual([{ entityType: 'concert_program', entityId: id }]);
  });

  it('maps to app routes', () => {
    expect(entityRoute({ entityType: 'course', entityId: id })).toBe(`/academy/courses/${id}`);
  });
});

describe('isDateKeyTarget', () => {
  it('recognizes period keys', () => {
    for (const k of ['2026-10-17', '2026-W42', '2026-10', '2026-Q4', '2026']) {
      expect(isDateKeyTarget(k)).toBe(true);
    }
    expect(isDateKeyTarget('Fall Concert')).toBe(false);
  });
});
