// Peer review form — single-reviewee version of the grading panel.
// Shows the assignee's submission, the rubric (click-to-score), and
// a comment box. Submits via the same updateSubmission endpoint that
// teachers use (Canvas distinguishes by assessor relationship).

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, AlertCircle, ExternalLink, Download, FileText } from 'lucide-react';
import { useCanvasAssignment, useCanvasSubmission, useUpdateSubmission } from '@/hooks/useCanvasAcademy';
import { toast } from 'sonner';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CanvasPeerReview() {
  const params = useParams<{ courseId: string; assignmentId: string; userId: string }>();
  const courseId = params.courseId ? Number(params.courseId) : null;
  const assignmentId = params.assignmentId ? Number(params.assignmentId) : null;
  const userId = params.userId ? Number(params.userId) : null;
  const assignmentQ = useCanvasAssignment(courseId, assignmentId);
  const submissionQ = useCanvasSubmission(courseId, assignmentId, userId);
  const update = useUpdateSubmission(courseId, assignmentId);

  const [comment, setComment] = useState('');
  const [rubricState, setRubricState] = useState<Record<string, { points?: number; rating_id?: string }>>({});

  useEffect(() => {
    if (submissionQ.data && 'ok' in submissionQ.data) {
      const ra = submissionQ.data.submission.rubric_assessment;
      if (ra) {
        const cleaned: Record<string, { points?: number; rating_id?: string }> = {};
        for (const [k, v] of Object.entries(ra)) cleaned[k] = { points: v.points, rating_id: v.rating_id };
        setRubricState(cleaned);
      }
    }
  }, [submissionQ.data]);

  if (assignmentQ.isLoading || submissionQ.isLoading) {
    return <UniversalLayout><div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading peer review…
    </div></UniversalLayout>;
  }
  if (!assignmentQ.data || 'error' in assignmentQ.data || !submissionQ.data || 'error' in submissionQ.data) {
    return <UniversalLayout><div className="max-w-4xl mx-auto p-6">
      <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>Could not load peer review.</div>
      </div>
    </div></UniversalLayout>;
  }
  const a = assignmentQ.data.assignment;
  const s = submissionQ.data.submission;
  const rubric = a.rubric;

  const submit = async () => {
    try {
      const ra: Record<string, { points?: number; rating_id?: string }> = {};
      if (rubric) {
        for (const c of rubric) {
          const v = rubricState[c.id];
          if (v && (v.points !== undefined || v.rating_id)) ra[c.id] = v;
        }
      }
      if (!comment.trim() && Object.keys(ra).length === 0) {
        toast.error('Add a comment or score the rubric before submitting.');
        return;
      }
      await update.mutateAsync({
        user_id: userId!,
        comment: comment.trim() || undefined,
        rubric_assessment: Object.keys(ra).length ? ra : undefined,
      });
      toast.success('Review submitted');
      setComment('');
    } catch (e) {
      toast.error('Could not submit review', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <UniversalLayout>
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-4">
      <div>
        <Link to={`/academy/canvas/courses/${courseId}/assignments/${assignmentId}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to assignment
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">Peer review</h1>
        <div className="text-sm text-muted-foreground mt-0.5">
          Reviewing {s.user_name} on <span className="font-medium text-foreground">{a.name}</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            {s.user_avatar
              ? <img src={s.user_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
              : <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">{s.user_name.charAt(0)}</div>
            }
            <div className="text-xs">
              <div className="font-semibold">{s.user_name}</div>
              <div className="text-muted-foreground">
                {s.submitted_at ? `Submitted ${formatDate(s.submitted_at)}` : 'No submission'}
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
            <a href={s.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
              Open URL submission <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {s.attachments.length > 0 && (
            <ul className="space-y-1">
              {s.attachments.map((f) => (
                <li key={f.id} className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="flex-1 truncate">{f.name}</span>
                  <a href={f.url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline"><Download className="w-3 h-3 mr-1" /> Open</Button>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {rubric && rubric.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rubric</h3>
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
                            className={`text-xs px-2 py-1 rounded-md border ${active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted border-border'}`}
                          >
                            <span className="font-mono mr-1">{r.points}</span> {r.description}
                          </button>
                        );
                      })}
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
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Your feedback</div>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="Constructive feedback for your peer…" />
          </div>
          <div className="flex justify-end items-center gap-2">
            <Badge variant="outline" className="text-[10px]">Posted as your peer review</Badge>
            <Button onClick={submit} disabled={update.isPending}>
              {update.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Submitting…</> : 'Submit review'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </UniversalLayout>
  );
}
