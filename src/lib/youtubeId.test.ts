import { describe, it, expect } from 'vitest';
import { getYouTubeId } from './youtubeId';

describe('getYouTubeId', () => {
  it('parses standard watch URLs', () => {
    expect(getYouTubeId('https://www.youtube.com/watch?v=BV8KHvQPyGA')).toBe('BV8KHvQPyGA');
    expect(getYouTubeId('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('parses watch URLs with extra params regardless of order', () => {
    expect(getYouTubeId('https://www.youtube.com/watch?t=42&v=BV8KHvQPyGA&list=PL123')).toBe('BV8KHvQPyGA');
  });
  it('parses youtu.be short links', () => {
    expect(getYouTubeId('https://youtu.be/BV8KHvQPyGA')).toBe('BV8KHvQPyGA');
    expect(getYouTubeId('https://youtu.be/BV8KHvQPyGA?t=30')).toBe('BV8KHvQPyGA');
  });
  it('parses shorts and embed URLs', () => {
    expect(getYouTubeId('https://www.youtube.com/shorts/BV8KHvQPyGA')).toBe('BV8KHvQPyGA');
    expect(getYouTubeId('https://www.youtube-nocookie.com/embed/BV8KHvQPyGA?rel=0')).toBe('BV8KHvQPyGA');
  });
  it('parses music.youtube.com watch URLs', () => {
    expect(getYouTubeId('https://music.youtube.com/watch?v=BV8KHvQPyGA')).toBe('BV8KHvQPyGA');
  });
  it('rejects non-YouTube hosts even with a v param', () => {
    expect(getYouTubeId('https://evil.com/watch?v=BV8KHvQPyGA')).toBeNull();
    expect(getYouTubeId('https://music.apple.com/us/song/123')).toBeNull();
  });
  it('rejects malformed ids and junk', () => {
    expect(getYouTubeId('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(getYouTubeId('not a url')).toBeNull();
    expect(getYouTubeId('')).toBeNull();
    expect(getYouTubeId('https://www.youtube.com/')).toBeNull();
  });
});
