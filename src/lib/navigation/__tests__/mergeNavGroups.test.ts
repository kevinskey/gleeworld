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

  it('orders headings by the member group order, leftover sections after', () => {
    const make = custom('Make', ['studio']);
    const out = mergeNavGroups([section('Money', ['finance'])], [make]);
    expect(out.map((g) => g.name)).toEqual(['Make', 'Money']);
    expect(out[0]).toBe(make);
  });

  it('a merged heading takes its member group position, not the catalog slot', () => {
    const out = mergeNavGroups(
      [section('Today', ['calendar']), section('Music', ['music-library'])],
      [custom('Music', ['soundcloud']), custom('Admin', ['settings'])],
    );
    // Music claimed first by the member's order, Admin standalone next,
    // then Today (unclaimed) in catalog order.
    expect(out.map((g) => g.name)).toEqual(['Music', 'Admin', 'Today']);
    expect(out[0].entries.map((e) => e.key)).toEqual(['music-library', 'soundcloud']);
  });

  it('a member with no groups sees pure catalog order, unchanged', () => {
    const out = mergeNavGroups(
      [section('Today', ['calendar']), section('Music', ['music-library'])],
      [],
    );
    expect(out.map((g) => g.name)).toEqual(['Today', 'Music']);
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
