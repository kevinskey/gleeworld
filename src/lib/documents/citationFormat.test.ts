import { describe, it, expect } from 'vitest';
import { formatInText, formatReference, buildWorksCited } from './citationFormat';
import type { DocSource } from './types';

const southern: DocSource = { id: '1', type: 'book',
  authors: [{ family: 'Southern', given: 'Eileen' }],
  title: 'The Music of Black Americans: A History',
  publisher: 'W. W. Norton', year: '1997' };

const journal: DocSource = { id: '2', type: 'journal',
  authors: [{ family: 'Burnim', given: 'Mellonee' }],
  title: 'The Black Gospel Music Tradition', container: 'Western Journal of Black Studies',
  volume: '9', issue: '2', year: '1985', pages: '106-111' };

const site: DocSource = { id: '3', type: 'website',
  authors: [], title: 'Spirituals', container: 'Library of Congress',
  year: '2021', url: 'https://www.loc.gov/spirituals', accessed: '2026-08-11' };

const flat = (segs: {text: string}[]) => segs.map(s => s.text).join('');

describe('MLA 9', () => {
  it('in-text with page', () => expect(formatInText(southern, 'mla9', '132')).toBe('(Southern 132)'));
  it('in-text without page', () => expect(formatInText(southern, 'mla9')).toBe('(Southern)'));
  it('no-author in-text falls back to short title', () =>
    expect(formatInText(site, 'mla9')).toBe('("Spirituals")'));
  it('book reference', () =>
    expect(flat(formatReference(southern, 'mla9')))
      .toBe('Southern, Eileen. The Music of Black Americans: A History. W. W. Norton, 1997.'));
  it('book title segment is italic', () =>
    expect(formatReference(southern, 'mla9').find(s => s.italic)?.text)
      .toBe('The Music of Black Americans: A History'));
  it('journal reference', () =>
    expect(flat(formatReference(journal, 'mla9')))
      .toBe('Burnim, Mellonee. "The Black Gospel Music Tradition." Western Journal of Black Studies, vol. 9, no. 2, 1985, pp. 106-111.'));
  it('website reference', () =>
    expect(flat(formatReference(site, 'mla9')))
      .toBe('"Spirituals." Library of Congress, 2021, https://www.loc.gov/spirituals. Accessed 11 Aug. 2026.'));
  it('two authors', () => {
    const two = { ...southern, authors: [{ family: 'A', given: 'X' }, { family: 'B', given: 'Y' }] };
    expect(formatInText(two, 'mla9', '3')).toBe('(A and B 3)');
    expect(flat(formatReference(two, 'mla9'))).toContain('A, X, and Y B.');
  });
  it('three+ authors use et al.', () => {
    const three = { ...southern, authors: [{ family: 'A', given: 'X' }, { family: 'B', given: 'Y' }, { family: 'C', given: 'Z' }] };
    expect(formatInText(three, 'mla9')).toBe('(A et al.)');
    expect(flat(formatReference(three, 'mla9'))).toContain('A, X, et al.');
  });
});

describe('APA 7', () => {
  it('in-text with page', () => expect(formatInText(southern, 'apa7', '132')).toBe('(Southern, 1997, p. 132)'));
  it('in-text without page', () => expect(formatInText(southern, 'apa7')).toBe('(Southern, 1997)'));
  it('book reference uses initials', () =>
    expect(flat(formatReference(southern, 'apa7')))
      .toBe('Southern, E. (1997). The Music of Black Americans: A History. W. W. Norton.'));
  it('two authors ampersand', () => {
    const two = { ...southern, authors: [{ family: 'A', given: 'Xa' }, { family: 'B', given: 'Yb' }] };
    expect(formatInText(two, 'apa7')).toBe('(A & B, 1997)');
  });
});

describe('buildWorksCited', () => {
  it('sorts by author family then title, no-author sorts by title', () => {
    const out = buildWorksCited([site, southern, journal], 'mla9');
    expect(out.map(o => o.source.id)).toEqual(['2', '1', '3']); // Burnim, Southern, "Spirituals"
  });
});
