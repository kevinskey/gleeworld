// At-a-glance answer to "what have I actually put in front of the choir?".
// The per-card badge says it one score at a time; this says it for the whole
// list, and each counter doubles as a one-click filter so the follow-up
// ("show me the ones members can't see") is the same control.
import { useMemo } from 'react';
import { Users, UserCheck, EyeOff } from 'lucide-react';
import {
  isSharedWithMembers, isSharedWithSomeOnly, isScoreShared,
  type ScoresSharingFilter,
} from './ScoresFilterBar';
import type { ScoreRow } from './types';

const LANES: Array<{
  key: ScoresSharingFilter;
  label: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  match: (r: ScoreRow) => boolean;
  tone: string;
}> = [
  {
    key: 'members',
    label: 'Shared with members',
    title: 'Every member of this workspace can see these',
    icon: Users,
    match: isSharedWithMembers,
    tone: 'text-emerald-700 dark:text-emerald-400',
  },
  {
    key: 'targeted',
    label: 'Shared with specific people',
    title: 'Visible only to the named people, classes, or voice parts',
    icon: UserCheck,
    match: isSharedWithSomeOnly,
    tone: 'text-sky-700 dark:text-sky-400',
  },
  {
    key: 'unshared',
    label: 'Not shared',
    title: 'Visible only to librarians and admins',
    icon: EyeOff,
    match: (r) => !isScoreShared(r),
    tone: 'text-muted-foreground',
  },
];

export function ScoresSharingSummary({
  rows, sharing, onSharingChange,
}: {
  // Rows matching every filter EXCEPT sharing, so the counters always add up
  // to the list the librarian is looking at.
  rows: ScoreRow[];
  sharing: ScoresSharingFilter | null;
  onSharingChange: (s: ScoresSharingFilter | null) => void;
}) {
  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    LANES.forEach((l) => { out[l.key] = rows.filter(l.match).length; });
    return out;
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Sharing breakdown">
      {LANES.map((lane) => {
        const Icon = lane.icon;
        const isActive = sharing === lane.key;
        return (
          <button
            key={lane.key}
            type="button"
            title={lane.title}
            aria-pressed={isActive}
            onClick={() => onSharingChange(isActive ? null : lane.key)}
            className={
              isActive
                ? 'inline-flex items-center gap-1.5 rounded-full border border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors'
                : 'inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs transition-colors hover:bg-muted'
            }
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? '' : lane.tone}`} />
            <span className="font-semibold tabular-nums">{counts[lane.key]}</span>
            <span className={isActive ? '' : 'text-muted-foreground'}>{lane.label}</span>
          </button>
        );
      })}
    </div>
  );
}
