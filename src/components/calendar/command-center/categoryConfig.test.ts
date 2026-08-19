import { describe, it, expect } from 'vitest';
import {
  buildLiveCategories,
  mergeWithBuiltinConfigs,
  syncActiveCategoryFilters,
  resolveCategoryColor,
  isCategoryVisible,
  CATEGORY_CONFIGS,
  CATEGORY_FALLBACK_COLOR,
  type CategoryFilter,
} from './categoryConfig';
import type { EventCategory } from '@/hooks/useEventCategories';

const dbCat = (slug: string, overrides: Partial<EventCategory> = {}): EventCategory => ({
  id: `id-${slug}`,
  slug,
  label: slug,
  color: '#123456',
  icon: 'tag',
  position: 100,
  is_default: false,
  ...overrides,
});

describe('buildLiveCategories', () => {
  it('maps tenant DB categories to configs in order', () => {
    const result = buildLiveCategories(
      [dbCat('glee', { label: 'Glee Club', color: '#0891b2', icon: 'music' }), dbCat('bake-sale', { label: 'Bake Sale', color: '#ff00aa' })],
      { hasGoogle: false, hasIos: false },
    );
    expect(result).toEqual([
      { id: 'glee', label: 'Glee Club', color: '#0891b2', icon: 'music' },
      { id: 'bake-sale', label: 'Bake Sale', color: '#ff00aa', icon: 'tag' },
    ]);
  });

  it('appends a My Google events toggle only when Google events exist', () => {
    const without = buildLiveCategories([], { hasGoogle: false, hasIos: false });
    const withGoogle = buildLiveCategories([], { hasGoogle: true, hasIos: false });
    expect(without.find((c) => c.id === 'personal_google')).toBeUndefined();
    expect(withGoogle.find((c) => c.id === 'personal_google')).toMatchObject({ label: 'My Google events' });
  });

  it('appends a My iPhone events toggle only when iOS events exist', () => {
    const without = buildLiveCategories([], { hasGoogle: false, hasIos: false });
    const withIos = buildLiveCategories([], { hasGoogle: false, hasIos: true });
    expect(without.find((c) => c.id === 'personal_ios')).toBeUndefined();
    expect(withIos.find((c) => c.id === 'personal_ios')).toMatchObject({ label: 'My iPhone events' });
  });

  it('skips the overlay entry when a tenant category already uses its slug', () => {
    const result = buildLiveCategories(
      [dbCat('personal_google', { label: 'Google Stuff', color: '#00ff00' })],
      { hasGoogle: true, hasIos: false },
    );
    expect(result.filter((c) => c.id === 'personal_google')).toHaveLength(1);
    expect(result[0].label).toBe('Google Stuff');
  });
});

describe('mergeWithBuiltinConfigs', () => {
  it('returns the builtins when the live list is empty (cold load)', () => {
    expect(mergeWithBuiltinConfigs([])).toEqual(CATEGORY_CONFIGS);
  });

  it('keeps the live entry when it shares an id with a builtin', () => {
    const live = [{ id: 'glee' as CategoryFilter, label: 'Glee Club', color: '#ff0000', icon: 'music' }];
    const merged = mergeWithBuiltinConfigs(live);
    expect(merged.filter((c) => c.id === 'glee')).toHaveLength(1);
    expect(merged.find((c) => c.id === 'glee')!.color).toBe('#ff0000');
  });

  it('lists live entries first, then the remaining builtins', () => {
    const live = [{ id: 'bake-sale' as CategoryFilter, label: 'Bake Sale', color: '#ff00aa', icon: 'tag' }];
    const merged = mergeWithBuiltinConfigs(live);
    expect(merged[0].id).toBe('bake-sale');
    expect(merged).toHaveLength(1 + CATEGORY_CONFIGS.length);
  });
});

describe('syncActiveCategoryFilters', () => {
  it('activates a slug the first time it appears', () => {
    const result = syncActiveCategoryFilters(['glee'], ['glee'], ['glee', 'bake-sale']);
    expect(result.active).toEqual(['glee', 'bake-sale']);
    expect(result.known).toEqual(['glee', 'bake-sale']);
  });

  it('does not re-activate a known slug the user toggled off', () => {
    // 'tour' is known but not active (user unchecked it); a new slug appears.
    const result = syncActiveCategoryFilters(['glee'], ['glee', 'tour'], ['glee', 'tour', 'bake-sale']);
    expect(result.active).toEqual(['glee', 'bake-sale']);
    expect(result.active).not.toContain('tour');
  });

  it('returns the same references when nothing new appeared', () => {
    const active: CategoryFilter[] = ['glee', 'tour'];
    const known = ['glee', 'tour'];
    const result = syncActiveCategoryFilters(active, known, ['glee', 'tour']);
    expect(result.active).toBe(active);
    expect(result.known).toBe(known);
  });
});

describe('resolveCategoryColor', () => {
  it('prefers the live tenant category color', () => {
    const live = [{ id: 'glee' as const, label: 'Glee Club', color: '#ff0000', icon: 'music' }];
    expect(resolveCategoryColor('glee', live)).toBe('#ff0000');
  });

  it('falls back to the built-in config for legacy slugs missing from the live list', () => {
    const builtin = CATEGORY_CONFIGS.find((c) => c.id === 'tour')!;
    expect(resolveCategoryColor('tour', [])).toBe(builtin.color);
  });

  it('falls back to the neutral color for unknown slugs', () => {
    expect(resolveCategoryColor('mystery-slug', [])).toBe(CATEGORY_FALLBACK_COLOR);
  });

  it('treats an empty-string live color as missing and keeps falling back', () => {
    const live = [
      { id: 'glee' as CategoryFilter, label: 'Glee Club', color: '', icon: 'music' },
      { id: 'bake-sale' as CategoryFilter, label: 'Bake Sale', color: '', icon: 'tag' },
    ];
    const builtin = CATEGORY_CONFIGS.find((c) => c.id === 'glee')!;
    expect(resolveCategoryColor('glee', live)).toBe(builtin.color);
    expect(resolveCategoryColor('bake-sale', live)).toBe(CATEGORY_FALLBACK_COLOR);
  });
});

describe('isCategoryVisible', () => {
  const chipSlugs = ['glee', 'tour'];

  it('shows a category the user has active', () => {
    expect(isCategoryVisible('glee', ['glee'], chipSlugs)).toBe(true);
  });

  it('hides a category with a chip the user toggled off', () => {
    expect(isCategoryVisible('tour', ['glee'], chipSlugs)).toBe(false);
  });

  it('always shows orphaned slugs that have no chip to control them', () => {
    // Category row deleted after events were tagged with it: no chip exists,
    // so hiding the events would make them unreachable.
    expect(isCategoryVisible('bake-sale', ['glee'], chipSlugs)).toBe(true);
  });
});
