// ShareRecordingDialog — share one owned audio recording to (a) a class
// media library, (b) a standard assignment, (c) people by email.
// Teacher/admin-gated: renders nothing useful without managed courses or
// admin role; callers also hide their Share affordances (defense in
// depth — RLS enforces regardless).
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useManagedCourses } from '@/hooks/useManagedCourses';
import { useUserRole } from '@/hooks/useUserRole';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Share2, Users, ClipboardList, Mail } from 'lucide-react';
import { toast } from 'sonner';
import {
  ensureClassCopy, createItemShares, fetchCourseRecipients, buildShareEmailHtml,
  sendShareEmail, notifyRecipients, listenPath, type ShareableMedia,
} from '@/lib/media/shareRecording';
import { CreateAssignmentDialog } from '@/components/grading/instructor/CreateAssignmentDialog';

type ShareTab = 'class' | 'assignment' | 'email';

export function ShareRecordingDialog({
  media, onOpenChange,
}: {
  media: ShareableMedia | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = useUserRole();
  const open = media !== null;
  const { data: courses = [], isLoading: coursesLoading } = useManagedCourses();
  const [tab, setTab] = useState<ShareTab>('class');
  const [courseId, setCourseId] = useState<string>('');
  const [notifyClass, setNotifyClass] = useState(true);
  const [message, setMessage] = useState('');
  const [emailMode, setEmailMode] = useState<'class' | 'people'>('class');
  const [manualEmails, setManualEmails] = useState('');
  // Assignment flow: the class copy id once created; opens the creator.
  const [assignmentCopy, setAssignmentCopy] = useState<{ courseId: string; mediaId: string } | null>(null);

  const sharerName = (user?.user_metadata as any)?.full_name || user?.email || 'Your director';
  const absoluteListenUrl = (id: string) => `${window.location.origin}${listenPath(id)}`;

  const reset = () => {
    setTab('class'); setCourseId(''); setNotifyClass(true); setMessage('');
    setEmailMode('class'); setManualEmails(''); setAssignmentCopy(null);
  };

  const shareToClass = useMutation({
    mutationFn: async () => {
      if (!media || !courseId) throw new Error('Pick a class first.');
      // The copy is the success condition per spec: once it exists, the
      // share has happened. A notify/email failure after this point must
      // not read as "share failed" — the copy is kept either way.
      const copy = await ensureClassCopy(supabase, media, courseId);
      if (notifyClass) {
        try {
          const recipients = await fetchCourseRecipients(supabase, courseId);
          if (recipients.length > 0) {
            await sendShareEmail(supabase, {
              to: recipients.map((r) => r.email),
              subject: `New recording: ${media.title}`,
              html: buildShareEmailHtml({
                title: media.title, sharerName, message,
                url: absoluteListenUrl(copy.id),
              }),
            });
            await notifyRecipients(supabase, recipients.map((r) => r.user_id), {
              title: 'New recording shared',
              message: `${sharerName} shared "${media.title}" with your class.`,
              actionUrl: listenPath(copy.id),
            });
          }
        } catch (notifyError: any) {
          return { copy, notifyError };
        }
      }
      return { copy, notifyError: null };
    },
    onSuccess: ({ notifyError }) => {
      if (notifyError) {
        toast.warning("Added to the class library, but the email didn't send.", {
          description: notifyError?.message || String(notifyError),
        });
      } else {
        toast.success(notifyClass ? 'Shared with the class and notified everyone.' : 'Added to the class library.');
      }
      reset(); onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Share failed.'),
  });

  const startAssignment = useMutation({
    mutationFn: async () => {
      if (!media || !courseId) throw new Error('Pick a class first.');
      const copy = await ensureClassCopy(supabase, media, courseId);
      return { courseId, mediaId: copy.id };
    },
    onSuccess: (v) => setAssignmentCopy(v),
    onError: (e: any) => toast.error(e?.message || 'Could not prepare the assignment.'),
  });

  const sendEmails = useMutation({
    mutationFn: async () => {
      if (!media) throw new Error('Nothing to share.');
      if (emailMode === 'class') {
        if (!courseId) throw new Error('Pick a class first.');
        // Class email always shares via the class copy so every enrolled
        // student passes RLS on the listen page.
        const copy = await ensureClassCopy(supabase, media, courseId);
        const recipients = await fetchCourseRecipients(supabase, courseId);
        if (recipients.length === 0) throw new Error('That class has no members with email addresses.');
        await sendShareEmail(supabase, {
          to: recipients.map((r) => r.email),
          subject: `${sharerName} shared a recording: ${media.title}`,
          html: buildShareEmailHtml({
            title: media.title, sharerName, message, url: absoluteListenUrl(copy.id),
          }),
        });
        await notifyRecipients(supabase, recipients.map((r) => r.user_id), {
          title: 'Recording shared with you',
          message: `${sharerName} shared "${media.title}".`,
          actionUrl: listenPath(copy.id),
        });
        return recipients.length;
      }
      // People mode: item shares on the ORIGINAL row, then email.
      const emails = manualEmails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);
      const invalid = emails.filter((e) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
      if (emails.length === 0) throw new Error('Enter at least one email.');
      if (invalid.length > 0) throw new Error(`Not a valid email: ${invalid[0]}`);
      await createItemShares(supabase, media.id, media.uploaded_by, emails);
      await sendShareEmail(supabase, {
        to: emails,
        subject: `${sharerName} shared a recording: ${media.title}`,
        html: buildShareEmailHtml({
          title: media.title, sharerName, message, url: absoluteListenUrl(media.id),
        }),
      });
      // Bell notifications for recipients who have accounts here.
      const { data: known } = await supabase
        .from('gw_profiles_directory')
        .select('user_id, email')
        .in('email', emails.map((e) => e.toLowerCase()));
      await notifyRecipients(supabase, (known ?? []).map((k: any) => k.user_id), {
        title: 'Recording shared with you',
        message: `${sharerName} shared "${media.title}".`,
        actionUrl: listenPath(media.id),
      });
      return emails.length;
    },
    onSuccess: (n) => {
      toast.success(`Sent to ${n} recipient${n === 1 ? '' : 's'}.`);
      reset(); onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || 'Email failed.'),
  });

  // Existing per-item shares (people mode) — listed with revoke, mirroring
  // ShareFolderDialog. Spec requires shares to be revocable.
  const { data: itemShares = [], refetch: refetchShares } = useQuery<Array<{ id: string; invited_email: string }>>({
    queryKey: ['media-item-shares', media?.id],
    enabled: open && tab === 'email' && emailMode === 'people' && !!media?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_media_item_shares')
        .select('id, invited_email')
        .eq('media_id', media!.id)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });
      return (data ?? []) as any;
    },
  });

  const revokeShare = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('gw_media_item_shares')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id)
        .select('id');
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error('Could not revoke (read-only workspace?).');
    },
    onSuccess: () => { toast.success('Access revoked.'); refetchShares(); },
    onError: (e: any) => toast.error(e?.message || 'Could not revoke.'),
  });

  const busy = shareToClass.isPending || startAssignment.isPending || sendEmails.isPending;
  // Admins can always share (email-to-individuals needs no course); other
  // instructors need at least one managed course for any share flow.
  const canShare = isAdmin() || isSuperAdmin() || courses.length > 0;

  const TABS: Array<{ key: ShareTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'class', label: 'Class library', icon: Users },
    { key: 'assignment', label: 'Assignment', icon: ClipboardList },
    { key: 'email', label: 'Email', icon: Mail },
  ];

  const coursePicker = (
    <div>
      <Label className="text-sm">Class</Label>
      <Select value={courseId} onValueChange={setCourseId}>
        <SelectTrigger><SelectValue placeholder="Pick a class…" /></SelectTrigger>
        <SelectContent>
          {courses.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.title?.trim() || c.course_code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <Dialog open={open && !assignmentCopy} onOpenChange={(v) => { if (!busy) { if (!v) reset(); onOpenChange(v); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="inline-flex items-center gap-2">
              <Share2 className="w-4 h-4" /> Share "{media?.title ?? ''}"
            </DialogTitle>
            <DialogDescription>
              Your original stays in your own Studio folder — sharing never moves it.
            </DialogDescription>
          </DialogHeader>

          {coursesLoading ? (
            <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>
          ) : !canShare ? (
            <p className="text-sm text-muted-foreground py-4">
              Sharing is available to instructors and admins. You don't manage any classes yet.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-1.5">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTab(t.key)}
                      className={tab === t.key
                        ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold bg-primary/10 text-primary'
                        : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors'}
                    >
                      <Icon className="w-4 h-4" /> {t.label}
                    </button>
                  );
                })}
              </div>

              {tab === 'class' && (
                <div className="space-y-3">
                  {coursePicker}
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={notifyClass} onCheckedChange={(v) => setNotifyClass(v === true)} />
                    Notify the class by email
                  </label>
                  {notifyClass && (
                    <div>
                      <Label className="text-sm">Message (optional)</Label>
                      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                        placeholder="Listen before Thursday's rehearsal…" />
                    </div>
                  )}
                  <Button className="w-full" disabled={!courseId || busy} onClick={() => shareToClass.mutate()}>
                    {shareToClass.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                    Add to class library
                  </Button>
                </div>
              )}

              {tab === 'assignment' && (
                <div className="space-y-3">
                  {coursePicker}
                  <p className="text-xs text-muted-foreground">
                    The recording is added to the class library and attached to a new
                    assignment — you'll set the title, points, and due date next.
                  </p>
                  <Button className="w-full" disabled={!courseId || busy} onClick={() => startAssignment.mutate()}>
                    {startAssignment.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardList className="w-4 h-4 mr-2" />}
                    Create assignment…
                  </Button>
                </div>
              )}

              {tab === 'email' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button type="button" onClick={() => setEmailMode('class')}
                      className={`h-10 rounded border text-sm font-semibold ${emailMode === 'class' ? 'bg-primary/15 border-primary/50 text-primary' : 'border-border bg-background text-muted-foreground'}`}
                    >Whole class</button>
                    <button type="button" onClick={() => setEmailMode('people')}
                      className={`h-10 rounded border text-sm font-semibold ${emailMode === 'people' ? 'bg-primary/15 border-primary/50 text-primary' : 'border-border bg-background text-muted-foreground'}`}
                    >Specific people</button>
                  </div>
                  {emailMode === 'class' ? coursePicker : (
                    <div>
                      <Label className="text-sm">Email addresses</Label>
                      <Input value={manualEmails} onChange={(e) => setManualEmails(e.target.value)}
                        placeholder="ana@school.edu, ben@school.edu" />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Recipients must have a GleeWorld account in your organization to listen.
                      </p>
                      {itemShares.length > 0 && (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto mt-2">
                          <p className="text-xs text-muted-foreground font-semibold">Already shared with</p>
                          {itemShares.map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-border text-sm">
                              <span className="truncate">{s.invited_email}</span>
                              <button
                                type="button"
                                onClick={() => revokeShare.mutate(s.id)}
                                className="text-xs text-rose-500 hover:underline shrink-0"
                              >Revoke</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <Label className="text-sm">Message (optional)</Label>
                    <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} />
                  </div>
                  <Button className="w-full" disabled={busy || (emailMode === 'class' ? !courseId : !manualEmails.trim())}
                    onClick={() => sendEmails.mutate()}>
                    {sendEmails.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                    Send email
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={busy}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {assignmentCopy && (
        <CreateAssignmentDialog
          courseId={assignmentCopy.courseId}
          mediaId={assignmentCopy.mediaId}
          defaultTitle={media?.title}
          // Must be the table CourseShell's AssignmentsTab reads, or the
          // assignment is created successfully and never appears in the class.
          table="gw_assignments"
          open
          onOpenChange={(v) => {
            if (!v) { setAssignmentCopy(null); reset(); onOpenChange(false); }
          }}
        />
      )}
    </>
  );
}
