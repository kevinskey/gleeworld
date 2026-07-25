import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, Loader2, Send, Link as LinkIcon, FileText, Award, MessageSquare, Upload, X, ExternalLink } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SUBMISSIONS_BUCKET = 'assignment-submissions';
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // must match bucket file_size_limit
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
]);

interface AssignmentLite {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  points: number | null;
  is_active: boolean;
  /** Optional — when present, inserted onto the submission so the
   * tenant_isolation RLS check on gw_assignment_submissions passes for
   * students who aren't in gw_tenant_members (they got in via
   * gw_course_enrollments only). */
  tenant_id?: string | null;
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
  /** Used to namespace uploaded files under the course. */
  courseId: string;
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
  courseId,
  onClose,
  onSubmitted,
}: StudentAssignmentDialogProps) {
  const { user } = useAuth();
  const [submission, setSubmission] = useState<SubmissionRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const [link, setLink] = useState('');
  /** When set, indicates the current `link` is a file we uploaded. */
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset the input so choosing the same file twice still triggers change.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file || !assignment || !user) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 50 MB.`);
      return;
    }
    if (!ALLOWED_MIME.has(file.type)) {
      toast.error('Unsupported file type. Use PDF, Word, TXT, JPEG, or PNG.');
      return;
    }

    setUploading(true);
    try {
      // Path: course/assignment/user/timestamp-safeName — deterministic
      // for teacher browsing, unique across resubmissions.
      const safeName = file.name.replace(/[^\w.\-]+/g, '_');
      const path = `${courseId}/${assignment.id}/${user.id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from(SUBMISSIONS_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(SUBMISSIONS_BUCKET).getPublicUrl(path);
      setLink(pub.publicUrl);
      setUploadedName(file.name);
      toast.success('File uploaded — remember to hit Submit');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function clearAttachment() {
    setLink('');
    setUploadedName(null);
  }

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
        // If the URL points at our submissions bucket, treat it as a
        // previously-uploaded file for the "current file" indicator.
        const isOurs = !!row?.recording_url?.includes(`/${SUBMISSIONS_BUCKET}/`);
        setUploadedName(isOurs ? decodeURIComponent(row!.recording_url!.split('/').pop() || 'file') : null);
        setLoading(false);
      });
  }, [open, assignment, user]);

  if (!assignment) return null;

  const due = assignment.due_at ? new Date(assignment.due_at) : null;
  const overdue = due ? isPast(due) : false;
  const isGraded = submission?.status === 'graded' || submission?.status === 'ai_graded';
  const isSubmitted = submission?.status === 'submitted' || submission?.status === 'revision_submitted' || isGraded;
  // Resubmission after grading IS allowed — writes as revision_submitted so
  // the instructor knows to re-review. Prior score + feedback are preserved
  // on the row until the instructor regrades.
  const editable = true;

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
      // If a graded submission is being edited, flag as revision_submitted
      // so the instructor sees "needs re-grade". Otherwise plain submitted.
      const wasGraded = submission?.status === 'graded' || submission?.status === 'ai_graded';

      // tenant_id lookup. gw_assignment_submissions.tenant_id defaults to
      // current_tenant_id() which returns NULL when the student isn't a
      // gw_tenant_members row for the current tenant — RLS then rejects
      // the INSERT with a WITH CHECK violation. Fetching the assignment's
      // tenant_id and setting it explicitly bypasses the default and
      // passes the tenant_isolation_restrict check.
      let tenantId = assignment.tenant_id ?? null;
      if (!tenantId) {
        const { data: asnTenant } = await supabase
          .from('gw_assignments')
          .select('tenant_id')
          .eq('id', assignment.id)
          .maybeSingle();
        tenantId = (asnTenant as { tenant_id: string | null } | null)?.tenant_id ?? null;
      }

      const payload: Record<string, unknown> = {
        assignment_id: assignment.id,
        user_id: user.id,
        status: wasGraded ? 'revision_submitted' : 'submitted',
        submitted_at: new Date().toISOString(),
        notes: notes.trim() || null,
        recording_url: link.trim() || null,
      };
      if (tenantId) payload.tenant_id = tenantId;

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
      // Supabase errors are plain objects, not Error instances. Pull
      // message + hint + code so the toast is diagnosable in the wild
      // instead of silently reading "Failed to submit".
      const e = err as { message?: string; hint?: string; code?: string; details?: string } | undefined;
      const parts = [e?.message, e?.details, e?.hint].filter(Boolean);
      const msg = parts.length > 0 ? parts.join(' — ') : 'Failed to submit';
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
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Attachment (optional)
              </Label>
              {/* Upload OR paste a link. If a file is attached, show it
                  as a chip with a clear button so re-uploading is one tap. */}
              {uploadedName ? (
                <div className="mt-1.5 flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate flex-1 min-w-0">{uploadedName}</span>
                  {link && (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary inline-flex items-center gap-1"
                    >
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                  {editable && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={clearAttachment}
                      aria-label="Remove attachment"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-1.5"
                      disabled={!editable || uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload file
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      PDF · Word · TXT · JPEG · PNG · max 50 MB
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/jpeg,image/png"
                      className="hidden"
                      onChange={handleFilePick}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                      id="submission-link"
                      type="url"
                      placeholder="…or paste a Google Drive / Dropbox / YouTube link"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      disabled={loading || !editable || uploading}
                      className="flex-1"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 gap-3">
            <div className="text-xs text-muted-foreground">
              {isGraded
                ? 'Already graded. Resubmitting marks this for re-review — your current grade stays until the instructor regrades.'
                : isSubmitted
                ? 'You can update your submission until it is graded.'
                : 'Your work saves when you tap Submit.'}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={saving || loading || uploading} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {isGraded ? 'Resubmit for review' : isSubmitted ? 'Update submission' : 'Submit'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
