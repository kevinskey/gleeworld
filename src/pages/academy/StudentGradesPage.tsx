// /academy/grades — student's grade across every class they're enrolled
// in. Per-course average + per-assignment breakdown. Read-only view: RLS
// only returns the calling user's own submissions.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Loader2, BookOpen, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

type Row = {
  id: string;
  score_value: number | null;
  graded_at: string | null;
  submitted_at: string | null;
  feedback: string | null;
  gw_assignments?: {
    id: string;
    title: string;
    points: number | null;
    course_id: string;
    gw_courses?: { id: string; course_code: string; title: string };
  };
};

export default function StudentGradesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ['student-grades', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_assignment_submissions')
        .select('id, score_value, graded_at, submitted_at, feedback, gw_assignments!inner(id, title, points, course_id, gw_courses(id, course_code, title))')
        .eq('user_id', user!.id)
        .order('graded_at', { ascending: false, nullsFirst: false });
      return (data ?? []) as Row[];
    },
  });

  // Group rows by course.
  const byCourse = useMemo(() => {
    const map = new Map<string, { course: any; rows: Row[] }>();
    rows.forEach((r) => {
      const c = r.gw_assignments?.gw_courses;
      if (!c) return;
      if (!map.has(c.id)) map.set(c.id, { course: c, rows: [] });
      map.get(c.id)!.rows.push(r);
    });
    return Array.from(map.values());
  }, [rows]);

  return (
    <UniversalLayout>
    <DashboardPageShell
      maxWidth="4xl"
      title="My Grades"
      subtitle="Every graded assignment, grouped by class."
    >
      {isLoading ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></CardContent>
        </Card>
      ) : byCourse.length === 0 ? (
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-10 text-center space-y-3">
            <Award className="w-10 h-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">No grades yet. Submit something and it'll show up here.</p>
          </CardContent>
        </Card>
      ) : (
        byCourse.map(({ course, rows: cRows }) => (
          <CourseGradesCard key={course.id} course={course} rows={cRows} onClick={() => navigate(`/academy/c/${(course.course_code || '').toLowerCase()}`)} />
        ))
      )}
    </DashboardPageShell>
    </UniversalLayout>
  );
}

function CourseGradesCard({ course, rows, onClick }: { course: any; rows: Row[]; onClick: () => void }) {
  const graded = rows.filter((r) => r.graded_at && r.score_value !== null);
  const totalEarned = graded.reduce((s, r) => s + (r.score_value || 0), 0);
  const totalPossible = graded.reduce((s, r) => s + (r.gw_assignments?.points || 0), 0);
  const pct = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null;

  const letter = pct === null ? '—' :
    pct >= 93 ? 'A' : pct >= 90 ? 'A-' : pct >= 87 ? 'B+' : pct >= 83 ? 'B' :
    pct >= 80 ? 'B-' : pct >= 77 ? 'C+' : pct >= 73 ? 'C' : pct >= 70 ? 'C-' :
    pct >= 67 ? 'D+' : pct >= 60 ? 'D' : 'F';

  return (
    <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
      <CardContent className="p-5">
        <button
          onClick={onClick}
          className="w-full flex items-center gap-3 mb-3 text-left hover:bg-muted/40 -mx-2 px-2 py-1 rounded-lg transition"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 inline-flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono text-muted-foreground">{course.course_code}</div>
            <div className="font-semibold truncate">{course.title}</div>
          </div>
          <div className="text-right">
            <div className={cn(
              'text-2xl font-bold leading-none',
              pct === null ? 'text-muted-foreground' :
              pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-rose-600',
            )}>
              {pct === null ? '—' : `${pct}%`}
            </div>
            <div className="text-sm text-muted-foreground">{letter}</div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="divide-y border-t">
          {rows.map((r) => {
            const isGraded = !!r.graded_at && r.score_value !== null;
            const points = r.gw_assignments?.points;
            return (
              <div key={r.id} className="py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.gw_assignments?.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {r.graded_at
                      ? `Graded ${format(parseISO(r.graded_at), 'MMM d')}`
                      : r.submitted_at
                        ? `Submitted ${format(parseISO(r.submitted_at), 'MMM d')} · awaiting grade`
                        : 'Not submitted'}
                  </div>
                </div>
                {isGraded ? (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                    {r.score_value}{points ? ` / ${points}` : ''}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    Pending
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
