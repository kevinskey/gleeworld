// Instructor Console — central entry for instructors who teach more than
// one class. Lists each of their classes as a card with quick stats and
// actions, and a combined recent-media strip across all those classes.
// Each class still has its own full CourseShell at /academy/c/:code; this
// page is a single console so directors don't have to close one class to
// administer another.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight, Users, ClipboardCheck, FileText, Image as ImageIcon,
  Music, Loader2, GraduationCap, Plus, Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

interface InstructorCourse {
  id: string;
  course_code: string;
  title: string;
  semester: string | null;
  instructor_name: string | null;
  enrolled: number;
  pending_attendance: number;
  open_assignments: number;
}

interface MediaRow {
  id: string;
  title: string;
  file_type: string;
  created_at: string;
  course_id: string | null;
}

interface SheetRow {
  id: string;
  title: string;
  created_at: string | null;
  course_id: string | null;
}

export default function InstructorConsole() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { isSuperAdmin, isAdmin } = useUserRole();
  const isPrivileged = isSuperAdmin() || isAdmin();

  const { data: courses = [], isLoading } = useQuery<InstructorCourse[]>({
    queryKey: ['instructor-console-courses', userId, isPrivileged],
    enabled: !!userId,
    queryFn: async () => {
      // Admins see every active class in the tenant; instructors see only
      // their own. Tenant RLS guarantees we never leak across tenants.
      // is_template excluded — templates aren't real classes anyone teaches.
      let q = supabase
        .from('gw_courses')
        .select('id, course_code, title, semester, instructor_name')
        .eq('is_active', true)
        .eq('is_template', false)
        .order('course_code');
      if (!isPrivileged) q = q.eq('instructor_id', userId!);
      const { data: rows } = await q;

      const list = (rows ?? []) as Array<{ id: string; course_code: string; title: string; semester: string | null; instructor_name: string | null }>;
      if (list.length === 0) return [];

      const courseIds = list.map((c) => c.id);

      // Roll up enrollment counts.
      const { data: enrollments } = await supabase
        .from('gw_course_enrollments')
        .select('course_id')
        .in('course_id', courseIds);
      const enrolledByCourse: Record<string, number> = {};
      (enrollments ?? []).forEach((e: any) => {
        enrolledByCourse[e.course_id] = (enrolledByCourse[e.course_id] || 0) + 1;
      });

      // Open assignments per course (no due date filter — just active).
      const { data: assignments } = await supabase
        .from('gw_assignments')
        .select('course_id')
        .in('course_id', courseIds)
        .eq('is_active', true);
      const openByCourse: Record<string, number> = {};
      (assignments ?? []).forEach((a: any) => {
        openByCourse[a.course_id] = (openByCourse[a.course_id] || 0) + 1;
      });

      return list.map((c) => ({
        id: c.id,
        course_code: c.course_code,
        title: c.title,
        semester: c.semester,
        instructor_name: c.instructor_name,
        enrolled: enrolledByCourse[c.id] || 0,
        pending_attendance: 0, // Wire up to attendance summary view when available.
        open_assignments: openByCourse[c.id] || 0,
      }));
    },
  });

  const courseIds = useMemo(() => courses.map((c) => c.id), [courses]);

  // Combined media + scores across the instructor's classes.
  const { data: media = [] } = useQuery<MediaRow[]>({
    queryKey: ['instructor-console-media', courseIds.join(',')],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_media_library')
        .select('id, title, file_type, created_at, course_id')
        .in('course_id', courseIds)
        .order('created_at', { ascending: false })
        .limit(12);
      return (data ?? []) as MediaRow[];
    },
  });

  const { data: scores = [] } = useQuery<SheetRow[]>({
    queryKey: ['instructor-console-scores', courseIds.join(',')],
    enabled: courseIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_sheet_music')
        .select('id, title, created_at, course_id')
        .in('course_id', courseIds)
        .order('created_at', { ascending: false })
        .limit(12);
      return (data ?? []) as SheetRow[];
    },
  });

  const courseCodeById = useMemo(() => {
    const m: Record<string, string> = {};
    courses.forEach((c) => { m[c.id] = c.course_code; });
    return m;
  }, [courses]);

  const totals = useMemo(() => {
    return courses.reduce(
      (acc, c) => ({
        classes: acc.classes + 1,
        enrolled: acc.enrolled + c.enrolled,
        assignments: acc.assignments + c.open_assignments,
      }),
      { classes: 0, enrolled: 0, assignments: 0 },
    );
  }, [courses]);

  return (
    <DashboardPageShell
      title="Instructor Console"
      subtitle={isPrivileged
        ? 'Every class in your workspace. Open one to manage it, or jump to combined media below.'
        : 'Every class you teach in one place. Click a class to open its full view.'}
      actions={
        // Adding classes is an admin action — directors who only teach
        // don't see this. Some users are admin AND instructor; the gate
        // handles both.
        isPrivileged && (
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/academy/store">
                <Store className="w-4 h-4 mr-1.5" />
                Course Store
              </Link>
            </Button>
            <Button asChild>
              <Link to="/academy/new">
                <Plus className="w-4 h-4 mr-1.5" />
                New Class
              </Link>
            </Button>
          </div>
        )
      }
    >
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="w-6 h-6 animate-spin inline text-muted-foreground" />
        </div>
      ) : courses.length === 0 ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-8 text-center">
            <GraduationCap className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-base font-semibold">No classes assigned yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              When you're added as the instructor of a class, it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Workspace summary strip — quick mental anchor before scanning cards. */}
          <div className="grid grid-cols-3 gap-3">
            <SummaryStat icon={GraduationCap} label="Classes"     value={totals.classes} />
            <SummaryStat icon={Users}         label="Students"    value={totals.enrolled} />
            <SummaryStat icon={FileText}      label="Assignments" value={totals.assignments} />
          </div>

          {/* Class cards — one per active course. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.map((c) => (
              <Link
                key={c.id}
                to={`/academy/c/${c.course_code.toLowerCase()}`}
                className="group block"
              >
                <Card
                  className={`${SOFT_CARD} h-full hover:translate-y-[-1px] transition-transform relative overflow-hidden`}
                  style={SOFT_CARD_STYLE}
                >
                  {/* Tenant accent stripe — picks up the secondary brand color. */}
                  <div className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
                  <CardContent className="p-5 pl-6">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs text-primary font-semibold uppercase tracking-wide">
                          <span>{c.course_code}</span>
                          {c.semester && (
                            <>
                              <span aria-hidden className="text-muted-foreground">·</span>
                              <span>{c.semester}</span>
                            </>
                          )}
                        </div>
                        <div className="text-lg font-semibold leading-snug mt-1">{c.title}</div>
                        {isPrivileged && c.instructor_name && (
                          <div className="text-sm text-muted-foreground mt-1">Taught by {c.instructor_name}</div>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-primary/60 group-hover:text-primary transition-colors shrink-0 mt-1" />
                    </div>

                    {/* Horizontal stat strip — never truncates because each pair lives on its own line. */}
                    <div className="border-t border-primary/15 pt-3 mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-foreground">{c.enrolled}</span>
                        enrolled
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <ClipboardCheck className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-foreground">{c.pending_attendance}</span>
                        pending
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-foreground">{c.open_assignments}</span>
                        active
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Combined recent-media bands. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RecentList
              title="Recent Scores"
              icon={Music}
              iconBg="bg-primary/10"
              iconFg="text-primary"
              viewAllHref="/dashboard/music-library"
              items={scores.slice(0, 6).map((s) => ({
                id: s.id,
                title: s.title,
                meta: null,
                courseCode: s.course_id ? courseCodeById[s.course_id] ?? null : null,
              }))}
              emptyMsg="No class scores yet."
            />
            <RecentList
              title="Recent Media"
              icon={ImageIcon}
              iconBg="bg-primary/10"
              iconFg="text-primary"
              viewAllHref="/dashboard/media-library"
              items={media.slice(0, 6).map((m) => ({
                id: m.id,
                title: m.title,
                meta: m.file_type,
                courseCode: m.course_id ? courseCodeById[m.course_id] ?? null : null,
              }))}
              emptyMsg="No class media yet."
            />
          </div>
        </>
      )}
    </DashboardPageShell>
  );
}

function SummaryStat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      {/* Stacked below sm — three-up at 390px leaves ~30px for the
          label in the row layout, which clipped "Assignments". */}
      <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-left">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-2xl font-bold leading-none">{value}</div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

interface RecentItem {
  id: string;
  title: string;
  meta: string | null;
  courseCode: string | null;
}

function RecentList({
  title, icon: Icon, iconBg, iconFg, viewAllHref, items, emptyMsg,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconFg: string;
  viewAllHref: string;
  items: RecentItem[];
  emptyMsg: string;
}) {
  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-muted-foreground" />
            <h2 className="font-semibold text-lg">{title}</h2>
          </div>
          <Link to={viewAllHref} className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
            {emptyMsg}
          </p>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.id} className="flex items-center gap-3 text-sm">
                <div className={`w-9 h-9 rounded-md ${iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${iconFg}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold leading-snug truncate">{it.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {it.meta && <span className="text-xs text-muted-foreground">{it.meta}</span>}
                    {it.courseCode && (
                      <Badge variant="outline" className="text-xs">{it.courseCode}</Badge>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
