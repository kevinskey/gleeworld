import { describe, it, expect } from 'vitest';
import { sanitizeFilename } from '../exportMix';

// OfflineAudioContext doesn't exist in jsdom, so the render path is
// exercised in the browser; here we pin the filename rules that decide
// what lands in the user's Downloads folder.
describe('sanitizeFilename', () => {
  it('strips filesystem-hostile characters', () => {
    expect(sanitizeFilename('A Choice: To Change / The World?')).toBe('A Choice- To Change - The World-');
  });
  it('collapses whitespace runs', () => {
    expect(sanitizeFilename('My   Song\t Mix')).toBe('My Song Mix');
  });
  it('falls back when nothing printable remains', () => {
    expect(sanitizeFilename('   ')).toBe('part-tracks');
  });
});
