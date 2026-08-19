import { describe, it, expect } from 'vitest';
import { slugify, renderFacets, recordToChunk } from '../normalize.mjs';

const ctx = {
  page: 'conductors',
  pageTitle: 'Conductors Directory',
  url: 'https://kevinphillipjohnson.com/academy/conductors.html',
};

// Copied verbatim from the live conductors.html DATA array.
const conductor = {
  id: 'kevin-p-johnson',
  name: 'Kevin P. Johnson',
  role: 'Composer, conductor, educator, liturgical consultant, publisher',
  affiliation: 'Spelman College (Assoc. Prof.); Lyke House Catholic Center (Dir. of Music)',
  location: 'Atlanta, GA',
  bio: 'Composer-conductor-educator in the Black sacred music tradition.',
  publishers: ['Carl Fischer', 'GIA', 'Colla Voce'],
  photo: '',
  tags: ['black-sacred', 'composer-arranger'],
};

// Shape copied from the live terms.html TERM_CATEGORIES array.
const termCategory = {
  id: 'tempo',
  name: 'Tempo Markings',
  description: 'Speed indications from slowest to fastest',
  terms: [
    { term: 'Largo', pronunciation: 'LAR-go', meaning: 'Very slow and broad', bpm: '40–60' },
    { term: 'Grave', pronunciation: 'GRAH-veh', meaning: 'Very slow and solemn', bpm: '25–45' },
  ],
};

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Robert Nathaniel Dett')).toBe('robert-nathaniel-dett');
  });

  it('strips punctuation and collapses separators', () => {
    expect(slugify('Old American Songs (Set 1)')).toBe('old-american-songs-set-1');
  });

  it('strips diacritics', () => {
    expect(slugify('Mirga Gražinytė-Tyla')).toBe('mirga-grazinyte-tyla');
  });
});

describe('renderFacets', () => {
  it('labels each field and joins with newlines', () => {
    const out = renderFacets(conductor, ['role', 'location']);
    expect(out).toBe('Role: Composer, conductor, educator, liturgical consultant, publisher\nLocation: Atlanta, GA');
  });

  it('renders a string array as a comma list', () => {
    expect(renderFacets(conductor, ['publishers'])).toBe('Publishers: Carl Fischer, GIA, Colla Voce');
  });

  it('renders an array of objects as one line per item', () => {
    const out = renderFacets(termCategory, ['terms']);
    expect(out).toContain('Largo — LAR-go — Very slow and broad — 40–60');
    expect(out).toContain('Grave');
  });

  it('omits empty, null, and missing fields', () => {
    expect(renderFacets(conductor, ['photo', 'missing'])).toBe('');
  });

  it('humanizes snake_case field names', () => {
    const out = renderFacets({ key_signature: 'G Dorian', beats_num: 5 }, ['key_signature', 'beats_num']);
    expect(out).toBe('Key signature: G Dorian\nBeats num: 5');
  });

  it('renders the DOM-mode body field with no label prefix', () => {
    const out = renderFacets({ body: 'American Choral Directors Association' }, ['body']);
    expect(out).toBe('American Choral Directors Association');
  });
});

describe('recordToChunk', () => {
  it('builds a chunk from a flat record', () => {
    const chunk = recordToChunk(conductor, {
      titleField: 'name',
      fields: ['role', 'affiliation', 'location', 'bio', 'publishers'],
    }, ctx);
    expect(chunk.id).toBe('conductors/kevin-p-johnson');
    expect(chunk.title).toBe('Kevin P. Johnson');
    expect(chunk.page).toBe('conductors');
    expect(chunk.pageTitle).toBe('Conductors Directory');
    expect(chunk.url).toBe(ctx.url);
    expect(chunk.text).toContain('Black sacred music tradition');
    expect(chunk.text).toContain('Publishers: Carl Fischer');
  });

  it('prefers the record id over a slugified title when idField is set', () => {
    const chunk = recordToChunk(conductor, {
      titleField: 'name', idField: 'id', fields: ['bio'],
    }, ctx);
    expect(chunk.id).toBe('conductors/kevin-p-johnson');
  });

  it('flattens a nested item array into the parent chunk', () => {
    const chunk = recordToChunk(termCategory, {
      titleField: 'name', fields: ['description', 'terms'],
    }, { page: 'terms', pageTitle: 'Choral Terminology', url: 'https://example.test/terms.html' });
    expect(chunk.id).toBe('terms/tempo-markings');
    expect(chunk.text).toContain('Very slow and broad');
    expect(chunk.text).toContain('Grave');
  });

  it('contains no HTML tags', () => {
    const chunk = recordToChunk(
      { name: 'Test', bio: 'A <em>bold</em> claim &amp; more' },
      { titleField: 'name', fields: ['bio'] }, ctx,
    );
    expect(chunk.text).not.toMatch(/<[^>]+>/);
    expect(chunk.text).toContain('bold');
    expect(chunk.text).toContain('&');
  });

  it('returns null when a record yields no text', () => {
    const chunk = recordToChunk({ name: 'Empty', bio: '' }, { titleField: 'name', fields: ['bio'] }, ctx);
    expect(chunk).toBeNull();
  });

  it('returns null when the title field is missing', () => {
    expect(recordToChunk({ bio: 'orphan' }, { titleField: 'name', fields: ['bio'] }, ctx)).toBeNull();
  });
});

describe('groupLabel', () => {
  const cfg = { groupLabel: 'Grading breakdown', titleField: 'category', fields: ['percentage', 'description'] };
  const record = { category: 'Exams', percentage: 20, description: 'Conducting exams for each musical period' };
  const wctx = { page: 'workbook', pageTitle: 'Conducting Workbook', url: 'https://example.test/workbook.html' };

  it('prefixes the title with the container name so the group is searchable', () => {
    const chunk = recordToChunk(record, cfg, wctx);
    expect(chunk.title).toBe('Grading breakdown — Exams');
  });

  it('folds the label into the id', () => {
    expect(recordToChunk(record, cfg, wctx).id).toBe('workbook/grading-breakdown-exams');
  });

  it('leaves the title bare when no groupLabel is set', () => {
    const chunk = recordToChunk(record, { titleField: 'category', fields: ['description'] }, wctx);
    expect(chunk.title).toBe('Exams');
  });
});
