// Canvas-backed gradebook (student view) — overall course grade +
// per-assignment breakdown. Read-only.

import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, ArrowLeft, AlertCircle, GraduationCap } from 'lucide-react';
import { useCanvasCourseGrades } from '@/hooks/useCanvasAcademy';

function formatDue(d: string | null) {
  if (!d) return 'No due date';
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CanvasCourseGrades() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId ? Number(params.courseId) : null;
  const { data, isLoading, error } = useCanvasCourseGrades(courseId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading grades…
      </div>
    );
  }
  if (error || !data || 'error' in data) {
    const msg = (error as Error | undefined)?.message ?? (data && 'detail' in data ? data.detail : 'Unknown error');
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Could not load grades</div>
            <div className="text-xs mt-0.5">{msg}</div>
          </div>
        </div>
      </div>
    );
  }
  const { overall, assignments } = data;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto space-y-5">
      <div>
        <Link to={`/academy/canvas/courses/${courseId}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to course
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Grades</h1>
      </div>

      <Card className="border-0 rounded-2xl bg-card shadow-sm">
        <CardContent className="p-5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Current grade</div>
              <div className="text-3xl font-bold">
                {overall.current_score !== null ? `${overall.current_score}%` : '—'}
                {overall.current_grade && <span className="text-base text-muted-foreground ml-2">({overall.current_grade})</span>}
              </div>
            </div>
          </div>
          {overall.final_score !== null && (
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Projected final</div>
              <div className="text-xl font-semibold">
                {overall.final_score}%
                {overall.final_grade && <span className="text-sm text-muted-foreground ml-1">({overall.final_grade})</span>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 rounded-2xl bg-card shadow-sm">
        <CardContent className="p-5 overflow-x-auto">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Assignments</h2>
          {assignments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assignments yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b border-border">
                  <th className="text-left py-2 font-semibold">Assignment</th>
                  <th className="text-left py-2 font-semibold">Due</th>
                  <th className="text-right py-2 font-semibold">Possible</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-border/40 last:border-0">
                    <td className="py-2.5">
                      <Link to={`/academy/canvas/courses/${courseId}/assignments/${a.id}`} className="hover:text-primary">
                        {a.name}
                      </Link>
                    </td>
                    <td className="py-2.5 text-xs text-muted-foreground">{formatDue(a.due_at)}</td>
                    <td className="py-2.5 text-right text-xs font-mono">{a.points_possible ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Per-assignment scores show on each assignment's detail page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
