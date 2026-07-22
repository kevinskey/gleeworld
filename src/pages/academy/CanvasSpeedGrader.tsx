// SpeedGrader-lite — per-assignment teacher view for grading one
// student at a time. Shows the submission (text/url/files), comment
// thread, rubric (if attached, click-to-score), grade input. Prev/next
// navigation between students sorted by name.
//
// Honors anonymous_grading by masking student names.

import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, ArrowLeft, AlertCircle, ChevronLeft, ChevronRight,
  CheckCircle2, ExternalLink, Download, FileText,
} from 'lucide-react';
import {
  useCanvasAssignment, useAssignmentSubmissions, useCanvasSubmission, useUpdateSubmission,
  type CanvasAssignmentSubmission, type CanvasRubricCriterion,
} from '@/hooks/useCanvasAcademy';
import { toast } from 'sonner';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CanvasSpeedGrader() {
  const params = useParams<{ courseId: string; assignmentId: string }>();
  const courseId = params.courseId ? Number(params.courseId) : null;
  const assignmentId = params.assignmentId ? Number(params.assignmentId) : null;

  const assignmentQ = useCanvasAssignment(courseId, assignmentId);
  const submissionsQ = useAssignmentSubmissions(courseId, assignmentId);

  const submissions: CanvasAssignmentSubmission[] = useMemo(() => {
    if (!submissionsQ.data || 'error' in submissionsQ.data) return [];
    return submissionsQ.data.submissions.slice().sort((a, b) =>
      (a.sortable_name ?? a.user_name).localeCompare(b.sortable_name ?? b.user_name));
  }, [submissionsQ.data]);

  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  useEffect(() => {
    if (activeUserId === null && submissions.length > 0) setActiveUserId(submissions[0].user_id);
  }, [submissions, activeUserId]);

  const activeIdx = submissions.findIndex((s) => s.user_id === activeUserId);
  const hasPrev = activeIdx > 0;
  const hasNext = activeIdx >= 0 && activeIdx < submissions.length - 1;

  if (assignmentQ.isLoading || submissionsQ.isLoading) {
    return <UniversalLayout><div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading SpeedGrader…
    </div></UniversalLayout>;
  }
  if (assignmentQ.error || !assignmentQ.data || 'error' in assignmentQ.data) {
    return <UniversalLayout><div className="max-w-4xl mx-auto p-6">
      <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>Could not load assignment.</div>
      </div>
    </div></UniversalLayout>;
  }
  const a = assignmentQ.data.assignment;
  const anon = a.anonymous_grading;

  return (
    <UniversalLayout>
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto space-y-4">
      <div>
        <Link to={`/academy/canvas/courses/${courseId}/gradebook`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Gradebook
        </Link>
        <div className="flex items-end justify-between gap-3 flex-wrap mt-1">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{a.name}</h1>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
              {a.points_possible !== null && <span>{a.points_possible} pts</span>}
              {anon && <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Anonymous</Badge>}
              {a.rubric && <Badge variant="outline">{a.rubric.length}-criterion rubric</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={!hasPrev} onClick={() => setActiveUserId(submissions[activeIdx - 1].user_id)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {activeIdx + 1} / {submissions.length}
            </span>
            <Button size="sm" variant="outline" disabled={!hasNext} onClick={() => setActiveUserId(submissions[activeIdx + 1].user_id)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {submissions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No submissions to grade.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          {/* Sidebar: student list */}
          <Card className="lg:max-h-[80vh] lg:overflow-y-auto">
            <CardContent className="p-2">
              <ul>
                {submissions.map((s, i) => (
                  <li key={s.user_id}>
                    <button
                      onClick={() => setActiveUserId(s.user_id)}
                      className={`w-full text-left p-2 rounded text-sm flex items-center justify-between gap-2 ${activeUserId === s.user_id ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted/50'}`}
                    >
                      <span className="truncate">{anon ? `Student ${i + 1}` : s.user_name}</span>
                      {s.workflow_state === 'graded'
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        : s.workflow_state === 'unsubmitted'
                          ? <span className="text-[10px] text-muted-foreground">—</span>
                          : <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Active submission */}
          {activeUserId && courseId && assignmentId && (
            <SubmissionPanel
              courseId={courseId}
              assignmentId={assignmentId}
              userId={activeUserId}
              pointsPossible={a.points_possible}
              rubric={a.rubric}
              anonymous={anon}
              anonLabel={`Student ${activeIdx + 1}`}
            />
          )}
        </div>
      )}
    </div>
    </UniversalLayout>
  );
}

function SubmissionPanel({
  courseId, assignmentId, userId, pointsPossible, rubric, anonymous, anonLabel,
}: {
  courseId: number; assignmentId: number; userId: number;
  pointsPossible: number | null;
  rubric: CanvasRubricCriterion[] | null;
  anonymous: boolean; anonLabel: string;
}) {
  const { data, isLoading } = useCanvasSubmission(courseId, assignmentId, userId);
  const update = useUpdateSubmission(courseId, assignmentId);

  const [score, setScore] = useState<string>('');
  const [comment, setComment] = useState('');
  const [rubricState, setRubricState] = useState<Record<string, { points?: number; rating_id?: string }>>({});

  // Reset local state when active submission changes.
  useEffect(() => {
    if (data && 'ok' in data) {
      setScore(data.submission.score?.toString() ?? '');
      setComment('');
      const cleaned: Record<string, { points?: number; rating_id?: string }> = {};
      if (data.submission.rubric_assessment) {
        for (const [k, v] of Object.entries(data.submission.rubric_assessment)) {
          cleaned[k] = { points: v.points, rating_id: v.rating_id };
        }
      }
      setRubricState(cleaned);
    }
  }, [data]);

  if (isLoading) return <Card><CardContent className="py-12 flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading submission…</CardContent></Card>;
  if (!data || 'error' in data) return <Card><CardContent className="py-6 text-sm text-destructive">Could not load submission.</CardContent></Card>;
  const s = data.submission;
  const displayName = anonymous ? anonLabel : s.user_name;

  const rubricTotal = rubric
    ? rubric.reduce((sum, c) => sum + (rubricState[c.id]?.points ?? 0), 0)
    : 0;

  const save = async () => {
    try {
      const ra: Record<string, { points?: number; rating_id?: string }> = {};
      if (rubric) {
        for (const c of rubric) {
          const v = rubricState[c.id];
          if (v && (v.points !== undefined || v.rating_id)) ra[c.id] = v;
        }
      }
      await update.mutateAsync({
        user_id: userId,
        posted_grade: score !== (s.score?.toString() ?? '') ? score : undefined,
        comment: comment.trim() || undefined,
        rubric_assessment: Object.keys(ra).length ? ra : undefined,
      });
      toast.success(`Saved for ${displayName}`);
      setComment('');
    } catch (e) {
      toast.error('Could not save', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            {!anonymous && s.user_avatar
              ? <img src={s.user_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
              : <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm">{displayName.charAt(0)}</div>
            }
            <div>
              <div className="font-semibold">{displayName}</div>
              <div className="text-xs text-muted-foreground">
                {s.submitted_at ? `Submitted ${formatDate(s.submitted_at)}` : 'No submission'}
                {s.late && <span className="ml-2 text-amber-700">· Late</span>}
                {s.missing && <span className="ml-2 text-rose-700">· Missing</span>}
              </div>
            </div>
          </div>

          {s.body && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Text submission</div>
              <div className="prose prose-sm max-w-none border border-border rounded p-3 bg-muted/20" dangerouslySetInnerHTML={{ __html: s.body }} />
            </div>
          )}
          {s.url && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">URL submission</div>
              <a href={s.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1 break-all">
                {s.url} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}
          {s.attachments.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Files</div>
              <ul className="space-y-1">
                {s.attachments.map((f) => (
                  <li key={f.id} className="flex items-center gap-2 text-sm">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="flex-1 truncate">{f.name} <span className="text-xs text-muted-foreground">({Math.round(f.size / 1024)} KB)</span></span>
                    <a href={f.url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline"><Download className="w-3 h-3 mr-1" /> Open</Button>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {rubric && rubric.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rubric</h3>
              <Badge variant="outline">Total: {rubricTotal}{pointsPossible !== null ? ` / ${pointsPossible}` : ''}</Badge>
            </div>
            <ul className="space-y-3">
              {rubric.map((c) => {
                const picked = rubricState[c.id];
                return (
                  <li key={c.id}>
                    <div className="font-medium text-sm mb-1">
                      {c.description} <span className="text-xs text-muted-foreground">({c.points} pts max)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.ratings.map((r) => {
                        const active = picked?.rating_id === r.id;
                        return (
                          <button
                            key={r.id}
                            onClick={() => setRubricState({ ...rubricState, [c.id]: { points: r.points, rating_id: r.id } })}
                            className={`text-xs px-2 py-1 rounded-md border transition-colors ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted border-border'}`}
                          >
                            <span className="font-mono mr-1">{r.points}</span> {r.description}
                          </button>
                        );
                      })}
                      {picked && (
                        <button
                          onClick={() => {
                            const { [c.id]: _drop, ...rest } = rubricState;
                            setRubricState(rest);
                          }}
                          className="text-xs px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground"
                        >Clear</button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Grade</div>
              <div className="flex items-center gap-2">
                <Input value={score} onChange={(e) => setScore(e.target.value)} className="w-32" placeholder="—" />
                {pointsPossible !== null && <span className="text-sm text-muted-foreground">/ {pointsPossible}</span>}
                {rubric && rubric.length > 0 && rubricTotal > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setScore(String(rubricTotal))}>
                    Use rubric total ({rubricTotal})
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Comment (optional)</div>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Feedback for the student…" />
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={update.isPending}>
              {update.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Saving…</> : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {s.comments.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Comments</h3>
            <ul className="space-y-2">
              {s.comments.map((c) => (
                <li key={c.id} className="text-sm">
                  <div className="text-xs text-muted-foreground">{c.author} · {formatDate(c.at)}</div>
                  <div className="mt-0.5">{c.body}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
