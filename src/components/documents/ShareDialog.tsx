// Share a document with other people by email.
//
// Email rather than a user picker: you can share with someone who hasn't
// signed in yet — access appears the moment they do, because RLS matches
// against the email in their JWT.
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  listShares, upsertShare, revokeShare, isPlausibleEmail, describePermission,
  type DocShare, type GrantablePermission,
} from '@/lib/documents/sharesApi';

const GRANTABLE: GrantablePermission[] = ['view', 'comment', 'edit'];

interface ShareDialogProps {
  docId: string;
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ docId, userId, open, onOpenChange }: ShareDialogProps) {
  const [shares, setShares] = useState<DocShare[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<GrantablePermission>('comment');
  const [busy, setBusy] = useState(false);

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

  const add = useCallback(async () => {
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
      toast.error(e instanceof Error ? e.message : 'Could not share the document.');
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
            People you share with see this document in their own Documents
            library. They don’t need an account yet — access starts the first
            time they sign in with that address.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void add(); } }}
            placeholder="name@example.com"
            type="email"
            aria-label="Email address"
            className="h-9 min-w-[12rem] flex-1"
          />
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as GrantablePermission)}
            className="h-9 rounded border border-input bg-background px-2 text-sm text-foreground"
            aria-label="Permission"
          >
            {GRANTABLE.map((p) => (
              <option key={p} value={p}>{describePermission(p)}</option>
            ))}
          </select>
          <Button type="button" size="sm" className="h-9" disabled={busy} onClick={() => void add()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            <span className="ml-1.5">Share</span>
          </Button>
        </div>

        <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
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
          {shares.map((share) => (
            <div key={share.id} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
              <span className="min-w-0 flex-1 truncate text-sm">{share.shared_with_email}</span>
              <select
                value={share.permission}
                onChange={async (e) => {
                  if (!userId) return;
                  try {
                    await upsertShare({
                      docId,
                      email: share.shared_with_email,
                      permission: e.target.value as GrantablePermission,
                      createdBy: userId,
                    });
                    await load();
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Could not change that.');
                  }
                }}
                className="h-8 rounded border border-input bg-background px-1.5 text-xs text-foreground"
                aria-label={`Permission for ${share.shared_with_email}`}
              >
                {GRANTABLE.map((p) => (
                  <option key={p} value={p}>{describePermission(p)}</option>
                ))}
              </select>
              <Button
                type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                title="Stop sharing"
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
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
