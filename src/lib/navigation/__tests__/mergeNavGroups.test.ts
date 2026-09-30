import { describe, it, expect } from 'vitest';
import { mergeNavGroups, SECTION_GROUP_PREFIX } from '../myTools';

const entry = (key: string) => ({ key });
const section = (name: string, keys: string[]) => ({
  id: `${SECTION_GROUP_PREFIX}${name.toLowerCase()}`,
  name,
  entries: keys.map(entry),
});
const custom = (name: string, keys: string[]) => ({
  id: `custom-${name}`,
  name,
  entries: keys.map(entry),
});

describe('mergeNavGroups', () => {
  it('folds a same-named custom group into the section heading', () => {
    const out = mergeNavGroups(
      [section('Music', ['music-library'])],
      [custom('Music', ['soundcloud', 'librarian'])],
    );
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(`${SECTION_GROUP_PREFIX}music`);
    expect(out[0].entries.map((e) => e.key)).toEqual(['music-library', 'soundcloud', 'librarian']);
  });

  it('matches names case-insensitively and trimmed', () => {
    const out = mergeNavGroups(
      [section('Today', ['calendar'])],
      [custom(' today ', ['notes'])],
    );
    expect(out).toHaveLength(1);
    expect(out[0].entries.map((e) => e.key)).toEqual(['calendar', 'notes']);
  });

  it('keeps unmatched custom groups after the sections, unchanged', () => {
    const make = custom('Make', ['studio']);
    const out = mergeNavGroups([section('Money', ['finance'])], [make]);
    expect(out.map((g) => g.name)).toEqual(['Money', 'Make']);
    expect(out[1]).toBe(make);
  });

  it('dedupes entries by key within a merged heading', () => {
    const out = mergeNavGroups(
      [section('Music', ['music-library'])],
      [custom('Music', ['music-library', 'soundcloud'])],
    );
    expect(out[0].entries.map((e) => e.key)).toEqual(['music-library', 'soundcloud']);
  });

  it('does not mutate the section inputs', () => {
    const s = section('Music', ['music-library']);
    mergeNavGroups([s], [custom('Music', ['soundcloud'])]);
    expect(s.entries.map((e) => e.key)).toEqual(['music-library']);
  });
});
