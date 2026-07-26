import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Loader2, Save, User as UserIcon, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AssignmentLite {
  id: string;
  title: string;
  points: number | null;
}

interface EnrollmentRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface SubmissionRow {
  id: string;
  assignment_id: string;
  student_id: string;
  status: string;
  submitted_at: string | null;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  points_earned: number | null;
  feedback: string | null;
  graded_at: string | null;
}

interface InstructorSubmissionsDialogProps {
  open: boolean;
  assignment: AssignmentLite | null;
  courseId: string;
  onClose: () => void;
}

// Instructor grading view for one assignment. Two stacked overlays:
//   • Submissions list — enrolled students + status badges
//   • Per-student grader — response, attachment, score, feedback, save.
// Both are plain fixed-position divs, deliberately NOT Radix Dialogs:
// this component mounts inside AssignmentEditDialog's hand-rolled
// backdrop (onClick=close), and Radix portals re-bubble React events
// through the component tree into that backdrop, closing everything.
export function InstructorSubmissionsDialog({
  open,
  assignment,
  courseId,
  onClose,
}: InstructorSubmissionsDialogProps) {
  const { user: currentUser } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, SubmissionRow>>({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'graded' | 'revision' | 'missing'>('all');
  const [gradingUserId, setGradingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !assignment) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [enrRes, subsRes] = await Promise.all([
        supabase
          .from('gw_course_enrollments')
          .select('user_id')
          .eq('course_id', courseId)
          .in('enrollment_status', ['enrolled', 'active', 'in_progress', 'registered']),
        supabase
          .from('gw_course_submissions')
          .select('id, assignment_id, student_id, status, submitted_at, content, file_url, file_name, points_earned, feedback, graded_at')
          .eq('assignment_id', assignment.id),
      ]);
      const enr = (enrRes.data as { user_id: string | null }[] | null) ?? [];
      const subs = subsRes.data as unknown as SubmissionRow[] | null;

      const userIds = Array.from(new Set(enr.map((e) => e.user_id).filter(Boolean))) as string[];
      const { data: profiles } = userIds.length > 0
        ? await supabase
            .from('gw_profiles_directory' as any)
            .select('user_id, full_name, email')
            .in('user_id', userIds)
        : { data: [] as any[] };
      if (cancelled) return;

      const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
      for (const p of ((profiles as any[]) ?? [])) {
        profileMap.set(p.user_id, { full_name: p.full_name ?? null, email: p.email ?? null });
      }

      const rows: EnrollmentRow[] = enr
        .filter((e) => !!e.user_id)
        .map((e) => {
          const uid = e.user_id as string;
          const p = profileMap.get(uid);
          return {
            user_id: uid,
            full_name: p?.full_name ?? null,
            email: p?.email ?? null,
          };
        });
      rows.sort((a, b) => (a.full_name || a.email || '').localeCompare(b.full_name || b.email || ''));
      setEnrollments(rows);

      const submap: Record<string, SubmissionRow> = {};
      for (const s of ((subs as unknown as SubmissionRow[]) ?? [])) {
        submap[s.student_id] = s;
      }
      setSubmissions(submap);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, assignment, courseId]);

  const counts = useMemo(() => {
    const c = { submitted: 0, graded: 0, revision: 0, missing: 0 };
    for (const e of enrollments) {
      const s = submissions[e.user_id];
      if (!s) c.missing++;
      else if (s.status === 'graded' || s.status === 'ai_graded') c.graded++;
      else if (s.status === 'revision_submitted') c.revision++;
      else if (s.status === 'submitted') c.submitted++;
      else c.missing++;
    }
    return c;
  }, [enrollments, submissions]);

  const filtered = useMemo(() => {
    if (filter === 'all') return enrollments;
    return enrollments.filter((e) => {
      const s = submissions[e.user_id];
      if (filter === 'missing') return !s || (s.status !== 'submitted' && s.status !== 'graded' && s.status !== 'ai_graded' && s.status !== 'revision_submitted');
      if (filter === 'submitted') return s?.status === 'submitted';
      if (filter === 'graded') return s?.status === 'graded' || s?.status === 'ai_graded';
      if (filter === 'revision') return s?.status === 'revision_submitted';
      return true;
    });
  }, [enrollments, submissions, filter]);

  if (!assignment) return null;

  const gradingRow = gradingUserId ? enrollments.find((e) => e.user_id === gradingUserId) : null;
  const gradingSub = gradingUserId ? submissions[gradingUserId] ?? null : null;

  function afterGradeSaved(userId: string, updated: Partial<SubmissionRow>) {
    setSubmissions((prev) => {
      const next = { ...prev };
      const base = next[userId] ?? {
        id: '', assignment_id: assignment!.id, student_id: userId, status: 'graded',
        submitted_at: null, content: null, file_url: null, file_name: null,
        points_earned: null, feedback: null, graded_at: null,
      } as SubmissionRow;
      next[userId] = { ...base, ...updated };
      return next;
    });
  }

  if (!open) return null;

  return (
    <>
      {/* Plain fixed overlay, NOT a Radix Dialog. This component is
          mounted inside AssignmentEditDialog's hand-rolled overlay,
          whose root div has onClick={onClose}. A Radix Dialog portals
          its DOM to <body>, but React synthetic events still bubble
          through the COMPONENT tree — so every click inside the portal
          bubbled up to that backdrop handler and closed the whole
          stack before the grader could open. A plain nested div lets
          stopPropagation actually contain clicks. */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
      >
        <div
          className="w-full md:max-w-3xl bg-card text-card-foreground rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold pr-6">Submissions · {assignment.title}</h2>
              <button
                type="button"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {assignment.points != null && `${assignment.points} pts · `}
              {enrollments.length} enrolled · {counts.graded} graded · {counts.submitted} awaiting · {counts.revision} needs re-grade · {counts.missing} missing
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 pb-2 border-b shrink-0">
            {(['all', 'submitted', 'revision', 'graded', 'missing'] as const).map((k) => (
              <Button
                key={k}
                size="sm"
                variant={filter === k ? 'default' : 'outline'}
                onClick={() => setFilter(k)}
                className="capitalize h-8"
              >
                {k === 'revision' ? 'Needs re-grade' : k}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No matching students.
            </div>
          ) : (
            <ul className="divide-y overflow-y-auto flex-1 -mx-6 px-6">
              {filtered.map((e) => {
                const sub = submissions[e.user_id];
                const isGraded = sub?.status === 'graded' || sub?.status === 'ai_graded';
                const needsReview = sub?.status === 'revision_submitted';
                return (
                  <li key={e.user_id} className="py-2">
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50 text-left transition-colors"
                      onClick={() => setGradingUserId(e.user_id)}
                    >
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <UserIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {e.full_name || e.email || 'Unknown student'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {sub?.submitted_at
                            ? `Submitted ${formatDistanceToNow(new Date(sub.submitted_at), { addSuffix: true })}`
                            : 'Not submitted'}
                          {sub?.content && ' · text response'}
                          {sub?.file_url && ' · attachment'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {needsReview && (
                          <Badge className="bg-amber-500 hover:bg-amber-500 gap-1">
                            <AlertTriangle className="h-3 w-3" /> Needs re-grade
                          </Badge>
                        )}
                        {isGraded && !needsReview && (
                          <Badge className="bg-green-600 hover:bg-green-600 gap-1">
                            <CheckCircle className="h-3 w-3" /> {sub!.points_earned}/{assignment.points ?? '?'}
                          </Badge>
                        )}
                        {sub?.status === 'submitted' && (
                          <Badge className="bg-blue-600 hover:bg-blue-600">To grade</Badge>
                        )}
                        {!sub && <Badge variant="outline">Missing</Badge>}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Per-student grader overlays the submissions list. Same plain
          overlay pattern; stopPropagation keeps backdrop clicks from
          reaching the parent dialogs' close handlers. */}
      {gradingRow && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => { e.stopPropagation(); setGradingUserId(null); }}
        >
          <div
            className="w-full max-w-2xl bg-card text-card-foreground rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <InlineGrader
              assignment={assignment}
              student={gradingRow}
              submission={gradingSub}
              gradedBy={currentUser?.id ?? null}
              onClose={() => setGradingUserId(null)}
              onSaved={(updated) => {
                afterGradeSaved(gradingRow.user_id, updated);
                setGradingUserId(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ─── Grade a single student (inline body — no Dialog wrapper) ────────

interface InlineGraderProps {
  assignment: AssignmentLite;
  student: EnrollmentRow;
  submission: SubmissionRow | null;
  gradedBy: string | null;
  onClose: () => void;
  onSaved: (updated: Partial<SubmissionRow>) => void;
}

function InlineGrader({
  assignment, student, submission, gradedBy, onClose, onSaved,
}: InlineGraderProps) {
  const [score, setScore] = useState<string>(
    submission?.points_earned != null ? String(submission.points_earned) : ''
  );
  const [feedback, setFeedback] = useState<string>(submission?.feedback ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setScore(submission?.points_earned != null ? String(submission.points_earned) : '');
    setFeedback(submission?.feedback ?? '');
  }, [submission?.id]);

  async function save() {
    const scoreNum = score.trim() === '' ? null : Number(score);
    if (scoreNum !== null && (Number.isNaN(scoreNum) || scoreNum < 0)) {
      toast.error('Enter a valid score (or leave blank to unset).');
      return;
    }
    if (scoreNum !== null && assignment.points != null && scoreNum > assignment.points) {
      toast.warning(`Score exceeds max (${assignment.points}). Saving anyway.`);
    }

    setSaving(true);
    try {
      // Explicit tenant_id on insert to bypass the current_tenant_id()
      // default failing for cross-tenant super-admins.
      let tenantId: string | null = null;
      if (!submission) {
        const { data: asnTenant } = await supabase
          .from('gw_assignments')
          .select('tenant_id')
          .eq('id', assignment.id)
          .maybeSingle();
        tenantId = (asnTenant as { tenant_id: string | null } | null)?.tenant_id ?? null;
      }
      const payload: Record<string, unknown> = {
        assignment_id: assignment.id,
        student_id: student.user_id,
        status: 'graded',
        points_earned: scoreNum,
        grade: scoreNum,
        feedback: feedback.trim() || null,
        graded_at: new Date().toISOString(),
        graded_by: gradedBy,
      };
      if (tenantId) payload.tenant_id = tenantId;

      if (submission?.id) {
        const { error } = await supabase
          .from('gw_course_submissions')
          .update(payload)
          .eq('id', submission.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gw_course_submissions')
          .insert(payload);
        if (error) throw error;
      }
      toast.success('Grade saved');
      onSaved({
        status: 'graded',
        points_earned: scoreNum,
        feedback: feedback.trim() || null,
        graded_at: new Date().toISOString(),
      });
    } catch (err) {
      const e = err as { message?: string; hint?: string; code?: string; details?: string } | undefined;
      const parts = [e?.message, e?.details, e?.hint].filter(Boolean);
      toast.error(parts.length > 0 ? parts.join(' — ') : 'Failed to save grade');
    } finally {
      setSaving(false);
    }
  }

  const displayName = student.full_name || student.email || 'Student';
  const isGraded = submission?.status === 'graded' || submission?.status === 'ai_graded';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 border-b pb-3">
        <div>
          <div className="text-lg font-semibold flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-primary" />
            Grade {displayName}
          </div>
          <div className="text-sm text-muted-foreground mt-0.5">
            {assignment.title}
            {assignment.points != null && ` · ${assignment.points} pts`}
            {submission?.submitted_at && ` · Submitted ${formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true })}`}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-2xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="space-y-4">
          {/* What the student submitted */}
          {submission?.content && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Response</Label>
              <div className="mt-1.5 text-sm whitespace-pre-wrap rounded-md border bg-muted/30 p-3 max-h-[240px] overflow-y-auto">
                {submission.content}
              </div>
            </div>
          )}
          {submission?.file_url && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Attachment</Label>
              <a
                href={submission.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                {submission.file_name || submission.file_url.split('/').pop() || 'Open link'}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
          {!submission?.content && !submission?.file_url && submission && (
            <div className="text-sm text-muted-foreground italic">Empty submission.</div>
          )}
          {!submission && (
            <div className="text-sm text-muted-foreground italic">
              No submission yet — you can still record an offline grade below.
            </div>
          )}

          {isGraded && submission?.graded_at && (
            <div className="text-xs text-muted-foreground border-t pt-2">
              Last graded {format(new Date(submission.graded_at), 'MMM d, h:mm a')}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
            <div>
              <Label htmlFor="grade-score" className="text-xs uppercase tracking-wider text-muted-foreground">
                Score {assignment.points != null && `/ ${assignment.points}`}
              </Label>
              <Input
                id="grade-score"
                type="number"
                inputMode="decimal"
                step={0.5}
                min={0}
                value={score}
                onChange={(ev) => setScore(ev.target.value)}
                className="mt-1.5"
                placeholder="—"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="grade-feedback" className="text-xs uppercase tracking-wider text-muted-foreground">
                Feedback (optional)
              </Label>
              <Textarea
                id="grade-feedback"
                rows={3}
                value={feedback}
                onChange={(ev) => setFeedback(ev.target.value)}
                className="mt-1.5"
                placeholder="Notes visible to the student when they view this assignment."
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isGraded ? 'Update grade' : 'Save grade'}
            </Button>
          </div>
        </div>
      </div>
  );
}
