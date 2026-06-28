// Canvas-backed assignment detail — description, due date, submission
// + grade + instructor comments. Now includes in-app submission for
// text, URL, and file types.

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, Calendar, AlertCircle, CheckCircle2, MessageSquare, Upload, FileText, Link as LinkIcon, X } from 'lucide-react';
import { useCanvasAssignment, useSubmitAssignment, useMyPeerReviews, useMyGroup } from '@/hooks/useCanvasAcademy';
import { Users } from 'lucide-react';
import { toast } from 'sonner';

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function CanvasAssignmentDetail() {
  const params = useParams<{ courseId: string; assignmentId: string }>();
  const courseId = params.courseId ? Number(params.courseId) : null;
  const assignmentId = params.assignmentId ? Number(params.assignmentId) : null;
  const { data, isLoading, error } = useCanvasAssignment(courseId, assignmentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading assignment…
      </div>
    );
  }
  if (error || !data || 'error' in data) {
    const msg = (error as Error | undefined)?.message ?? (data && 'detail' in data ? data.detail : 'Unknown error');
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-sm text-destructive p-3 rounded-lg border border-destructive/30 bg-destructive/5 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="font-semibold">Could not load assignment</div>
            <div className="text-xs mt-0.5">{msg}</div>
          </div>
        </div>
      </div>
    );
  }
  const { assignment } = data;
  const s = assignment.submission;
  const types = assignment.submission_types ?? [];
  const allowsSubmission = types.some((t) => ['online_text_entry', 'online_url', 'online_upload'].includes(t));
  const alreadySubmitted = s && s.state !== 'unsubmitted' && s.submitted_at;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto space-y-5">
      <div>
        <Link to={`/academy/canvas/courses/${courseId}`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> Back to course
        </Link>
        <h1 className="text-2xl font-bold tracking-tight mt-1">{assignment.name}</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
          <Calendar className="w-3 h-3" /> Due {formatDate(assignment.due_at)}
          {assignment.points_possible !== null && <span>· {assignment.points_possible} pts possible</span>}
        </div>
      </div>

      {assignment.description && (
        <Card className="border-0 rounded-2xl bg-card shadow-sm">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Description</h2>
            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: assignment.description }} />
          </CardContent>
        </Card>
      )}

      <Card className="border-0 rounded-2xl bg-card shadow-sm">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Your submission</h2>
          {!s || s.state === 'unsubmitted' ? (
            <div className="text-sm text-muted-foreground">
              No submission yet.
              {s?.missing && <Badge variant="outline" className="ml-2 text-xs bg-rose-50 text-rose-700 border-rose-200">Missing</Badge>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-semibold">Submitted {formatDate(s.submitted_at)}</span>
                {s.late && <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">Late</Badge>}
              </div>
              {(s.score !== null || s.grade !== null) && (
                <div className="flex items-center gap-3">
                  {s.score !== null && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Score</div>
                      <div className="text-2xl font-bold">
                        {s.score}
                        {assignment.points_possible !== null && <span className="text-base text-muted-foreground">/{assignment.points_possible}</span>}
                      </div>
                    </div>
                  )}
                  {s.grade !== null && s.grade !== String(s.score) && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Letter</div>
                      <div className="text-2xl font-bold">{s.grade}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {assignment.group_category_id !== null && (
        <GroupPanel groupCategoryId={assignment.group_category_id} />
      )}

      {courseId && assignmentId && (
        <PeerReviewPanel courseId={courseId} assignmentId={assignmentId} />
      )}

      {courseId && assignmentId && allowsSubmission && (
        <SubmitCard
          courseId={courseId}
          assignmentId={assignmentId}
          types={types}
          isResubmit={!!alreadySubmitted}
        />
      )}

      {s && s.comments.length > 0 && (
        <Card className="border-0 rounded-2xl bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Instructor feedback</h2>
            </div>
            <ul className="space-y-3">
              {s.comments.map((c, i) => (
                <li key={i} className="text-sm">
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

function GroupPanel({ groupCategoryId }: { groupCategoryId: number }) {
  const { data, isLoading } = useMyGroup(groupCategoryId);
  if (isLoading || !data || 'error' in data || !data.group) return null;
  return (
    <Card className="border-0 rounded-2xl bg-card shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Group assignment · {data.group.name}
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          One submission per group. Whichever member submits, it counts for everyone.
        </p>
        <ul className="space-y-1.5">
          {data.members.map((m) => (
            <li key={m.id} className="flex items-center gap-2 text-sm">
              {m.avatar_url
                ? <img src={m.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                : <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">{m.name.charAt(0)}</div>
              }
              <span>{m.name}</span>
              {m.is_self && <Badge variant="outline" className="text-[10px]">You</Badge>}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function PeerReviewPanel({ courseId, assignmentId }: { courseId: number; assignmentId: number }) {
  const { data, isLoading } = useMyPeerReviews(courseId, assignmentId);
  if (isLoading || !data || 'error' in data || data.reviews.length === 0) return null;
  return (
    <Card className="border-0 rounded-2xl bg-card shadow-sm">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Peer reviews to complete ({data.reviews.length})
        </h2>
        <ul className="space-y-2">
          {data.reviews.map((r) => (
            <li key={r.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
              {r.reviewee_avatar
                ? <img src={r.reviewee_avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                : <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs">{r.reviewee_name.charAt(0)}</div>
              }
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{r.reviewee_name}</div>
                {r.workflow_state === 'completed' && (
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">Complete</Badge>
                )}
              </div>
              <Link to={`/academy/canvas/courses/${courseId}/assignments/${assignmentId}/peer-review/${r.user_id}`}>
                <Button size="sm" variant={r.workflow_state === 'completed' ? 'outline' : 'default'}>
                  {r.workflow_state === 'completed' ? 'View' : 'Review'}
                </Button>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function SubmitCard({
  courseId, assignmentId, types, isResubmit,
}: {
  courseId: number; assignmentId: number; types: string[]; isResubmit: boolean;
}) {
  const submit = useSubmitAssignment();
  const allowText = types.includes('online_text_entry');
  const allowUrl = types.includes('online_url');
  const allowUpload = types.includes('online_upload');
  const defaultTab = allowUpload ? 'file' : allowText ? 'text' : 'url';

  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [comment, setComment] = useState('');
  const [tab, setTab] = useState(defaultTab);

  const doSubmit = async () => {
    try {
      if (tab === 'text') {
        if (!text.trim()) return;
        await submit.mutateAsync({ course_id: courseId, assignment_id: assignmentId, type: 'text', body: text, comment: comment || undefined });
      } else if (tab === 'url') {
        if (!url.trim()) return;
        await submit.mutateAsync({ course_id: courseId, assignment_id: assignmentId, type: 'url', url, comment: comment || undefined });
      } else {
        if (files.length === 0) return;
        await submit.mutateAsync({ course_id: courseId, assignment_id: assignmentId, type: 'file', files, comment: comment || undefined });
      }
      toast.success(isResubmit ? 'Resubmitted' : 'Submitted');
      setText(''); setUrl(''); setFiles([]); setComment('');
    } catch (e) {
      toast.error('Could not submit', { description: e instanceof Error ? e.message : String(e) });
    }
  };

  const tabCount = [allowText, allowUrl, allowUpload].filter(Boolean).length;

  return (
    <Card className="border-0 rounded-2xl bg-card shadow-sm">
      <CardContent className="p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {isResubmit ? 'Resubmit' : 'Submit assignment'}
        </h2>

        <Tabs value={tab} onValueChange={setTab}>
          {tabCount > 1 && (
            <TabsList className="mb-3">
              {allowUpload && <TabsTrigger value="file"><Upload className="w-3.5 h-3.5 mr-1" /> File</TabsTrigger>}
              {allowText && <TabsTrigger value="text"><FileText className="w-3.5 h-3.5 mr-1" /> Text</TabsTrigger>}
              {allowUrl && <TabsTrigger value="url"><LinkIcon className="w-3.5 h-3.5 mr-1" /> URL</TabsTrigger>}
            </TabsList>
          )}

          {allowUpload && (
            <TabsContent value="file" className="space-y-2">
              <Input
                type="file"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              {files.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-muted/40">
                      <span className="truncate">{f.name} <span className="opacity-60">({Math.round(f.size / 1024)} KB)</span></span>
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))} className="opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          )}

          {allowText && (
            <TabsContent value="text">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your submission…" rows={6} />
            </TabsContent>
          )}

          {allowUrl && (
            <TabsContent value="url">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" type="url" />
            </TabsContent>
          )}
        </Tabs>

        <div className="mt-3">
          <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment to instructor (optional)" />
        </div>

        <div className="mt-3 flex justify-end">
          <Button onClick={doSubmit} disabled={submit.isPending}>
            {submit.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Submitting…</>
            ) : (
              isResubmit ? 'Resubmit' : 'Submit'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
