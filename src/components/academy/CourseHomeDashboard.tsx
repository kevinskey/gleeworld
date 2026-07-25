import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ClipboardList, QrCode, Bell, MapPin, ChevronRight, MessageSquare, BookOpen } from 'lucide-react';
import { format, isPast, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCourseAnnouncements } from '@/hooks/useCourseAnnouncements';
import type { AcademyCourse } from '@/config/academyCourses';
import type { CourseTheme } from '@/lib/academy/courseTheme';

interface CourseHomeDashboardProps {
  course: AcademyCourse;
  theme: CourseTheme;
  isEnrolled: boolean;
  isAdmin: boolean;
  isExecutiveBoard: boolean;
  onTabChange: (tab: string) => void;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_date: string;
  location: string | null;
  event_type: string | null;
}

interface UpcomingAssignment {
  id: string;
  title: string;
  due_date: string | null;
  points: number | null;
}

// Rich fallback Home tab for every course that doesn't have a bespoke
// home component. Two-column at-a-glance (upcoming events + due
// assignments) + pinned announcement + quick actions. Uses plain divs
// (not shadcn Card) so `.academy-neutral`'s !important white overrides
// don't neutralize the theme-aware translucent surfaces.
export function CourseHomeDashboard({
  course,
  theme,
  isExecutiveBoard,
  onTabChange,
}: CourseHomeDashboardProps) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [assignments, setAssignments] = useState<UpcomingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const { announcements } = useCourseAnnouncements(course.id);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [eventsRes, assignmentsRes] = await Promise.all([
          supabase
            .from('gw_events')
            .select('id, title, start_date, location, event_type')
            .eq('course_id', course.id)
            .gte('start_date', new Date().toISOString())
            .order('start_date', { ascending: true })
            .limit(4),
          supabase
            .from('gw_course_assignments')
            .select('id, title, due_date, points')
            .eq('course_id', course.id)
            .eq('is_published', true)
            .order('due_date', { ascending: true })
            .limit(4),
        ]);
        if (cancelled) return;
        setEvents((eventsRes.data as UpcomingEvent[] | null) ?? []);
        setAssignments((assignmentsRes.data as UpcomingAssignment[] | null) ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [course.id]);

  const isLight = theme.tone === 'light';
  // Panel style — inline to defeat `.academy-neutral` `!important`
  // overrides that force cards to solid white. Translucent so the
  // themed shell shows through.
  const panelStyle: React.CSSProperties = {
    background: isLight ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.75)',
    borderColor: isLight ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };
  const rowStyle: React.CSSProperties = {
    borderColor: isLight ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
  };
  const titleCls = isLight ? 'text-white' : 'text-slate-900';
  const mutedCls = isLight ? 'text-white/70' : 'text-slate-600';
  const chipInverse = isLight ? '#0a0a0a' : '#ffffff';
  const outlineBtnCls = isLight
    ? 'border-white/25 text-white bg-white/5 hover:bg-white/10'
    : '';

  const pinnedAnnouncement = announcements.find((a) => a.is_pinned) ?? announcements[0];

  return (
    <div className="space-y-6">
      {/* Quick actions row — primary CTAs above the fold. */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => navigate('/qr-scanner')}
          className="rounded-full gap-2"
          style={{
            background: `linear-gradient(135deg, ${theme.chip[0]}, ${theme.chip[1]})`,
            color: chipInverse,
            border: 'none',
          }}
        >
          <QrCode className="h-4 w-4" />
          Check In
        </Button>
        <Button variant="outline" className={`rounded-full gap-2 ${outlineBtnCls}`} onClick={() => onTabChange('assignments')}>
          <ClipboardList className="h-4 w-4" />
          Assignments
        </Button>
        <Button variant="outline" className={`rounded-full gap-2 ${outlineBtnCls}`} onClick={() => onTabChange('messages')}>
          <MessageSquare className="h-4 w-4" />
          Messages
        </Button>
        <Button variant="outline" className={`rounded-full gap-2 ${outlineBtnCls}`} onClick={() => onTabChange('syllabus')}>
          <BookOpen className="h-4 w-4" />
          Syllabus
        </Button>
        {isExecutiveBoard && (
          <Button variant="outline" className={`rounded-full gap-2 ${outlineBtnCls}`} onClick={() => navigate('/admin/calendar')}>
            <Calendar className="h-4 w-4" />
            Add Event
          </Button>
        )}
      </div>

      {/* Pinned / latest announcement */}
      {pinnedAnnouncement && (
        <div className="rounded-2xl border p-5" style={panelStyle}>
          <div className={`flex items-center gap-2 text-xs uppercase tracking-wider ${mutedCls} mb-2`}>
            <Bell className="h-3.5 w-3.5" />
            {pinnedAnnouncement.is_pinned ? 'Pinned Announcement' : 'Latest Announcement'}
          </div>
          <h3 className={`text-lg font-semibold ${titleCls}`}>{pinnedAnnouncement.title}</h3>
          {pinnedAnnouncement.content && (
            <p className={`mt-2 text-sm ${mutedCls} line-clamp-3`}>{pinnedAnnouncement.content}</p>
          )}
          {announcements.length > 1 && (
            <button
              onClick={() => onTabChange('announcements')}
              className={`mt-3 inline-flex items-center gap-1 text-xs font-medium ${titleCls} opacity-80 hover:opacity-100`}
            >
              View all {announcements.length} announcements
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Two-column at-a-glance — upcoming events + due assignments. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border p-5" style={panelStyle}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-base font-semibold ${titleCls}`}>Upcoming</h3>
            <button
              onClick={() => onTabChange('calendar')}
              className={`text-xs font-medium ${mutedCls} inline-flex items-center gap-1 hover:opacity-100 opacity-80`}
            >
              Calendar <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {loading ? (
            <div className={`text-sm ${mutedCls}`}>Loading events…</div>
          ) : events.length === 0 ? (
            <div className={`text-sm ${mutedCls}`}>No upcoming events.</div>
          ) : (
            <ul className="space-y-1">
              {events.map((ev) => {
                const d = new Date(ev.start_date);
                return (
                  <li key={ev.id}>
                    <button
                      onClick={() => onTabChange('calendar')}
                      className="w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-white/5"
                      style={rowStyle}
                    >
                      <div
                        className="flex flex-col items-center justify-center rounded-md px-2.5 py-1 min-w-[52px]"
                        style={{ background: isLight ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                      >
                        <span className={`text-[10px] uppercase tracking-wider ${mutedCls}`}>{format(d, 'MMM')}</span>
                        <span className={`text-lg font-bold leading-none ${titleCls}`}>{format(d, 'd')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${titleCls}`}>{ev.title}</div>
                        <div className={`text-xs mt-0.5 ${mutedCls} flex items-center gap-2 flex-wrap`}>
                          <span>{format(d, 'EEE · h:mm a')}</span>
                          {ev.location && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ev.location}
                            </span>
                          )}
                          {ev.event_type && (
                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${isLight ? 'border-white/20 text-white/80 bg-transparent' : ''}`}>
                              {ev.event_type}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border p-5" style={panelStyle}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-base font-semibold ${titleCls}`}>Due Soon</h3>
            <button
              onClick={() => onTabChange('assignments')}
              className={`text-xs font-medium ${mutedCls} inline-flex items-center gap-1 hover:opacity-100 opacity-80`}
            >
              All assignments <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {loading ? (
            <div className={`text-sm ${mutedCls}`}>Loading assignments…</div>
          ) : assignments.length === 0 ? (
            <div className={`text-sm ${mutedCls}`}>Nothing due right now.</div>
          ) : (
            <ul className="space-y-1">
              {assignments.map((a) => {
                const due = a.due_date ? new Date(a.due_date) : null;
                const overdue = due ? isPast(due) : false;
                const daysLeft = due ? differenceInDays(due, new Date()) : null;
                return (
                  <li key={a.id}>
                    <button
                      onClick={() => onTabChange('assignments')}
                      className="w-full text-left flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-white/5"
                      style={rowStyle}
                    >
                      <div
                        className="flex flex-col items-center justify-center rounded-md px-2.5 py-1 min-w-[52px]"
                        style={{
                          background: overdue
                            ? 'rgba(244,63,94,0.20)'
                            : isLight
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.05)',
                        }}
                      >
                        {due ? (
                          <>
                            <span className={`text-[10px] uppercase tracking-wider ${mutedCls}`}>{format(due, 'MMM')}</span>
                            <span className={`text-lg font-bold leading-none ${titleCls}`}>{format(due, 'd')}</span>
                          </>
                        ) : (
                          <span className={`text-[10px] uppercase tracking-wider ${mutedCls}`}>—</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-medium truncate ${titleCls}`}>{a.title}</div>
                        <div className={`text-xs mt-0.5 ${mutedCls} flex items-center gap-2 flex-wrap`}>
                          {due && (
                            <span>
                              {overdue
                                ? 'Overdue'
                                : daysLeft === 0
                                ? 'Due today'
                                : daysLeft === 1
                                ? 'Due tomorrow'
                                : `Due in ${daysLeft} days`}
                            </span>
                          )}
                          {a.points != null && (
                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 ${isLight ? 'border-white/20 text-white/80 bg-transparent' : ''}`}>
                              {a.points} pts
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Highlights strip — programmatic pillars, subtle. */}
      {course.highlights && course.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {course.highlights.map((h) => (
            <span
              key={h}
              className={`text-xs px-3 py-1 rounded-full border ${
                isLight ? 'border-white/15 text-white/80 bg-white/5' : 'border-black/10 text-slate-600 bg-black/5'
              }`}
            >
              {h}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
