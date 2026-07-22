// /academy/reports — per-course teaching analytics. v1 surfaces:
//   • Per-course enrollment count, average grade, pending submissions
//   • Students at risk (avg < 70% AND ≥2 pending OR ungraded)
// More detailed trends (attendance by week, assignment difficulty) are a
// follow-up — schema supports them.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3, BookOpen, Users, ClipboardCheck, AlertTriangle, ChevronRight, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

export default function ReportsPage() {
  const navigate = useNavigate();

  // Pull courses + their enrollments + submissions in parallel; aggregate
  // client-side. Switch to a materialized view if this gets heavy.
  const { data: courses = [], isLoading: cLoading } = useQuery({
    queryKey: ['reports-courses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_courses')
        .select('id, course_code, title')
        .eq('is_active', true)
        .order('course_code');
      return data ?? [];
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['reports-enrollments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_enrollments')
        .select('course_id, user_id, enrollment_status')
        .in('enrollment_status', ['enrolled', 'active', 'in_progress', 'registered']);
      return data ?? [];
    },
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['reports-submissions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_assignment_submissions')
        .select('id, score_value, graded_at, user_id, gw_assignments!inner(course_id, points)');
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    return courses.map((c: any) => {
      const courseEnrollments = enrollments.filter((e) => e.course_id === c.id);
      const courseSubs = submissions.filter((s: any) => s.gw_assignments?.course_id === c.id);
      const graded = courseSubs.filter((s: any) => s.graded_at && s.score_value !== null);
      const pending = courseSubs.filter((s: any) => !s.graded_at).length;
      const totalEarned = graded.reduce((sum: number, s: any) => sum + (s.score_value || 0), 0);
      const totalPossible = graded.reduce((sum: number, s: any) => sum + (s.gw_assignments?.points || 0), 0);
      const avg = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null;

      // Build per-student averages within this course to find at-risk.
      const studentTotals = new Map<string, { earned: number; possible: number }>();
      graded.forEach((s: any) => {
        const cur = studentTotals.get(s.user_id) || { earned: 0, possible: 0 };
        cur.earned += s.score_value || 0;
        cur.possible += s.gw_assignments?.points || 0;
        studentTotals.set(s.user_id, cur);
      });
      const atRisk = Array.from(studentTotals.entries()).filter(([_, t]) => t.possible > 0 && t.earned / t.possible < 0.7).length;

      return {
        course: c,
        enrolled: courseEnrollments.length,
        avg,
        pending,
        atRisk,
      };
    });
  }, [courses, enrollments, submissions]);

  const loading = cLoading;

  return (
    <UniversalLayout>
    <DashboardPageShell
      title="Reports"
      subtitle="A snapshot of each course — class size, grade average, what's pending, who needs help."
    >
      {loading ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></CardContent>
        </Card>
      ) : stats.length === 0 ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-10 text-center space-y-3">
            <BarChart3 className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">No courses to report on yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {stats.map((s: any) => (
            <Card key={s.course.id} className={SOFT_CARD} style={SOFT_CARD_STYLE}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 inline-flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-muted-foreground">{s.course.course_code}</div>
                    <div className="font-semibold truncate">{s.course.title}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/academy/c/${(s.course.course_code || '').toLowerCase()}`)}
                  >
                    Open <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <Metric label="Enrolled" value={s.enrolled} icon={Users} tone="bg-sky-50 text-sky-600" />
                  <Metric
                    label="Class avg"
                    value={s.avg === null ? '—' : `${s.avg}%`}
                    icon={BarChart3}
                    tone={s.avg === null
                      ? 'bg-muted text-muted-foreground'
                      : s.avg >= 80 ? 'bg-emerald-50 text-emerald-600'
                        : s.avg >= 70 ? 'bg-amber-50 text-amber-600'
                        : 'bg-rose-50 text-rose-600'}
                  />
                  <Metric label="To grade" value={s.pending} icon={ClipboardCheck} tone="bg-amber-50 text-amber-600" />
                  <Metric label="At risk" value={s.atRisk} icon={AlertTriangle} tone={s.atRisk > 0 ? 'bg-rose-50 text-rose-600' : 'bg-muted text-muted-foreground'} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardPageShell>
    </UniversalLayout>
  );
}

function Metric({
  label, value, icon: Icon, tone,
}: {
  label: string; value: React.ReactNode;
  icon: React.ElementType; tone: string;
}) {
  return (
    <div className="rounded-xl border p-3 flex items-center gap-2.5">
      <div className={cn('w-8 h-8 rounded-lg inline-flex items-center justify-center', tone)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
        <div className="text-base font-bold leading-none mt-0.5">{value}</div>
      </div>
    </div>
  );
}
