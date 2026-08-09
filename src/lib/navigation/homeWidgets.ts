// The two widgets a member may keep on the House home, as data so My Space
// can list them. House spec §5.1 caps the home at TWO role widgets — that
// cap is the design, not a limitation: the home answers "what do I do next",
// and a third widget turns it back into a status dashboard.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §5.4
import { WIDGETS_CAP } from './myTools';

export interface HomeWidget {
  key: string;
  label: string;
  description: string;
  roles: Array<'student' | 'faculty'>;
}

export const HOME_WIDGETS: HomeWidget[] = [
  {
    key: 'needs-attention',
    label: 'Needs You',
    description: 'Unexcused absences, unreviewed practice, ticket flags.',
    roles: ['faculty'],
  },
  {
    key: 'today',
    label: 'Today',
    description: "Today's schedule, in order.",
    roles: ['student', 'faculty'],
  },
  {
    key: 'practice-ledger',
    label: 'Practice',
    description: 'Your practice streak, as a staff of quarter notes.',
    roles: ['student'],
  },
];

export function widgetsFor(role: 'student' | 'faculty'): HomeWidget[] {
  return HOME_WIDGETS.filter((w) => w.roles.includes(role));
}

/**
 * Chosen keys narrowed to what `role` may actually have, capped at
 * WIDGETS_CAP, preserving the member's order. An empty or fully-invalid
 * choice falls back to that role's first two — the home always renders two
 * widgets, never zero.
 */
export function resolveWidgets(role: 'student' | 'faculty', chosen: string[]): string[] {
  const allowed = new Set(widgetsFor(role).map((w) => w.key));
  const picked = chosen.filter((k) => allowed.has(k)).slice(0, WIDGETS_CAP);
  if (picked.length > 0) return picked;
  return widgetsFor(role).slice(0, WIDGETS_CAP).map((w) => w.key);
}
