import { describe, it, expect } from 'vitest';
import { resolveBook } from './books';

describe('resolveBook', () => {
  it('resolves plain and numbered book names', () => {
    expect(resolveBook('Isaiah')?.usfmCode).toBe('ISA');
    expect(resolveBook('1 Corinthians')?.usfmCode).toBe('1CO');
    expect(resolveBook('2 Samuel')?.usfmCode).toBe('2SA');
  });

  it('resolves deuterocanonical books present in WEBCE', () => {
    expect(resolveBook('Sirach')?.usfmCode).toBe('SIR');
    expect(resolveBook('Wisdom')?.usfmCode).toBe('WIS');
    expect(resolveBook('Tobit')?.usfmCode).toBe('TOB');
    expect(resolveBook('Baruch')?.usfmCode).toBe('BAR');
    expect(resolveBook('1 Maccabees')?.usfmCode).toBe('1MA');
  });

  it('is case- and whitespace-insensitive', () => {
    expect(resolveBook('  song of songs ')?.usfmCode).toBe('SNG');
  });

  // Jude 17, Philemon 7-20, 2 John 4-9, 3 John 5-8 all cite VERSES with no
  // chapter. The parser needs to know which books behave this way.
  it('flags single-chapter books', () => {
    for (const n of ['Jude', 'Philemon', 'Obadiah', '2 John', '3 John']) {
      expect(resolveBook(n)?.singleChapter, `${n} should be single-chapter`).toBe(true);
    }
    expect(resolveBook('Genesis')?.singleChapter).toBe(false);
  });

  it('returns null for an unknown name rather than guessing', () => {
    expect(resolveBook('Book of Mormon')).toBeNull();
    expect(resolveBook('')).toBeNull();
  });
});
