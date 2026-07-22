// Teacher-side Academy dashboard — aggregated triage view across every
// course the teacher owns or instructs. Designed to answer "what needs my
// attention right now?" before they dive into any single course.

import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardCheck, Calendar, Users, FileText, ChevronRight, Plus, Store,
  Activity, Loader2, BookOpen, AlertCircle,
} from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function TeacherAcademyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // All courses in tenant (teacher view).
  const { data: courses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['teacher-academy-courses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_courses')
        .select('id, course_code, title, instructor_name, semester, calendar_id')
        .eq('is_active', true)
        .order('course_code');
      return data ?? [];
    },
  });

  // Grading queue — ungraded submissions across all courses.
  const { data: gradingQueue = [], isLoading: queueLoading } = useQuery({
    queryKey: ['teacher-grading-queue'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_assignment_submissions')
        .select('id, submitted_at, status, assignment_id, user_id, gw_assignments!inner(id, title, course_id)')
        .or('status.eq.submitted,graded_at.is.null')
        .order('submitted_at', { ascending: true })
        .limit(10);
      return data ?? [];
    },
  });

  // Today's class meetings — events on course calendars happening today.
  const { data: todayClasses = [] } = useQuery({
    queryKey: ['teacher-today-classes'],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date();   end.setHours(23, 59, 59, 999);
      const { data } = await supabase
        .from('gw_events')
        .select('id, title, start_date, course_id, gw_courses(course_code)')
        .not('course_id', 'is', null)
        .gte('start_date', start.toISOString())
        .lte('start_date', end.toISOString())
        .order('start_date');
      return data ?? [];
    },
  });

  // Recent announcements for activity feed.
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['teacher-academy-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_announcements')
        .select('id, title, created_at, course_id')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <DashboardPageShell
      title="Teaching Dashboard"
      subtitle="Everything that needs your attention, across every class."
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/academy/store')}>
            <Store className="w-4 h-4 mr-1.5" /> Course Store
          </Button>
          <Button size="sm" onClick={() => navigate('/academy/new')}>
            <Plus className="w-4 h-4 mr-1.5" /> New Course
          </Button>
        </div>
      }
    >
      {/* Top row — three triage widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Grading queue */}
        <Card className={SOFT_CARD + ' lg:col-span-2'} style={SOFT_CARD_STYLE}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 inline-flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <h2 className="font-semibold text-lg">Grading Queue</h2>
              </div>
              <Badge variant="outline" className="text-xs">
                {gradingQueue.length} waiting
              </Badge>
            </div>
            {queueLoading ? (
              <div className="py-6 text-center"><Loader2 className="w-4 h-4 animate-spin inline text-muted-foreground" /></div>
            ) : gradingQueue.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No submissions waiting. You're caught up.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {gradingQueue.slice(0, 6).map((s: any) => {
                  const submitted = s.submitted_at ? parseISO(s.submitted_at) : null;
                  return (
                    <li
                      key={s.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/40 transition cursor-pointer"
                      onClick={() => navigate(`/academy/grading?submission=${s.id}`)}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-semibold truncate">
                          {s.gw_assignments?.title || 'Assignment'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {submitted ? format(submitted, 'MMM d, h:mm a') : 'Submitted'}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </li>
                  );
                })}
              </ul>
            )}
            {gradingQueue.length > 6 && (
              <Button
                variant="ghost" size="sm"
                className="w-full mt-2 text-amber-700 hover:bg-amber-50"
                onClick={() => navigate('/academy/grading')}
              >
                View all {gradingQueue.length} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Today's classes */}
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 inline-flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-lg">Today's Classes</h2>
            </div>
            {todayClasses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">No classes scheduled today.</p>
            ) : (
              <ul className="space-y-2">
                {todayClasses.map((e: any) => (
                  <li key={e.id} className="flex items-center gap-2 text-sm">
                    <span className="text-sm text-muted-foreground font-mono w-12 shrink-0">
                      {format(parseISO(e.start_date), 'h:mm a')}
                    </span>
                    <span className="flex-1 truncate">
                      {e.gw_courses?.course_code ? <span className="font-semibold">{e.gw_courses.course_code}</span> : null}
                      {e.gw_courses?.course_code ? ' · ' : ''}{e.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Courses grid */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5" /> Your Courses
          </h2>
          <span className="text-xs text-muted-foreground">{coursesLoading ? '' : `${courses.length} active`}</span>
        </div>

        {coursesLoading ? (
          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardContent className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></CardContent>
          </Card>
        ) : courses.length === 0 ? (
          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardContent className="p-8 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">
                You haven't created any courses yet.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" onClick={() => navigate('/academy/new')}>
                  <Plus className="w-4 h-4 mr-1.5" /> New Course
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate('/academy/store')}>
                  <Store className="w-4 h-4 mr-1.5" /> Browse Course Store
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c: any, i: number) => (
              <CourseTileTeacher
                key={c.id}
                course={c}
                accent={COURSE_PALETTE[i % COURSE_PALETTE.length]}
                onClick={() => navigate(`/academy/c/${(c.course_code || '').toLowerCase()}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recent activity */}
      <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 inline-flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-lg">Recent Activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Nothing recent.</p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((a: any) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                  <span className="flex-1 truncate">{a.title}</span>
                  <span className="text-sm text-muted-foreground shrink-0">
                    {a.created_at ? format(parseISO(a.created_at), 'MMM d') : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
}

const COURSE_PALETTE = ['#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];

function CourseTileTeacher({ course, accent, onClick }: { course: any; accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl overflow-hidden hover:-translate-y-0.5 transition bg-card"
      style={SOFT_CARD_STYLE}
    >
      <div className="h-1.5" style={{ background: accent }} />
      <div className="p-4">
        <div className="text-xs font-mono text-muted-foreground">{course.course_code}</div>
        <div className="font-semibold text-base mt-0.5 line-clamp-2">{course.title || course.course_code}</div>
        <div className="text-xs text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {course.instructor_name && <span>👤 {course.instructor_name}</span>}
          {course.semester && <span>📅 {course.semester}</span>}
        </div>
      </div>
    </button>
  );
}
