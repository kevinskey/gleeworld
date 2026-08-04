// Person-groups + priority lists live under chart.settings.groups so they
// travel with the chart (persist across arrangement switches). Pure helpers
// only — the caller decides how to persist (patchChart).
import type { SeatingChart } from '@/types/seatingCharts';

export type GroupKind = 'keep_together' | 'separate' | 'front_row' | 'accessibility';

export interface PersonGroup {
  id: string;
  name: string;
  kind: GroupKind;
  member_user_ids: string[];
}

export const GROUP_KIND_LABEL: Record<GroupKind, string> = {
  keep_together: 'Keep together',
  separate: 'Separate',
  front_row: 'Front row priority',
  accessibility: 'Accessibility priority',
};

export function getGroups(chart: SeatingChart): PersonGroup[] {
  const raw = chart.settings?.groups;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g): g is PersonGroup =>
      !!g && typeof g === 'object'
      && typeof (g as PersonGroup).id === 'string'
      && typeof (g as PersonGroup).name === 'string'
      && Array.isArray((g as PersonGroup).member_user_ids))
    .map((g) => ({ ...g, kind: (g.kind ?? 'keep_together') as GroupKind }));
}

export function groupsOfKind(chart: SeatingChart, kind: GroupKind): PersonGroup[] {
  return getGroups(chart).filter((g) => g.kind === kind);
}

function nextId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function upsertGroup(chart: SeatingChart, group: PersonGroup): Partial<SeatingChart> {
  const existing = getGroups(chart);
  const nextGroups = existing.some((g) => g.id === group.id)
    ? existing.map((g) => (g.id === group.id ? group : g))
    : [...existing, group];
  return { settings: { ...(chart.settings ?? {}), groups: nextGroups } };
}

export function createGroup(chart: SeatingChart, name: string, kind: GroupKind): {
  patch: Partial<SeatingChart>;
  group: PersonGroup;
} {
  const group: PersonGroup = { id: nextId('grp'), name, kind, member_user_ids: [] };
  return { patch: upsertGroup(chart, group), group };
}

export function renameGroup(chart: SeatingChart, id: string, name: string): Partial<SeatingChart> {
  const existing = getGroups(chart);
  const next = existing.map((g) => (g.id === id ? { ...g, name } : g));
  return { settings: { ...(chart.settings ?? {}), groups: next } };
}

export function deleteGroup(chart: SeatingChart, id: string): Partial<SeatingChart> {
  const existing = getGroups(chart);
  const next = existing.filter((g) => g.id !== id);
  return { settings: { ...(chart.settings ?? {}), groups: next } };
}

export function addMember(chart: SeatingChart, groupId: string, userId: string): Partial<SeatingChart> {
  const existing = getGroups(chart);
  const next = existing.map((g) =>
    g.id === groupId && !g.member_user_ids.includes(userId)
      ? { ...g, member_user_ids: [...g.member_user_ids, userId] }
      : g,
  );
  return { settings: { ...(chart.settings ?? {}), groups: next } };
}

export function removeMember(chart: SeatingChart, groupId: string, userId: string): Partial<SeatingChart> {
  const existing = getGroups(chart);
  const next = existing.map((g) =>
    g.id === groupId ? { ...g, member_user_ids: g.member_user_ids.filter((u) => u !== userId) } : g,
  );
  return { settings: { ...(chart.settings ?? {}), groups: next } };
}
