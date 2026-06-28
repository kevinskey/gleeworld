// Command Center — daily operational overview for directors, instructors,
// and students. Renders a four-tile stat row, a three-column middle band
// (today's schedule, recent announcements, needs-your-attention), and a
// three-column footer (upcoming events, quick actions, activity feed).
//
// Data flow: one tenant-scoped Postgres VIEW (v_command_center_feed) unions
// four sources into one row stream:
//   • urgent_task  / missing_attendance
//   • urgent_task  / unread_messages
//   • schedule     / event
//   • schedule     / session
//   • announcement / announcement
// Multi-tenant safety lives in the view (security_invoker=on + explicit
// tenant_id = current_tenant_id() filters). The frontend just reads.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import {
  Calendar,
  CalendarPlus,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileSignature,
  Loader2,
  MapPin,
  Megaphone,
  MessageSquare,
  Mic,
  Music,
  Send,
  Users,
  Video,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useUserRole } from '@/hooks/useUserRole';

// ── Row shape returned by v_command_center_feed ─────────────────────────────

interface FeedRow {
  section: 'urgent_task' | 'schedule' | 'announcement';
  subtype: 'missing_attendance' | 'unread_messages' | 'event' | 'session' | 'announcement' | 'practice_recording';
  id: string;
  title: string;
  detail: string | null;
  event_at: string;
  severity: 'high' | 'medium' | 'low' | null;
  meta: Record<string, unknown> | null;
}

// ── Time/format helpers ─────────────────────────────────────────────────────

function relativeAge(iso: string): string {
  try { return formatDistanceToNow(parseISO(iso), { addSuffix: true }); }
  catch { return ''; }
}
function formatTime(iso: string): string {
  try { return format(parseISO(iso), 'h:mm a'); }
  catch { return ''; }
}

// Dot color for the timeline rail in Today's Schedule.
function scheduleDot(subtype: FeedRow['subtype']): string {
  if (subtype === 'event') return 'bg-purple-500';
  if (subtype === 'session') return 'bg-emerald-500';
  return 'bg-muted-foreground';
}

// Soft card surface used across the dashboard: rounded-2xl, no harsh border,
// gentle diffused shadow. The base Card component's default variant adds
// `shadow-card`, which Tailwind compiles to use hsl(var(--card)) as the
// shadow COLOR — i.e. white on a white card, making any class-based shadow
// invisible. We bypass the cascade with an inline style.
const SOFT_CARD = 'border-0 rounded-2xl';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 4px 10px rgba(15,23,42,0.10), 0 16px 32px -8px rgba(15,23,42,0.22)',
};
const SOFT_CARD_STYLE_AMBER: React.CSSProperties = {
  boxShadow: '0 4px 10px rgba(180,83,9,0.12), 0 16px 32px -8px rgba(180,83,9,0.24)',
};
// Cap card heights at every breakpoint INCLUDING desktop. Without the
// lg cap, `items-stretch` on the row was making shallow cards (like an
// empty announcements panel) match the tallest card in the row,
// producing huge whitespace blocks below the actual content. The cap
// keeps each card sized to its own content range; internal lists still
// scroll if they overflow.
const CARD_HEIGHT_CAP = 'max-h-[360px] sm:max-h-[420px] lg:max-h-[480px]';

// ── Stat tile ───────────────────────────────────────────────────────────────

function StatTile({
  icon: Icon,
  iconBg,
  iconFg,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconFg: string;
  label: string;
  value: React.ReactNode;
  detail: string;
}) {
  // Horizontal-first layout. The previous version stacked icon → label →
  // big number → detail line vertically and burned ~140px of card height
  // for what is essentially "one stat". This version puts the icon on
  // the left and stacks label + value + detail to its right, cutting
  // card height roughly in half on every breakpoint without losing
  // any information.
  return (
    <Card className={`h-full ${SOFT_CARD}`} style={SOFT_CARD_STYLE}>
      <CardContent className="px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconFg}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] sm:text-[12px] font-semibold text-muted-foreground uppercase tracking-wide leading-none">{label}</div>
          <div className="flex items-baseline gap-2 mt-1">
            <div className="text-xl sm:text-2xl font-bold tracking-tight leading-none">{value}</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground truncate">{detail}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Today's Schedule column ─────────────────────────────────────────────────

function TodaysSchedule({ rows, loading }: { rows: FeedRow[]; loading: boolean }) {
  return (
    <Card className={`h-full ${SOFT_CARD} ${CARD_HEIGHT_CAP}`} style={SOFT_CARD_STYLE}>
      <CardContent className="p-4 sm:p-6 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 sm:mb-5 shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-lg">Today&apos;s Schedule</h2>
          </div>
          <Link
            to="/calendar"
            className="text-sm px-3 py-1 rounded border border-border hover:bg-muted transition-colors text-muted-foreground"
          >
            View Calendar
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin inline-block text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
            Nothing on the calendar today.
          </p>
        ) : (
          <ul className="space-y-3 sm:space-y-5 flex-1 overflow-y-auto pr-1 -mr-1">
            {rows.map((s) => {
              const loc = (s.meta?.location as string | null) || (s.meta?.venue_name as string | null) || null;
              return (
                <li key={s.id} className="flex gap-3 items-start">
                  <div className="w-16 text-sm text-muted-foreground pt-0.5 shrink-0">
                    {formatTime(s.event_at)}
                  </div>
                  <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${scheduleDot(s.subtype)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold leading-snug truncate">{s.title}</div>
                    {loc && <div className="text-sm text-muted-foreground truncate mt-0.5">{loc}</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Link to="/calendar" className="block mt-3 sm:mt-5 text-sm text-primary hover:underline shrink-0">
          View full day schedule &rarr;
        </Link>
      </CardContent>
    </Card>
  );
}

// ── Recent Announcements column ─────────────────────────────────────────────

function RecentAnnouncements({ rows, loading }: { rows: FeedRow[]; loading: boolean }) {
  return (
    <Card className={`h-full ${SOFT_CARD} ${CARD_HEIGHT_CAP}`} style={SOFT_CARD_STYLE}>
      <CardContent className="p-4 sm:p-6 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 sm:mb-5 shrink-0">
          <h2 className="font-semibold text-lg">Recent Announcements</h2>
          <Link to="/communications" className="text-sm text-primary hover:underline">View All</Link>
        </div>
        {loading ? (
          <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin inline-block text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
            No recent announcements.
          </p>
        ) : (
          <ul className="space-y-3 sm:space-y-5 flex-1 overflow-y-auto pr-1 -mr-1">
            {rows.slice(0, 4).map((a) => (
              <li key={a.id} className="flex gap-3 items-start">
                <div className="w-10 h-10 rounded-md bg-emerald-50 flex items-center justify-center shrink-0">
                  <Megaphone className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold leading-snug">{a.title}</div>
                  {a.detail && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1 leading-relaxed">{a.detail}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{relativeAge(a.event_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Needs Your Attention column ─────────────────────────────────────────────

function NeedsAttention({ rows, loading }: { rows: FeedRow[]; loading: boolean }) {
  // Inline hex styles for the amber palette — Tailwind amber-* tokens can be
  // overridden by per-tenant CSS variables, which made this card render as a
  // solid gold block with invisible text on some tenants.
  return (
    <Card
      className={`h-full border-0 rounded-2xl ${CARD_HEIGHT_CAP}`}
      style={{ ...SOFT_CARD_STYLE_AMBER, background: 'rgba(254,243,199,0.4)' }}
    >
      <CardContent className="p-4 sm:p-6 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 sm:mb-5 shrink-0">
          <h2 className="font-semibold text-lg" style={{ color: '#78350f' }}>Needs Your Attention</h2>
          <span
            className="text-sm font-semibold rounded-full w-6 h-6 inline-flex items-center justify-center"
            style={{ color: '#b45309', background: '#fef3c7' }}
          >
            {rows.length}
          </span>
        </div>
        {loading ? (
          <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin inline-block" style={{ color: '#b45309' }} /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-center py-6" style={{ color: '#92400e' }}>All caught up.</p>
        ) : (
          {/* Cap the visible window to 3 items so the card stays compact,
              but let users scroll within the card to reach the rest.
              `max-h` is chosen so 3 rows fit comfortably (each row is
              ~64px tall including space-y). The list still scrolls
              vertically when there are more than 3 items. */}
          <ul className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto pr-1 -mr-1 max-h-[220px] sm:max-h-[260px]">
            {rows.map((t) => {
              const Icon = t.subtype === 'practice_recording'
                ? Mic
                : t.subtype === 'missing_attendance'
                  ? ClipboardCheck
                  : MessageSquare;
              const linkTo = t.subtype === 'practice_recording'
                ? '/dashboard/practice-recordings'
                : undefined;
              const body = (
                <>
                  <div
                    className="w-10 h-10 rounded-md bg-white flex items-center justify-center shrink-0 border"
                    style={{ borderColor: '#fde68a' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: '#b45309' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold leading-snug truncate" style={{ color: '#78350f' }}>{t.title}</div>
                    {t.detail && <div className="text-sm truncate mt-0.5" style={{ color: '#92400e' }}>{t.detail}</div>}
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: '#b45309' }} />
                </>
              );
              return linkTo ? (
                <li key={t.id}>
                  <Link to={linkTo} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    {body}
                  </Link>
                </li>
              ) : (
                <li key={t.id} className="flex items-center gap-3">{body}</li>
              );
            })}
          </ul>
        )}
        <Link to="/legacy-dashboard" className="block mt-3 sm:mt-5 text-sm font-medium hover:underline shrink-0" style={{ color: '#92400e' }}>
          View all tasks &rarr;
        </Link>
      </CardContent>
    </Card>
  );
}

// ── Upcoming Events (bottom-left) ───────────────────────────────────────────

function UpcomingEvents({ rows, loading }: { rows: FeedRow[]; loading: boolean }) {
  return (
    <Card className={`h-full ${SOFT_CARD} ${CARD_HEIGHT_CAP}`} style={SOFT_CARD_STYLE}>
      <CardContent className="p-4 sm:p-6 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 sm:mb-5 shrink-0">
          <h2 className="font-semibold text-lg">Upcoming Events</h2>
          <Link to="/calendar" className="text-sm text-primary hover:underline">View All</Link>
        </div>
        {loading ? (
          <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin inline-block text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
            No upcoming events on the feed.
          </p>
        ) : (
          <ul className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto pr-1 -mr-1">
            {rows.slice(0, 4).map((e) => {
              const d = parseISO(e.event_at);
              const month = format(d, 'MMM').toUpperCase();
              const day = format(d, 'd');
              const loc = (e.meta?.location as string | null) || (e.meta?.venue_name as string | null) || null;
              return (
                <li key={e.id} className="flex gap-3 items-center">
                  <div className="w-12 text-center shrink-0">
                    <div className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">{month}</div>
                    <div className="text-2xl font-bold leading-tight">{day}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold leading-snug truncate">{e.title}</div>
                    <div className="text-sm text-muted-foreground truncate mt-0.5">
                      {format(d, 'EEEE, h:mm a')}{loc ? ` • ${loc}` : ''}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Quick Actions (bottom-middle) ───────────────────────────────────────────

const QUICK_ACTIONS: Array<{
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  fg: string;
}> = [
  { label: 'Take Attendance',   to: '/attendance',     icon: ClipboardCheck, bg: 'bg-emerald-50', fg: 'text-emerald-600' },
  { label: 'Send Announcement', to: '/communications', icon: Send,           bg: 'bg-cyan-50',    fg: 'text-cyan-600' },
  { label: 'Add Event',         to: '/calendar',       icon: CalendarPlus,   bg: 'bg-purple-50',  fg: 'text-purple-600' },
  { label: 'Upload Music',      to: '/admin/media',    icon: Music,          bg: 'bg-rose-50',    fg: 'text-rose-600' },
  { label: 'Create Assignment', to: '/academy',        icon: FileSignature,  bg: 'bg-orange-50',  fg: 'text-orange-600' },
  { label: 'Record Rehearsal',  to: '/rehearsals/feedback-dashboard', icon: Video, bg: 'bg-teal-50', fg: 'text-teal-600' },
];

function QuickActions() {
  return (
    <Card className={`h-full ${SOFT_CARD} ${CARD_HEIGHT_CAP}`} style={SOFT_CARD_STYLE}>
      <CardContent className="p-4 sm:p-6 flex flex-col h-full overflow-hidden">
        <h2 className="font-semibold text-lg mb-3 sm:mb-5 shrink-0">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 flex-1 overflow-y-auto pr-1 -mr-1">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className={`${a.bg} rounded-xl p-2 sm:p-3 flex flex-col items-center justify-center gap-1 sm:gap-2 min-h-[80px] sm:min-h-[100px] hover:brightness-95 transition`}
            >
              <a.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${a.fg}`} />
              {/* break-words + leading-snug stops the per-button label
                  from spilling across the icon below it when the button
                  is narrow (Quick Actions sits in a 3-col 4ths-wide row
                  on iPad portrait, ~110px per cell). */}
              <span className="text-[11px] sm:text-xs font-semibold text-center leading-snug break-words">{a.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Activity Feed (bottom-right) ────────────────────────────────────────────

// Synthesizes a chronological feed line from each unioned row so the panel
// reads like a single timeline rather than three separate sources.
function describeActivity(row: FeedRow): { actor: string; verb: string; icon: React.ComponentType<{ className?: string }>; iconBg: string; iconFg: string } {
  if (row.section === 'announcement') {
    const author = (row.meta?.author_name as string | null) || 'Staff';
    return { actor: author, verb: `posted “${row.title}”`, icon: Megaphone, iconBg: 'bg-emerald-50', iconFg: 'text-emerald-600' };
  }
  if (row.section === 'schedule') {
    return { actor: row.title, verb: 'on the schedule', icon: Calendar, iconBg: 'bg-purple-50', iconFg: 'text-purple-600' };
  }
  if (row.subtype === 'missing_attendance') {
    return { actor: 'Attendance', verb: row.detail || 'needs to be taken', icon: ClipboardCheck, iconBg: 'bg-amber-50', iconFg: 'text-amber-700' };
  }
  return { actor: 'Messages', verb: row.title, icon: MessageSquare, iconBg: 'bg-cyan-50', iconFg: 'text-cyan-600' };
}

function ActivityFeed({ rows, loading }: { rows: FeedRow[]; loading: boolean }) {
  return (
    <Card className={`h-full ${SOFT_CARD} ${CARD_HEIGHT_CAP}`} style={SOFT_CARD_STYLE}>
      <CardContent className="p-4 sm:p-6 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-3 sm:mb-5 shrink-0">
          <h2 className="font-semibold text-lg">Activity Feed</h2>
          <Link to="/legacy-dashboard" className="text-sm text-primary hover:underline">View All</Link>
        </div>
        {loading ? (
          <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin inline-block text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
            Nothing recent.
          </p>
        ) : (
          <ul className="space-y-3 sm:space-y-4 flex-1 overflow-y-auto pr-1 -mr-1">
            {rows.slice(0, 5).map((r) => {
              const a = describeActivity(r);
              return (
                <li key={r.id} className="flex gap-3 items-start">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${a.iconBg}`}>
                    <a.icon className={`w-5 h-5 ${a.iconFg}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base leading-snug">
                      <span className="font-semibold">{a.actor}</span>{' '}
                      <span className="text-muted-foreground">{a.verb}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{relativeAge(r.event_at)}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function CommandCenter() {
  const { profile } = useUserRole();
  const isTeacher = !!profile && (
    profile.is_admin || profile.is_super_admin
    || ['instructor', 'teacher', 'conductor'].includes((profile.role || '').toLowerCase())
  );

  const { data, isLoading, error } = useQuery<FeedRow[]>({
    queryKey: ['command-center-feed'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_command_center_feed')
        .select('section, subtype, id, title, detail, event_at, severity, meta')
        .order('event_at', { ascending: false });
      if (error) throw error;
      return (data as FeedRow[]) || [];
    },
  });

  // Unlistened practice recordings — surfaces in the Needs Your Attention
  // card for teachers/admins only. We treat "teacher_notes is null" as a
  // proxy for unlistened (no listen-event tracking yet); leaving any
  // feedback clears the task from the urgent list.
  const { data: unlistenedRecordings } = useQuery<FeedRow[]>({
    queryKey: ['command-center-unlistened-recordings'],
    enabled: isTeacher,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data: recs, error } = await supabase
        .from('gw_practice_recordings')
        .select('id, user_id, title, bpm, time_sig, created_at, course_id')
        .is('teacher_notes', null)
        .is('reviewed_at', null)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const userIds = Array.from(new Set((recs ?? []).map((r) => r.user_id)));
      const nameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('gw_profiles_directory')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        (profs ?? []).forEach((p: any) => {
          const name = `${p.full_name ?? ''}`.trim() || p.email || 'A student';
          nameMap.set(p.user_id, name);
        });
      }
      return (recs ?? []).map((r: any): FeedRow => {
        const student = nameMap.get(r.user_id) ?? 'A student';
        return {
          section: 'urgent_task',
          subtype: 'practice_recording',
          id: `practice:${r.id}`,
          title: `${student} — ${r.title || 'practice recording'}`,
          detail: `♩ = ${r.bpm ?? '?'} · ${r.time_sig ?? '?'}`,
          event_at: r.created_at,
          severity: 'medium',
          meta: { recording_id: r.id, course_id: r.course_id, user_id: r.user_id },
        };
      });
    },
  });

  const { urgent, schedule, announcements, activity, eventsOnly, stats } = useMemo(() => {
    // Merge feed-view rows with the locally-queried unlistened practice
    // recordings so both flow into Needs Your Attention identically.
    const rows = [...(data ?? []), ...(unlistenedRecordings ?? [])];
    const sevOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };

    const urgent = rows
      .filter((r) => r.section === 'urgent_task')
      .sort((a, b) => {
        const sa = sevOrder[a.severity ?? 'low'] ?? 3;
        const sb = sevOrder[b.severity ?? 'low'] ?? 3;
        if (sa !== sb) return sa - sb;
        return new Date(b.event_at).getTime() - new Date(a.event_at).getTime();
      });

    const schedule = rows
      .filter((r) => r.section === 'schedule')
      .sort((a, b) => new Date(a.event_at).getTime() - new Date(b.event_at).getTime());

    const announcements = rows
      .filter((r) => r.section === 'announcement')
      .sort((a, b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime());

    // Activity feed: all rows by recency.
    const activity = [...rows].sort((a, b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime());

    // Upcoming events: only schedule rows of subtype "event" (sessions show
    // in Today's Schedule already, so this card stays event-focused).
    const eventsOnly = schedule.filter((r) => r.subtype === 'event');

    // Top-row metrics derived from the feed. Attendance % is not yet
    // available in the view — we surface the count of sessions awaiting
    // attendance as a stand-in until the underlying summary lands.
    const unreadCount = urgent
      .filter((r) => r.subtype === 'unread_messages')
      .reduce((acc, r) => acc + Number((r.meta?.unread_count as number | undefined) ?? 0), 0);

    const missingAttendanceCount = urgent.filter((r) => r.subtype === 'missing_attendance').length;
    const nextEvent = eventsOnly[0]?.title ?? schedule[0]?.title ?? null;

    return {
      urgent,
      schedule,
      announcements,
      activity,
      eventsOnly,
      stats: {
        attendanceMissing: missingAttendanceCount,
        scheduleCount: schedule.length,
        urgentCount: urgent.length,
        unreadCount,
        nextEvent,
      },
    };
  }, [data, unlistenedRecordings]);

  return (
    <DashboardShell>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-6 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          {error && (
            <p className="text-sm text-destructive mt-1">
              Couldn&apos;t load: {(error as Error).message}
            </p>
          )}
        </div>
        <div className="rounded-md border border-border bg-card px-2 sm:px-3.5 py-2 text-sm sm:text-base inline-flex items-center gap-2 shrink-0">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          {format(new Date(), 'MMM d, yyyy')}
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <StatTile
          icon={Users}
          iconBg="bg-purple-50"
          iconFg="text-purple-600"
          label="Attendance"
          value={stats.attendanceMissing === 0 ? '—' : `${stats.attendanceMissing}`}
          detail={stats.attendanceMissing === 0 ? 'Awaiting summary' : `${stats.attendanceMissing} pending`}
        />
        <StatTile
          icon={Calendar}
          iconBg="bg-emerald-50"
          iconFg="text-emerald-600"
          label="Events"
          value={stats.scheduleCount}
          detail={stats.nextEvent ? `Next: ${stats.nextEvent}` : 'Nothing scheduled today'}
        />
        <StatTile
          icon={ClipboardList}
          iconBg="bg-orange-50"
          iconFg="text-orange-600"
          label="Tasks"
          value={stats.urgentCount}
          detail={stats.urgentCount === 0 ? 'All caught up' : 'Requires your attention'}
        />
        <StatTile
          icon={MessageSquare}
          iconBg="bg-cyan-50"
          iconFg="text-cyan-600"
          label="Messages"
          value={stats.unreadCount}
          detail={stats.unreadCount === 0 ? 'Inbox clear' : 'Across all channels'}
        />
      </div>

      {/* Middle row — two cards per row up to xl (1280px), three on
          desktop landscape. xl (not lg) is the 3-col gate because
          iPad Pro 12.9" portrait is exactly 1024px which is the lg
          threshold — using lg there would put the dashboard back into
          the 3-col layout on the largest iPad. The third card spans
          the full width below xl so it doesn't orphan in a half-row.
          items-start prevents a shallow card from stretching to match
          the tallest neighbour. */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-4 items-start">
        <div className="md:col-span-1 xl:col-span-5"><TodaysSchedule rows={schedule} loading={isLoading} /></div>
        <div className="md:col-span-1 xl:col-span-4"><RecentAnnouncements rows={announcements} loading={isLoading} /></div>
        <div className="md:col-span-2 xl:col-span-3"><NeedsAttention rows={urgent} loading={isLoading} /></div>
      </div>

      {/* Bottom row — same xl gate. Activity Feed spans the full width
          below xl so it gets room to breathe instead of squeezing next
          to Quick Actions in a half-width cell. */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        <UpcomingEvents rows={eventsOnly} loading={isLoading} />
        <QuickActions />
        <div className="md:col-span-2 xl:col-span-1"><ActivityFeed rows={activity} loading={isLoading} /></div>
      </div>
    </div>
    </DashboardShell>
  );
}
