// Compact practice-dashboard strip.
//
// Previously this was a tall, sparse Card with: name, role badge,
// "Last practiced", "Total practice time", an Assignments block, and a
// "This week / Sessions" footer — most of which read "0h 0m" /
// "Never" / "No assignments" for any user who hadn't been graded yet.
// On wide layouts (Practice Studio sidebar) this dashboard was eating
// half the page for zeroed-out fields.
//
// Reshaped into a single compact horizontal strip of pill-style stats
// that wraps gracefully on small screens. The classroom-themed
// Assignments section is gone — the user explicitly asked for a
// practice tool, not a classroom.

import React from 'react';
import { User, Clock, BookOpen, CalendarDays, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePracticeStats } from '@/hooks/usePracticeStats';

function formatLastPracticed(lastPracticed?: Date) {
  if (!lastPracticed) return 'Never';
  const now = new Date();
  const diffMs = now.getTime() - lastPracticed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return lastPracticed.toLocaleDateString();
}

function formatTotalHours(totalMinutes?: number) {
  if (!totalMinutes) return '0h 0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export const UserInfoCard: React.FC = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);
  const { stats, loading: statsLoading } = usePracticeStats();

  const displayName =
    userProfile?.full_name ||
    userProfile?.first_name ||
    user?.email?.split('@')[0] ||
    'You';

  return (
    <div className="w-full rounded-lg border border-border bg-card px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
      {/* Identity */}
      <div className="flex items-center gap-1.5 font-semibold text-foreground truncate">
        <User className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="truncate">{displayName}</span>
      </div>

      <Stat
        icon={<Clock className="w-3.5 h-3.5" />}
        label="Last"
        value={statsLoading ? '…' : formatLastPracticed(stats?.lastPracticed)}
      />
      <Stat
        icon={<BookOpen className="w-3.5 h-3.5" />}
        label="Total"
        value={statsLoading ? '…' : formatTotalHours(stats?.totalMinutes)}
      />
      <Stat
        icon={<CalendarDays className="w-3.5 h-3.5" />}
        label="Week"
        value={statsLoading ? '…' : formatTotalHours(stats?.thisWeekMinutes)}
      />
      <Stat
        icon={<Activity className="w-3.5 h-3.5" />}
        label="Sessions"
        value={statsLoading ? '…' : String(stats?.totalSessions ?? 0)}
      />
    </div>
  );
};

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <span className="text-muted-foreground/80 shrink-0">{icon}</span>
      <span className="uppercase tracking-wider text-[10px] font-semibold">{label}</span>
      <span className="text-foreground font-medium tabular-nums">{value}</span>
    </div>
  );
}
