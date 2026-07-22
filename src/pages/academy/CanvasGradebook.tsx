// Canvas-backed gradebook quick-edit. Pick an assignment, see all
// students' submissions, edit score + comment per row. Teachers only —
// Canvas rejects edits from students with 401 anyway, but we hide the
// link from non-teachers.

import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, AlertCircle, CheckCircle2, GraduationCap } from 'lucide-react';
import {
  useCanvasCourse, useAssignmentSubmissions, useUpdateSubmission,
  type CanvasAssignmentSubmission,
} from '@/hooks/useCanvasAcademy';
import { toast } from 'sonner';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

export default function CanvasGradebook() {
  const params = useParams<{ courseId: string }>();
  const courseId = params.courseId ? Number(params.courseId) : null;
  const { data: courseData, isLoading: courseLoading } = useCanvasCourse(courseId);
  const [assignmentId, setAssignmentId] = useState<number | null>(null);

  // Auto-select first assignment.
  const assignments = courseData && 'ok' in courseData ? courseData.assignments : [];
  if (!assignmentId && assignments.length > 0) {
    setTimeout(() => setAssignmentId(assignments[0].id), 0);
  }

  const selectedAssignment = assignments.find((a) => a.id === assignmentId) ?? null;

  return (
    <UniversalLayout>
    <div className="px-4 sm:px-6 py-6 max-w-6xl mx-auto space-y-5">
      <div>
        <Link to={`/academy/canvas/courses/${courseId}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to course
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Gradebook</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {courseData && 'ok' in courseData ? courseData.course.name : ''}
        </p>
      </div>

      {courseLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-sm text-muted-foreground space-y-2">
            <GraduationCap className="w-6 h-6 mx-auto opacity-40" />
            <p>No assignments yet — nothing to grade.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4 flex items-center gap-3 flex-wrap">
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Assignment</div>
              <Select
                value={assignmentId ? String(assignmentId) : ''}
                onValueChange={(v) => setAssignmentId(Number(v))}
              >
                <SelectTrigger className="w-full sm:w-96">
                  <SelectValue placeholder="Pick an assignment" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name} {a.points_possible !== null && <span className="text-muted-foreground">· {a.points_possible} pts</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAssignment?.points_possible !== null && selectedAssignment?.points_possible !== undefined && (
                <Badge variant="outline">{selectedAssignment.points_possible} pts</Badge>
              )}
              {selectedAssignment && (
                <Link to={`/academy/canvas/courses/${courseId}/assignments/${selectedAssignment.id}/grade`} className="ml-auto">
                  <Button size="sm" variant="outline">Open SpeedGrader →</Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {courseId && assignmentId && (
            <GradebookGrid
              courseId={courseId}
              assignmentId={assignmentId}
              pointsPossible={selectedAssignment?.points_possible ?? null}
            />
          )}
        </>
      )}
    </div>
    </UniversalLayout>
  );
}

function GradebookGrid({
  courseId, assignmentId, pointsPossible,
}: { courseId: number; assignmentId: number; pointsPossible: number | null }) {
  const { data, isLoading, error } = useAssignmentSubmissions(courseId, assignmentId);
  const sorted = useMemo(() => {
    if (!data || 'error' in data) return [] as CanvasAssignmentSubmission[];
    return data.submissions.slice().sort((a, b) =>
      (a.sortable_name ?? a.user_name).localeCompare(b.sortable_name ?? b.user_name));
  }, [data]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading submissions…</div>;
  }
  if (error || !data || 'error' in data) {
    return (
      <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>Could not load submissions.</div>
      </div>
    );
  }
  if (sorted.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">No students enrolled.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              <th className="text-left p-3 font-semibold">Student</th>
              <th className="text-left p-3 font-semibold w-32">Status</th>
              <th className="text-left p-3 font-semibold w-32">Score</th>
              <th className="text-left p-3 font-semibold">Comment</th>
              <th className="p-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => (
              <GradeRow
                key={s.user_id}
                courseId={courseId}
                assignmentId={assignmentId}
                row={s}
                pointsPossible={pointsPossible}
              />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function GradeRow({
  courseId, assignmentId, row, pointsPossible,
}: {
  courseId: number; assignmentId: number; row: CanvasAssignmentSubmission;
  pointsPossible: number | null;
}) {
  const [score, setScore] = useState(row.score?.toString() ?? '');
  const [comment, setComment] = useState('');
  const update = useUpdateSubmission(courseId, assignmentId);
  const dirty = score !== (row.score?.toString() ?? '') || comment.trim().length > 0;

  const save = async () => {
    try {
      await update.mutateAsync({
        user_id: row.user_id,
        posted_grade: score !== (row.score?.toString() ?? '') ? score : undefined,
        comment: comment.trim() || undefined,
      });
      toast.success(`Saved for ${row.user_name}`);
      setComment('');
    } catch (e) {
      toast.error('Could not save', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <tr className="border-b border-border last:border-0">
      <td className="p-3">
        <div className="flex items-center gap-2">
          {row.user_avatar ? (
            <img src={row.user_avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <div className="w-6 h-6 rounded-full bg-muted text-xs flex items-center justify-center">{row.user_name.charAt(0)}</div>
          )}
          <span className="truncate">{row.user_name}</span>
        </div>
      </td>
      <td className="p-3">
        {row.workflow_state === 'unsubmitted' ? (
          row.missing
            ? <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200">Missing</Badge>
            : <span className="text-xs text-muted-foreground">No submission</span>
        ) : row.workflow_state === 'graded' ? (
          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-0.5" /> Graded</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">{row.workflow_state}</Badge>
        )}
        {row.late && <Badge variant="outline" className="ml-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200">Late</Badge>}
      </td>
      <td className="p-3">
        <div className="flex items-center gap-1">
          <Input
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-20 h-8 text-sm"
            placeholder="—"
          />
          {pointsPossible !== null && <span className="text-xs text-muted-foreground">/ {pointsPossible}</span>}
        </div>
      </td>
      <td className="p-3">
        <Input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="h-8 text-sm"
          placeholder="Add comment (optional)"
        />
      </td>
      <td className="p-3 text-right">
        <Button size="sm" disabled={!dirty || update.isPending} onClick={save}>
          {update.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
        </Button>
      </td>
    </tr>
  );
}
