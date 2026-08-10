// Category model for the Command Center calendar. The tenant's real list
// lives in gw_event_categories (useEventCategories); CATEGORY_CONFIGS below
// is only a color/icon fallback for legacy events whose slug isn't in the
// DB anymore.

import type { EventCategory } from '@/hooks/useEventCategories';

export type CategoryFilter =
  | 'glee'
  | 'courses'
  | 'liturgy'
  | 'performances'
  | 'leadership'
  | 'tour'
  | 'personal'
  | 'academic'
  | 'personal_google'
  | 'personal_ios';

export interface CategoryConfig {
  id: CategoryFilter;
  label: string;
  color: string;
  icon: string;
}

// Palette aligned with the Command Center dashboard tints:
//   cyan / orange / amber / purple / rose / teal / emerald / slate (-600).
// These stay as hex literals (not CSS vars) because consumers do hex math on
// them — `${color}1F` alpha suffixes and getContrastTextColor() parsing.
// Fallback for events whose category has no config (legacy/unknown slugs).
export const CATEGORY_FALLBACK_COLOR = '#708090';
export const CATEGORY_CONFIGS: CategoryConfig[] = [
  { id: 'glee',         label: 'Glee Club',           color: '#0891b2', icon: 'music' },
  { id: 'courses',      label: 'Courses',             color: '#ea580c', icon: 'book-open' },
  { id: 'academic',     label: 'Assignments & Tests', color: '#d97706', icon: 'clipboard' },
  { id: 'liturgy',      label: 'Liturgy',             color: '#9333ea', icon: 'church' },
  { id: 'performances', label: 'Performances',        color: '#e11d48', icon: 'mic' },
  { id: 'leadership',   label: 'Leadership',          color: '#0d9488', icon: 'users' },
  { id: 'tour',         label: 'Tour',                color: '#059669', icon: 'plane' },
  { id: 'personal',     label: 'Personal',            color: '#475569', icon: 'user' },
  // Personal overlays — slate, distinct from the tenant palette so they
  // read as "from outside" at a glance.
  { id: 'personal_google', label: 'My Google events', color: '#64748b', icon: 'user' },
  { id: 'personal_ios',    label: 'My iPhone events', color: '#64748b', icon: 'user' },
];

// The filter rail and grid views read from the tenant's actual category
// list, plus synthetic per-user overlay toggles. Overlay entries only appear
// when the user actually has imported events — other tenant members never
// see them because RLS gates the underlying data per-user.
export function buildLiveCategories(
  dbCategories: EventCategory[],
  overlays: { hasGoogle: boolean; hasIos: boolean },
): CategoryConfig[] {
  return [
    ...dbCategories.map((c) => ({
      id: c.slug as CategoryFilter,
      label: c.label,
      color: c.color,
      icon: c.icon,
    })),
    ...(overlays.hasGoogle
      ? [{ id: 'personal_google' as CategoryFilter, label: 'My Google events', color: '#64748b', icon: 'user' }]
      : []),
    ...(overlays.hasIos
      ? [{ id: 'personal_ios' as CategoryFilter, label: 'My iPhone events', color: '#64748b', icon: 'user' }]
      : []),
  ];
}

// A slug appearing for the first time (custom category created, overlay
// import landing) starts toggled ON; slugs the user already unchecked stay
// off. Returns the incoming references untouched when nothing new appeared
// so callers can setState without looping.
export function syncActiveCategoryFilters(
  active: CategoryFilter[],
  known: string[],
  liveSlugs: string[],
): { active: CategoryFilter[]; known: string[] } {
  const fresh = liveSlugs.filter((s) => !known.includes(s));
  if (fresh.length === 0) return { active, known };
  return {
    active: [...active, ...(fresh as CategoryFilter[])],
    known: [...known, ...fresh],
  };
}

export function resolveCategoryColor(
  slug: string,
  liveCategories: CategoryConfig[],
): string {
  const live = liveCategories.find((c) => c.id === slug);
  if (live) return live.color;
  const builtin = CATEGORY_CONFIGS.find((c) => c.id === slug);
  return builtin?.color || CATEGORY_FALLBACK_COLOR;
}
