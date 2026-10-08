// Who a document is shared with: an audience, or one person by email.
//
// Email rather than a user picker for individuals: you can share with someone
// who hasn't signed in yet — access appears the moment they do, because RLS
// matches against the email in their JWT.
//
// Audiences (everyone / staff / admins / a class) are evaluated at READ time,
// not expanded into a list of addresses when you click. A member who joins
// next week sees the document next week, with no re-share. The trade that
// comes with it, and the reason the dialog says "in this workspace": an
// audience only means something inside the tenant it was created in, whereas
// an email names a person and follows them anywhere. Documents themselves are
// personal and cross-tenant (gw_personal_docs has no tenant_id), so that
// distinction is real and worth stating on screen.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GraduationCap, Loader2, Mail, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useManagedCourses } from '@/hooks/useManagedCourses';
import {
  listShares, upsertShare, revokeShare, setSharePermission, isPlausibleEmail,
  describePermission, describeShareTarget,
  type DocShare, type GrantablePermission, type ShareTarget, type TargetRole,
} from '@/lib/documents/sharesApi';

const GRANTABLE: GrantablePermission[] = ['view', 'comment', 'edit'];

const ROLE_OPTIONS: { value: TargetRole; label: string; hint: string }[] = [
  { value: 'member', label: 'Everyone', hint: 'Every signed-in member of this workspace' },
  { value: 'staff', label: 'All staff', hint: 'Staff, admins and owners' },
  { value: 'admin', label: 'All admins', hint: 'Admins and owners only' },
];

interface ManagedCourse { id: string; course_code?: string; title?: string }

interface ShareDialogProps {
  docId: string;
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ docId, userId, open, onOpenChange }: ShareDialogProps) {
  const [shares, setShares] = useState<DocShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TargetRole>('member');
  const [courseId, setCourseId] = useState('');
  // One level applies to whatever you add next, rather than a separate
  // control per row — the common case is sharing several targets at the
  // same level, and three pickers that each need setting is three chances
  // to grant more than intended.
  const [permission, setPermission] = useState<GrantablePermission>('comment');

  const { data: courses = [] } = useManagedCourses();
  const courseList = courses as ManagedCourse[];
  const courseNames = useMemo(
    () => Object.fromEntries(courseList.map((c) => [c.id, c.course_code || c.title || 'Class'])),
    [courseList],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setShares(await listShares(docId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load the share list.');
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => { if (open) void load(); }, [open, load]);

  const add = useCallback(async (target: ShareTarget) => {
    if (!userId) return;
    setBusy(true);
    try {
      await upsertShare({ docId, target, permission, createdBy: userId });
      if (target.kind === 'email') setEmail('');
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not share the document.');
    } finally {
      setBusy(false);
    }
  }, [docId, permission, userId, load]);

  const addEmail = useCallback(() => {
    if (!isPlausibleEmail(email)) {
      toast.error('Enter an email address.');
      return;
    }
    void add({ kind: 'email', email });
  }, [email, add]);

  const levelPicker = (
    <select
      value={permission}
      onChange={(e) => setPermission(e.target.value as GrantablePermission)}
      className="h-9 rounded border border-input bg-background px-2 text-sm text-foreground"
      aria-label="Permission for what you add next"
    >
      {GRANTABLE.map((p) => <option key={p} value={p}>{describePermission(p)}</option>)}
    </select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            People you share with see this document in their own Documents
            library. They don’t need an account yet — access starts the first
            time they sign in with that address.
          </DialogDescription>
        </DialogHeader>

        {/* min-w-0: DialogContent is a grid, and long emails and class names
            blow the track out on phones without it. */}
        <div className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs">New shares can</Label>
            {levelPicker}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Share with a group</Label>
            <div className="flex gap-2">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as TargetRole)}
                className="h-9 flex-1 rounded border border-input bg-background px-2 text-sm text-foreground"
                aria-label="Group"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <Button
                type="button" variant="outline" size="sm" className="h-9"
                disabled={busy}
                onClick={() => void add({ kind: 'role', role })}
              >
                <Users className="h-4 w-4" /><span className="ml-1.5">Add</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {ROLE_OPTIONS.find((o) => o.value === role)?.hint}. People who join
              later are included automatically.
            </p>
          </div>

          {courseList.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">Share with a class</Label>
              <div className="flex gap-2">
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="h-9 flex-1 rounded border border-input bg-background px-2 text-sm text-foreground"
                  aria-label="Class"
                >
                  <option value="">Pick a class</option>
                  {courseList.map((c) => (
                    <option key={c.id} value={c.id}>{c.course_code || c.title}</option>
                  ))}
                </select>
                <Button
                  type="button" variant="outline" size="sm" className="h-9"
                  disabled={busy || !courseId}
                  onClick={() => void add({ kind: 'course', courseId })}
                >
                  <GraduationCap className="h-4 w-4" /><span className="ml-1.5">Add</span>
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Share with one person</Label>
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                placeholder="name@example.com"
                type="email"
                aria-label="Email address"
                className="h-9 min-w-0 flex-1"
              />
              <Button type="button" size="sm" className="h-9" disabled={busy} onClick={addEmail}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                <span className="ml-1.5">Share</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Shared with</Label>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {loading && (
                <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              )}
              {!loading && shares.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">
                  Not shared with anyone yet.
                </p>
              )}
              {shares.map((share) => {
                const label = describeShareTarget(share, courseNames);
                return (
                  <div key={share.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
                    {share.share_type === 'email'
                      ? <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      : share.share_type === 'course'
                        ? <GraduationCap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        : <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                    <select
                      value={share.permission}
                      onChange={async (e) => {
                        try {
                          await setSharePermission(share.id, e.target.value as GrantablePermission);
                          await load();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Could not change that.');
                        }
                      }}
                      className="h-8 rounded border border-input bg-background px-1.5 text-xs text-foreground"
                      aria-label={`Permission for ${label}`}
                    >
                      {GRANTABLE.map((p) => (
                        <option key={p} value={p}>{describePermission(p)}</option>
                      ))}
                    </select>
                    <Button
                      type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      title="Stop sharing"
                      aria-label={`Stop sharing with ${label}`}
                      onClick={async () => {
                        try {
                          await revokeShare(share.id);
                          await load();
                        } catch (err) {
                          toast.error(err instanceof Error ? err.message : 'Could not revoke that.');
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
