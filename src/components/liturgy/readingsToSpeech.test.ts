import { describe, it, expect } from 'vitest';
import { readingsToSpeech } from './ReadingsModal';
import type { ReadingBlock } from './ReadingsModal';

const block = (heading: string, html: string): ReadingBlock => ({
  heading, citation: 'Cit 1:1', summary: null, html,
});

describe('readingsToSpeech — lector pacing', () => {
  it('marks each reading AFTER the first with a 5s pause on its announcement chunk', () => {
    const chunks = readingsToSpeech([
      block('First reading', '<p>In the beginning.</p>'),
      block('Responsorial Psalm', '<p>The Lord is my shepherd.</p>'),
      block('Gospel', '<p>At that time Jesus said.</p>'),
    ]);
    const announcements = chunks.filter((c) => /reading|Psalm|Gospel/.test(c.text) && /Cit 1:1/.test(c.text));
    expect(announcements).toHaveLength(3);
    expect(announcements[0].pauseBeforeMs).toBeUndefined();
    expect(announcements[1].pauseBeforeMs).toBe(5000);
    expect(announcements[2].pauseBeforeMs).toBe(5000);
  });

  it('never pauses between body chunks within one reading', () => {
    const longBody = `<p>${'A full sentence goes right here. '.repeat(30)}</p>`;
    const chunks = readingsToSpeech([
      block('First reading', longBody),
      block('Gospel', '<p>Short.</p>'),
    ]);
    // Everything between the two announcements is first-reading body — no pauses.
    const gospelIdx = chunks.findIndex((c) => c.text.startsWith('Gospel'));
    expect(gospelIdx).toBeGreaterThan(1);
    for (const c of chunks.slice(1, gospelIdx)) expect(c.pauseBeforeMs).toBeUndefined();
    expect(chunks[gospelIdx].pauseBeforeMs).toBe(5000);
  });
});
