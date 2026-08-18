import { describe, it, expect } from 'vitest';
import { buildArticleNote } from '../articleNote';

describe('buildArticleNote', () => {
  it('builds a self-contained note from a full extraction', () => {
    const note = buildArticleNote({
      title: 'Choir wins national title',
      url: 'https://example.com/story',
      source: 'Example News',
      published: '2026-08-15T12:00:00Z',
      byline: 'By Ada Writer',
      paragraphs: ['First paragraph.', 'Second paragraph.'],
    });
    expect(note.title).toBe('Choir wins national title');
    // Body carries source attribution, the link, byline, and the full text —
    // the note must stand alone even if the source link dies.
    expect(note.body).toContain('Example News');
    expect(note.body).toContain('https://example.com/story');
    expect(note.body).toContain('By Ada Writer');
    expect(note.body).toContain('First paragraph.');
    expect(note.body).toContain('Second paragraph.');
    expect(note.properties).toEqual({
      source_url: 'https://example.com/story',
      source_name: 'Example News',
      published_at: '2026-08-15T12:00:00Z',
    });
  });

  it('falls back to the feed summary when extraction produced no paragraphs', () => {
    const note = buildArticleNote({
      title: 'Paywalled story',
      url: 'https://example.com/paywalled',
      summary: 'Short RSS summary.',
      paragraphs: [],
    });
    expect(note.body).toContain('Short RSS summary.');
    expect(note.body).toContain('https://example.com/paywalled');
    expect(note.properties).toEqual({ source_url: 'https://example.com/paywalled' });
  });

  it('still produces a useful note with nothing but title and link', () => {
    const note = buildArticleNote({ title: 'Bare item', url: 'https://example.com/x' });
    expect(note.title).toBe('Bare item');
    expect(note.body).toContain('https://example.com/x');
    // No dangling separators or "undefined" from missing fields.
    expect(note.body).not.toMatch(/undefined|null/);
  });
});
