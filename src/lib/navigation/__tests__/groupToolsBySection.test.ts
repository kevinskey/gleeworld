import { describe, it, expect } from 'vitest';
import { groupToolsBySection, isSectionGroupId } from '../myTools';
import { NAV_SECTION_LABELS } from '../navCatalog';

const ORDER = Object.keys(NAV_SECTION_LABELS);
const tool = (key: string, section: string) => ({ key, section });

describe('groupToolsBySection', () => {
  it('files each tool under its own section heading', () => {
    const out = groupToolsBySection(
      [tool('music-library', 'music'), tool('calendar', 'today')],
      ORDER, NAV_SECTION_LABELS,
    );
    expect(out.map((g) => g.name)).toEqual(['Today', 'Music']);
    expect(out[1].entries.map((e) => e.key)).toEqual(['music-library']);
  });

  it('orders sections by the catalog, not by when tools were added', () => {
    // Otherwise the nav reshuffles every time someone adds an app.
    const out = groupToolsBySection(
      [tool('finance', 'money'), tool('bible', 'church'), tool('calendar', 'today')],
      ORDER, NAV_SECTION_LABELS,
    );
    expect(out.map((g) => g.name)).toEqual(['Today', 'Church', 'Money']);
  });

  it('never emits an empty section', () => {
    const out = groupToolsBySection([tool('calendar', 'today')], ORDER, NAV_SECTION_LABELS);
    expect(out).toHaveLength(1);
    expect(out.every((g) => g.entries.length > 0)).toBe(true);
  });

  it('keeps several tools from one section together, in order', () => {
    const out = groupToolsBySection(
      [tool('music-library', 'music'), tool('part-tracks', 'music'), tool('studio', 'music')],
      ORDER, NAV_SECTION_LABELS,
    );
    expect(out).toHaveLength(1);
    expect(out[0].entries.map((e) => e.key)).toEqual(['music-library', 'part-tracks', 'studio']);
  });

  it('handles an empty shelf', () => {
    expect(groupToolsBySection([], ORDER, NAV_SECTION_LABELS)).toEqual([]);
  });

  it('marks derived groups so their collapse state is never saved', () => {
    // A section heading is not one of the member's own groups — writing to
    // it would corrupt their saved record.
    const [group] = groupToolsBySection([tool('calendar', 'today')], ORDER, NAV_SECTION_LABELS);
    expect(isSectionGroupId(group.id)).toBe(true);
    expect(isSectionGroupId('my-own-group')).toBe(false);
  });

  it('falls back to the raw key for an unknown section', () => {
    const out = groupToolsBySection([tool('x', 'mystery')], ['mystery'], NAV_SECTION_LABELS);
    expect(out[0].name).toBe('mystery');
  });
});
