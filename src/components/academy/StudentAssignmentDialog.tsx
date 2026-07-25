import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, Loader2, Send, Link as LinkIcon, FileText, Award, MessageSquare } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AssignmentLite {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  points: number | null;
  is_active: boolean;
}

interface SubmissionRow {
  id: string;
  assignment_id: string;
  user_id: string;
  status: string;
  submitted_at: string | null;
  notes: string | null;
  recording_url: string | null;
  score_value: number | null;
  feedback: string | null;
  graded_at: string | null;
}

interface StudentAssignmentDialogProps {
  open: boolean;
  assignment: AssignmentLite | null;
  onClose: () => void;
  /** Called after a successful submit — parent can refresh row/badge state. */
  onSubmitted?: () => void;
}

// Student-facing view + submission form for a single assignment.
// Reads from and writes to `gw_assignment_submissions` (pairs with the
// `gw_assignments` table CourseShell uses). Text notes + optional link
// in v1; file upload is a follow-up (any cloud share URL works today).
export function StudentAssignmentDialog({
  open,
  assignment,
  onClose,
  onSubmitted,
}: StudentAssignmentDialogProps) {
  const { user } = useAuth();
  const [submission, setSubmission] = useState<SubmissionRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');

  // Reset on assignment change / open.
  useEffect(() => {
    if (!open || !assignment || !user) return;
    setLoading(true);
    supabase
      .from('gw_assignment_submissions' as any)
      .select('id, assignment_id, user_id, status, submitted_at, notes, recording_url, score_value, feedback, graded_at')
      .eq('assignment_id', assignment.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const row = (data as unknown as SubmissionRow | null) ?? null;
        setSubmission(row);
        setNotes(row?.notes ?? '');
        setLink(row?.recording_url ?? '');
        setLoading(false);
      });
  }, [open, assignment, user]);

  if (!assignment) return null;

  const due = assignment.due_at ? new Date(assignment.due_at) : null;
  const overdue = due ? isPast(due) : false;
  const isGraded = submission?.status === 'graded' || submission?.status === 'ai_graded';
  const isSubmitted = submission?.status === 'submitted' || submission?.status === 'revision_submitted' || isGraded;
  const editable = !isGraded;

  async function handleSubmit() {
    if (!assignment || !user) return;
    if (!notes.trim() && !link.trim()) {
      toast.error('Add some notes or a link before submitting.');
      return;
    }
    setSaving(true);
    try {
      // Upsert on (assignment_id, user_id). If the row already exists,
      // update it; otherwise insert with status='submitted'.
      const payload = {
        assignment_id: assignment.id,
        user_id: user.id,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        notes: notes.trim() || null,
        recording_url: link.trim() || null,
      };
      if (submission?.id) {
        const { error } = await supabase
          .from('gw_assignment_submissions' as any)
          .update(payload)
          .eq('id', submission.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('gw_assignment_submissions' as any)
          .insert(payload);
        if (error) throw error;
      }
      toast.success(submission?.id ? 'Submission updated' : 'Submitted');
      onSubmitted?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="md:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <span className="min-w-0 truncate">{assignment.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Assignment meta strip */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {due && (
              <Badge variant={overdue && !isSubmitted ? 'destructive' : 'outline'} className="gap-1">
                <Calendar className="h-3 w-3" />
                Due {format(due, 'EEE MMM d, h:mm a')}
                {overdue && !isSubmitted && ' · overdue'}
              </Badge>
            )}
            {assignment.points != null && (
              <Badge variant="outline" className="gap-1">
                <Award className="h-3 w-3" />
                {assignment.points} pts
              </Badge>
            )}
            {isGraded && submission?.score_value != null && (
              <Badge className="gap-1 bg-green-600 hover:bg-green-600">
                <CheckCircle className="h-3 w-3" />
                Graded {submission.score_value}/{assignment.points ?? '?'}
              </Badge>
            )}
            {isSubmitted && !isGraded && (
              <Badge className="gap-1 bg-blue-600 hover:bg-blue-600">
                <CheckCircle className="h-3 w-3" />
                Submitted {submission?.submitted_at ? formatDistanceToNow(new Date(submission.submitted_at), { addSuffix: true }) : ''}
              </Badge>
            )}
          </div>

          {/* Description */}
          {assignment.description && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Instructions</Label>
              <div className="mt-1.5 text-sm text-slate-700 whitespace-pre-wrap rounded-md border bg-muted/30 p-3">
                {assignment.description}
              </div>
            </div>
          )}

          {/* Grade + feedback if already graded */}
          {isGraded && submission?.feedback && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Instructor feedback
              </Label>
              <div className="mt-1.5 text-sm text-slate-700 whitespace-pre-wrap rounded-md border-l-4 border-primary bg-primary/5 p-3">
                {submission.feedback}
              </div>
            </div>
          )}

          {/* Submission form (or read-only view of what was submitted) */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="submission-notes" className="text-xs uppercase tracking-wider text-muted-foreground">
                Your response
              </Label>
              <Textarea
                id="submission-notes"
                placeholder="Type your response here…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading || !editable}
                rows={6}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="submission-link" className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <LinkIcon className="h-3 w-3" /> Attach a link (Google Drive, Dropbox, YouTube…)
              </Label>
              <Input
                id="submission-link"
                type="url"
                placeholder="https://…"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                disabled={loading || !editable}
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              {isGraded
                ? 'Already graded — resubmissions must be enabled by your instructor.'
                : isSubmitted
                ? 'You can update your submission until it is graded.'
                : editable
                ? 'Your work saves when you tap Submit.'
                : ''}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                {isGraded ? 'Close' : 'Cancel'}
              </Button>
              {editable && (
                <Button onClick={handleSubmit} disabled={saving || loading} className="gap-1.5">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSubmitted ? 'Update submission' : 'Submit'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
