import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Loader2, Save, User as UserIcon, ChevronDown, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
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

// Instructor grading view for one assignment. Shows every enrolled
// student, their submission (or "Not submitted"), and an expandable
// inline row for entering score + feedback. Uses gw_course_submissions
// (upsert on assignment_id + student_id) — the general-purpose table
// FK'd to gw_assignments. gw_assignment_submissions is a separate
// sight-reading table with its own FK to gw_sight_reading_assignments.
export function InstructorSubmissionsDialog({
  open,
  assignment,
  courseId,
  onClose,
}: InstructorSubmissionsDialogProps) {
  const { user: currentUser } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, SubmissionRow>>({});
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { score: string; feedback: string }>>({});
  const [savingUser, setSavingUser] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'graded' | 'revision' | 'missing'>('all');

  useEffect(() => {
    if (!open || !assignment) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      // Enrolled students. Two-step lookup because
      // gw_course_enrollments has no FK to a profile table (its declared
      // FKs are course_id, tenant_id, student_profile_id) — PostgREST
      // implicit joins therefore silently return zero rows, which is
      // why the dialog was showing "0 enrolled" for populated courses.
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

      // Load display names for those enrolled users from the directory.
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

  function draftFor(userId: string) {
    const sub = submissions[userId];
    return (
      drafts[userId] ?? {
        score: sub?.points_earned != null ? String(sub.points_earned) : '',
        feedback: sub?.feedback ?? '',
      }
    );
  }

  function setDraft(userId: string, next: Partial<{ score: string; feedback: string }>) {
    setDrafts((prev) => ({ ...prev, [userId]: { ...draftFor(userId), ...next } }));
  }

  async function grade(userId: string) {
    if (!assignment || !currentUser) return;
    const d = draftFor(userId);
    const scoreNum = d.score.trim() === '' ? null : Number(d.score);
    if (scoreNum !== null && (Number.isNaN(scoreNum) || scoreNum < 0)) {
      toast.error('Enter a valid score (or leave blank to unset).');
      return;
    }
    if (scoreNum !== null && assignment.points != null && scoreNum > assignment.points) {
      // Warn but permit — some teachers give extra credit above max.
      toast.warning(`Score exceeds max (${assignment.points}). Saving anyway.`);
    }

    setSavingUser(userId);
    try {
      const existing = submissions[userId];
      // Also fetch the assignment's tenant_id and pin it on the insert
      // to bypass the tenant_isolation_restrict WITH CHECK failing when
      // the instructor's gw_tenant_members row doesn't match the tenant
      // (super-admins operating in tenants they don't belong to).
      let tenantId: string | null = null;
      if (!existing) {
        const { data: asnTenant } = await supabase
          .from('gw_assignments')
          .select('tenant_id')
          .eq('id', assignment.id)
          .maybeSingle();
        tenantId = (asnTenant as { tenant_id: string | null } | null)?.tenant_id ?? null;
      }
      const payload: Record<string, unknown> = {
        assignment_id: assignment.id,
        student_id: userId,
        status: 'graded',
        points_earned: scoreNum,
        grade: scoreNum,
        feedback: d.feedback.trim() || null,
        graded_at: new Date().toISOString(),
        graded_by: currentUser.id,
      };
      if (tenantId) payload.tenant_id = tenantId;
      if (existing?.id) {
        const { error } = await supabase
          .from('gw_course_submissions')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // No prior submission — record the grade anyway (teacher entering
        // an offline/in-person grade). Row becomes their gradebook entry.
        const { data, error } = await supabase
          .from('gw_course_submissions')
          .insert(payload)
          .select('id, assignment_id, student_id, status, submitted_at, content, file_url, file_name, points_earned, feedback, graded_at')
          .single();
        if (error) throw error;
        if (data) {
          setSubmissions((prev) => ({ ...prev, [userId]: data as unknown as SubmissionRow }));
        }
      }
      // Refresh local state so the row badge flips.
      setSubmissions((prev) => {
        const next = { ...prev };
        const base = next[userId] ?? { id: '', assignment_id: assignment.id, student_id: userId, status: 'graded', submitted_at: null, content: null, file_url: null, file_name: null, points_earned: null, feedback: null, graded_at: null } as SubmissionRow;
        next[userId] = { ...base, status: 'graded', points_earned: scoreNum, feedback: d.feedback.trim() || null, graded_at: new Date().toISOString() };
        return next;
      });
      toast.success('Grade saved');
      setExpandedUser(null);
    } catch (err) {
      // Supabase errors are plain objects, not Error instances. Read
      // message + details + hint so the toast is diagnosable instead
      // of a generic string.
      const e = err as { message?: string; hint?: string; code?: string; details?: string } | undefined;
      const parts = [e?.message, e?.details, e?.hint].filter(Boolean);
      toast.error(parts.length > 0 ? parts.join(' — ') : 'Failed to save grade');
    } finally {
      setSavingUser(null);
    }
  }

  if (!assignment) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="md:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="pr-6">Submissions · {assignment.title}</DialogTitle>
          <DialogDescription>
            {assignment.points != null && `${assignment.points} pts · `}
            {enrollments.length} enrolled · {counts.graded} graded · {counts.submitted} awaiting · {counts.revision} needs re-grade · {counts.missing} missing
          </DialogDescription>
        </DialogHeader>

        {/* Filter chips */}
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
              const isExpanded = expandedUser === e.user_id;
              const isGraded = sub?.status === 'graded' || sub?.status === 'ai_graded';
              const needsReview = sub?.status === 'revision_submitted';
              const d = draftFor(e.user_id);
              return (
                // Row wrapper is a plain div — NOT a button. When it was
                // a button, focusing inputs in the expanded panel below
                // fired weird focus-related state changes that closed the
                // form. Only the specifically-interactive parts of the
                // row are real buttons now.
                <li key={e.user_id} className="py-2">
                  <div className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/50">
                    <button
                      type="button"
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      onClick={() => setExpandedUser(isExpanded ? null : e.user_id)}
                      aria-expanded={isExpanded}
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
                    </button>
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
                        <button
                          type="button"
                          className="inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                          onClick={() => setExpandedUser(isExpanded ? null : e.user_id)}
                        >
                          {isExpanded ? 'Close' : 'To grade'}
                        </button>
                      )}
                      {!sub && <Badge variant="outline">Missing</Badge>}
                      <button
                        type="button"
                        aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                        onClick={() => setExpandedUser(isExpanded ? null : e.user_id)}
                        className="inline-flex items-center justify-center h-6 w-6 text-muted-foreground hover:text-foreground"
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      ref={(el) => {
                        // Auto-scroll + auto-focus the score input on
                        // open so the instructor can start typing right
                        // away. Without both, users kept reporting the
                        // panel "wasn't there" — it was, just below the
                        // fold, and the flow required an extra click.
                        if (el && expandedUser === e.user_id) {
                          requestAnimationFrame(() => {
                            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            const scoreInput = el.querySelector<HTMLInputElement>(`#score-${e.user_id}`);
                            scoreInput?.focus();
                          });
                        }
                      }}
                      className="mt-2 ml-12 mr-2 rounded-xl border-2 border-primary bg-primary/5 p-5 space-y-4 shadow-lg"
                    >
                      <div className="flex items-center justify-between border-b border-primary/20 pb-2 mb-1">
                        <div className="text-sm font-bold uppercase tracking-wider text-primary">
                          Grade {e.full_name || e.email || 'this student'}
                        </div>
                        <button
                          type="button"
                          onClick={() => setExpandedUser(null)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Close ✕
                        </button>
                      </div>
                      {sub?.content && (
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Response</Label>
                          <div className="mt-1.5 text-sm whitespace-pre-wrap rounded-md border bg-background p-3">
                            {sub.content}
                          </div>
                        </div>
                      )}
                      {sub?.file_url && (
                        <div>
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Attachment</Label>
                          <a
                            href={sub.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                          >
                            {sub.file_name || sub.file_url.split('/').pop() || 'Open link'} <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      )}
                      {!sub?.content && !sub?.file_url && sub && (
                        <div className="text-sm text-muted-foreground italic">Empty submission.</div>
                      )}
                      {!sub && (
                        <div className="text-sm text-muted-foreground italic">
                          No submission yet — you can still record an offline grade below.
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
                        <div>
                          <Label htmlFor={`score-${e.user_id}`} className="text-xs uppercase tracking-wider text-muted-foreground">
                            Score {assignment.points != null && `/ ${assignment.points}`}
                          </Label>
                          <Input
                            id={`score-${e.user_id}`}
                            type="number"
                            inputMode="decimal"
                            step={0.5}
                            min={0}
                            value={d.score}
                            onChange={(ev) => setDraft(e.user_id, { score: ev.target.value })}
                            className="mt-1.5"
                            placeholder="—"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`fb-${e.user_id}`} className="text-xs uppercase tracking-wider text-muted-foreground">
                            Feedback (optional)
                          </Label>
                          <Textarea
                            id={`fb-${e.user_id}`}
                            rows={3}
                            value={d.feedback}
                            onChange={(ev) => setDraft(e.user_id, { feedback: ev.target.value })}
                            className="mt-1.5"
                            placeholder="Notes visible to the student when they view this assignment."
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        {sub?.graded_at && (
                          <div className="text-xs text-muted-foreground">
                            Last graded {format(new Date(sub.graded_at), 'MMM d, h:mm a')}
                          </div>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedUser(null)}
                            disabled={savingUser === e.user_id}
                          >
                            Collapse
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => grade(e.user_id)}
                            disabled={savingUser === e.user_id}
                            className="gap-1.5"
                          >
                            {savingUser === e.user_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                            {isGraded ? 'Update grade' : 'Save grade'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
