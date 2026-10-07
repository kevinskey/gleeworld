// Share a document with a group or with one person.
//
// Groups: everyone in this workspace, all staff, all admins, or a class the
// owner teaches — the same targets the Jukebox and video shares offer. Until
// 2026-10-07 this dialog only took one email address at a time, so an
// instructor had no way to hand a document to their members.
//
// One person: by email, so you can share with someone who hasn't signed in
// yet — access appears the moment they do, because RLS matches against the
// email in their JWT.
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
  listShares, upsertShare, upsertAudienceShare, updateSharePermission, revokeShare,
  getCurrentTenantId, sharesForTenant, shareTypeOf, describeShareTarget,
  explainShareError, isPlausibleEmail, describePermission,
  type DocAudience, type DocShare, type GrantablePermission,
} from '@/lib/documents/sharesApi';

const GRANTABLE: GrantablePermission[] = ['view', 'comment', 'edit'];

const ROLE_TARGETS = [
  { value: 'role:member', label: 'Everyone in this workspace' },
  { value: 'role:staff', label: 'All staff' },
  { value: 'role:admin', label: 'All admins' },
] as const;

const SELECT_CLASS =
  'h-11 lg:h-9 rounded-none border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

function parseAudience(value: string): DocAudience | null {
  const [kind, id] = value.split(':');
  if (kind === 'role' && (id === 'member' || id === 'staff' || id === 'admin')) return { kind: 'role', role: id };
  if (kind === 'course' && id) return { kind: 'course', courseId: id };
  return null;
}

interface ShareDialogProps {
  docId: string;
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ docId, userId, open, onOpenChange }: ShareDialogProps) {
  const { data: courses = [] } = useManagedCourses();
  const [shares, setShares] = useState<DocShare[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [audience, setAudience] = useState<string>('role:member');
  const [audiencePermission, setAudiencePermission] = useState<GrantablePermission>('view');
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<GrantablePermission>('comment');
  const [busy, setBusy] = useState(false);

  const courseNames = useMemo(() => Object.fromEntries(
    (courses as Array<{ id: string; course_code?: string; title?: string }>).map(
      (c) => [c.id, c.course_code || c.title || 'Class'],
    ),
  ), [courses]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, tenant] = await Promise.all([listShares(docId), getCurrentTenantId()]);
      setTenantId(tenant);
      setShares(sharesForTenant(rows, tenant));
    } catch (e) {
      toast.error(explainShareError(e, 'Could not load the share list.'));
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => { if (open) void load(); }, [open, load]);

  const addAudience = useCallback(async () => {
    if (!userId) return;
    const target = parseAudience(audience);
    if (!target) return;
    if (!tenantId) {
      toast.error('Could not tell which workspace you are in. Reload the page and try again.');
      return;
    }
    setBusy(true);
    try {
      await upsertAudienceShare({
        docId, audience: target, permission: audiencePermission, createdBy: userId, tenantId,
      });
      await load();
      toast.success('Shared. They will find it in their Documents.');
    } catch (e) {
      toast.error(explainShareError(e, 'Could not share the document.'));
    } finally {
      setBusy(false);
    }
  }, [audience, audiencePermission, docId, load, tenantId, userId]);

  const addEmail = useCallback(async () => {
    if (!userId) return;
    if (!isPlausibleEmail(email)) {
      toast.error('Enter an email address.');
      return;
    }
    setBusy(true);
    try {
      await upsertShare({ docId, email, permission, createdBy: userId });
      setEmail('');
      await load();
    } catch (e) {
      toast.error(explainShareError(e, 'Could not share the document.'));
    } finally {
      setBusy(false);
    }
  }, [docId, email, permission, userId, load]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            People you share with find this document in their own Documents
            library.
          </DialogDescription>
        </DialogHeader>

        {/* min-w-0: DialogContent is a grid, and long emails and class
            names blow the track out on phones without it. */}
        <div className="min-w-0 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="doc-share-audience" className="text-xs">Share with a group</Label>
            <div className="flex flex-wrap items-center gap-2">
              <select
                id="doc-share-audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className={`${SELECT_CLASS} min-w-[12rem] flex-1`}
              >
                {ROLE_TARGETS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
                {courses.length > 0 && (
                  <optgroup label="Classes">
                    {(courses as Array<{ id: string }>).map((c) => (
                      <option key={c.id} value={`course:${c.id}`}>{courseNames[c.id]}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              <select
                value={audiencePermission}
                onChange={(e) => setAudiencePermission(e.target.value as GrantablePermission)}
                className={SELECT_CLASS}
                aria-label="Permission for the group"
              >
                {GRANTABLE.map((p) => (
                  <option key={p} value={p}>{describePermission(p)}</option>
                ))}
              </select>
              <Button type="button" size="sm" className="h-11 lg:h-9" disabled={busy || !userId} onClick={() => void addAudience()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                <span className="ml-1.5">Share</span>
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-share-email" className="text-xs">Share with one person</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="doc-share-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addEmail(); } }}
                placeholder="name@example.com"
                type="email"
                className="h-11 lg:h-9 min-w-[12rem] flex-1"
              />
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as GrantablePermission)}
                className={SELECT_CLASS}
                aria-label="Permission for this person"
              >
                {GRANTABLE.map((p) => (
                  <option key={p} value={p}>{describePermission(p)}</option>
                ))}
              </select>
              <Button type="button" size="sm" className="h-11 lg:h-9" disabled={busy || !userId} onClick={() => void addEmail()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                <span className="ml-1.5">Share</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              They don’t need an account yet. Access starts the first time
              they sign in with that address.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Shared with</Label>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {loading && (
                <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              )}
              {!loading && shares.length === 0 && (
                <p className="py-2 text-sm text-muted-foreground">
                  Only you can open this document. Pick a group or enter an
                  email above to share it.
                </p>
              )}
              {shares.map((share) => {
                const type = shareTypeOf(share);
                const label = describeShareTarget(share, courseNames);
                return (
                  <div key={share.id} className="flex items-center gap-2 border border-border p-2.5">
                    {type === 'email'
                      ? <Mail className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      : type === 'course'
                        ? <GraduationCap className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        : <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
                    <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                    <select
                      value={share.permission}
                      onChange={async (e) => {
                        try {
                          await updateSharePermission(share.id, e.target.value as GrantablePermission);
                          await load();
                        } catch (err) {
                          toast.error(explainShareError(err, 'Could not change that.'));
                        }
                      }}
                      className={`${SELECT_CLASS} text-xs`}
                      aria-label={`Permission for ${label}`}
                    >
                      {GRANTABLE.map((p) => (
                        <option key={p} value={p}>{describePermission(p)}</option>
                      ))}
                    </select>
                    <Button
                      type="button" variant="ghost" size="icon" className="h-11 w-11 lg:h-9 lg:w-9 text-destructive"
                      title="Stop sharing"
                      aria-label={`Stop sharing with ${label}`}
                      onClick={async () => {
                        try {
                          await revokeShare(share.id);
                          await load();
                        } catch (err) {
                          toast.error(explainShareError(err, 'Could not revoke that.'));
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
