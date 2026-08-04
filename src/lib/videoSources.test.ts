import { describe, it, expect } from 'vitest';
import { parseVideoSource, youTubeSource } from './videoSources';

describe('youTubeSource', () => {
  it('builds canonical, embed, and thumbnail URLs from a video id', () => {
    expect(youTubeSource('abc123')).toEqual({
      provider: 'youtube',
      videoId: 'abc123',
      embedUrl: 'https://www.youtube.com/embed/abc123',
      canonicalUrl: 'https://www.youtube.com/watch?v=abc123',
      thumbnailUrl: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
    });
  });

  // The whole point of moving youTubeSource next to parseVideoSource: one
  // definition, so a change to the embed/thumbnail shape can't apply to a
  // pasted URL but not to a header-search pick (or vice versa).
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ?si=tracking',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    // NB: a BARE 11-char id is not a parseVideoSource input — getYouTubeId
    // requires a URL, and parseYouTubeInput handles bare ids upstream.
  ])('parseVideoSource(%s) returns exactly youTubeSource(id)', (input) => {
    expect(parseVideoSource(input)).toEqual(youTubeSource('dQw4w9WgXcQ'));
  });
});

// Guards the move against a regression in any OTHER provider branch, since
// parseVideoSource is shared well beyond the /video page.
describe('parseVideoSource — non-YouTube providers are untouched', () => {
  it('parses Vimeo', () => {
    expect(parseVideoSource('https://vimeo.com/123456789')).toEqual({
      provider: 'vimeo',
      videoId: '123456789',
      embedUrl: 'https://player.vimeo.com/video/123456789',
      canonicalUrl: 'https://vimeo.com/123456789',
      thumbnailUrl: null,
    });
  });

  it('parses a direct file URL', () => {
    const src = parseVideoSource('https://cdn.example.com/clips/concert.mp4');
    expect(src?.provider).toBe('direct');
    expect(src?.embedUrl).toBe('https://cdn.example.com/clips/concert.mp4');
    expect(src?.thumbnailUrl).toBeNull();
  });

  it('returns null for junk', () => {
    expect(parseVideoSource('not a url')).toBeNull();
    expect(parseVideoSource('   ')).toBeNull();
  });
});
