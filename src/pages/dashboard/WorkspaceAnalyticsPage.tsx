// /dashboard/analytics — tenant-wide rollups. v1 surfaces:
//   • Total users by role
//   • Active courses + enrollment totals
//   • Submissions graded / pending
//   • Recent attendance %
//   • Tests taken
//
// All queries are tenant-scoped via RLS; no cross-tenant leak possible.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users, GraduationCap, BookOpen, ClipboardCheck, Award, CalendarCheck,
  Loader2, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function WorkspaceAnalyticsPage() {
  const { data: profiles = [] } = useQuery({
    queryKey: ['analytics-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('gw_profiles').select('user_id, role, is_admin, is_super_admin, disabled');
      return data ?? [];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['analytics-courses'],
    queryFn: async () => {
      const { data } = await supabase.from('gw_courses').select('id, is_active');
      return data ?? [];
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['analytics-enrollments'],
    queryFn: async () => {
      const { data } = await supabase.from('gw_course_enrollments').select('user_id, course_id, enrollment_status');
      return data ?? [];
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['analytics-submissions'],
    queryFn: async () => {
      const { data } = await supabase.from('gw_assignment_submissions').select('id, score_value, graded_at, status');
      return data ?? [];
    },
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['analytics-attendance'],
    queryFn: async () => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const { data } = await supabase
        .from('gw_course_attendance')
        .select('status, session_date')
        .gte('session_date', cutoff.toISOString().slice(0, 10));
      return data ?? [];
    },
  });

  const { data: testAttempts = [] } = useQuery({
    queryKey: ['analytics-test-attempts'],
    queryFn: async () => {
      const { data } = await supabase.from('gw_course_test_attempts').select('id, is_graded, submitted_at');
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    const total = profiles.length;
    let admins = 0, instructors = 0, students = 0, fans = 0, disabled = 0;
    profiles.forEach((p: any) => {
      if (p.disabled) disabled++;
      if (p.is_super_admin || p.is_admin || p.role === 'admin' || p.role === 'super-admin') admins++;
      else if (p.role === 'instructor') instructors++;
      else if (p.role === 'student' || p.role === 'member') students++;
      else if (p.role === 'fan' || p.role === 'vip') fans++;
    });

    const activeCourses = courses.filter((c: any) => c.is_active).length;
    const totalEnrollments = enrollments.filter((e: any) => ['enrolled', 'active', 'in_progress', 'registered'].includes(e.enrollment_status)).length;

    const graded = submissions.filter((s: any) => s.graded_at).length;
    const pending = submissions.filter((s: any) => !s.graded_at).length;

    const present = attendance.filter((a: any) => a.status === 'present').length;
    const attTotal = attendance.length;
    const attPct = attTotal > 0 ? Math.round((present / attTotal) * 100) : null;

    const testsTaken = testAttempts.filter((a: any) => a.submitted_at).length;
    const testsGraded = testAttempts.filter((a: any) => a.is_graded).length;

    return {
      total, admins, instructors, students, fans, disabled,
      activeCourses, totalEnrollments,
      graded, pending,
      attPct, attTotal,
      testsTaken, testsGraded,
    };
  }, [profiles, courses, enrollments, submissions, attendance, testAttempts]);

  const isLoading = profiles.length === 0 && courses.length === 0;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="!text-[1.4rem] sm:!text-[2rem] font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Workspace Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tenant-wide rollups across users, courses, grading, and attendance.
        </p>
      </div>

      {isLoading ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></CardContent>
        </Card>
      ) : (
        <>
          {/* People */}
          <Section title="People" icon={Users}>
            <StatGrid cols={5}>
              <StatTile label="Total" value={stats.total} tone="sky" icon={Users} />
              <StatTile label="Admins" value={stats.admins} tone="purple" icon={GraduationCap} />
              <StatTile label="Teachers" value={stats.instructors} tone="emerald" icon={GraduationCap} />
              <StatTile label="Students" value={stats.students} tone="amber" icon={Users} />
              <StatTile label="Fans" value={stats.fans} tone="rose" icon={Users} />
            </StatGrid>
            {stats.disabled > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">{stats.disabled} disabled</Badge>
              </p>
            )}
          </Section>

          {/* Courses */}
          <Section title="Courses" icon={BookOpen}>
            <StatGrid cols={2}>
              <StatTile label="Active courses" value={stats.activeCourses} tone="emerald" icon={BookOpen} />
              <StatTile label="Total enrollments" value={stats.totalEnrollments} tone="sky" icon={Users} />
            </StatGrid>
          </Section>

          {/* Grading */}
          <Section title="Grading" icon={ClipboardCheck}>
            <StatGrid cols={2}>
              <StatTile label="Graded submissions" value={stats.graded} tone="emerald" icon={ClipboardCheck} />
              <StatTile label="Pending submissions" value={stats.pending} tone={stats.pending > 0 ? 'amber' : 'emerald'} icon={ClipboardCheck} />
            </StatGrid>
          </Section>

          {/* Attendance */}
          <Section title="Attendance (last 30 days)" icon={CalendarCheck}>
            <StatGrid cols={2}>
              <StatTile
                label="Attendance rate"
                value={stats.attPct === null ? '—' : `${stats.attPct}%`}
                tone={stats.attPct === null ? 'muted' : stats.attPct >= 90 ? 'emerald' : stats.attPct >= 75 ? 'amber' : 'rose'}
                icon={CalendarCheck}
              />
              <StatTile label="Sessions tracked" value={stats.attTotal} tone="sky" icon={CalendarCheck} />
            </StatGrid>
          </Section>

          {/* Tests */}
          <Section title="Quizzes" icon={Award}>
            <StatGrid cols={2}>
              <StatTile label="Submitted" value={stats.testsTaken} tone="emerald" icon={Award} />
              <StatTile label="Auto/manually graded" value={stats.testsGraded} tone="sky" icon={ClipboardCheck} />
            </StatGrid>
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title, icon: Icon, children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function StatGrid({ cols, children }: { cols: number; children: React.ReactNode }) {
  return (
    <div className={cn(
      'grid gap-3',
      cols === 5 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      : cols === 4 ? 'grid-cols-2 lg:grid-cols-4'
      : cols === 3 ? 'grid-cols-3'
      : 'grid-cols-2',
    )}>
      {children}
    </div>
  );
}

function StatTile({
  label, value, tone, icon: Icon,
}: {
  label: string;
  value: number | string;
  tone: 'sky' | 'purple' | 'emerald' | 'amber' | 'rose' | 'muted';
  icon: React.ElementType;
}) {
  const tones: Record<string, string> = {
    sky:     'bg-sky-50 text-sky-700 border-sky-200',
    purple:  'bg-purple-50 text-purple-700 border-purple-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    rose:    'bg-rose-50 text-rose-700 border-rose-200',
    muted:   'bg-muted text-muted-foreground border-border',
  };
  return (
    <div className={cn('rounded-xl border p-3', tones[tone])}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase tracking-wide font-semibold">{label}</span>
      </div>
      <div className="text-2xl font-bold leading-none">{value}</div>
    </div>
  );
}
