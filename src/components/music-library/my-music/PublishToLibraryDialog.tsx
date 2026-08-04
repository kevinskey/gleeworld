// Publish a personal score into the tenant's shared Scores library.
// Librarian/admin only (their gw_sheet_music INSERT rights come from the
// existing "Librarians can insert sheet music" policy — regular members
// get a permission error toast, but the UI never offers them the button).
//
// Mechanism: insert a gw_sheet_music row pointing at the PRIVATE
// personal-scores object (20260718140000_publish_private_scores.sql).
// IMPORTANT INVARIANTS:
//   • never set pdf_url — that would mint a permanent public URL for a
//     private file; tenant members read via short-lived signed URLs.
//   • never send tenant_id — the table default/trigger stamps it.
//   • publishing makes the FILE readable by EVERY member of this tenant
//     while the row exists, regardless of the shared_with_* browse flags
//     (those only control listing). The dialog copy says so.
//   • only 'upload'/'cpdl' sources with a storage_path are publishable —
//     store purchases are per-seat entitlements and must never be
//     redistributed. Callers gate the button; this dialog re-checks.
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Library as LibraryIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PersonalScore } from '@/hooks/usePersonalScores';

export const isPublishableSource = (s: PersonalScore) =>
  (s.source === 'upload' || s.source === 'cpdl') && !!s.storage_path;

export function PublishToLibraryDialog({
  score, onOpenChange, onPublished,
}: {
  score: PersonalScore | null;
  onOpenChange: (open: boolean) => void;
  onPublished: () => void;
}) {
  const open = !!score;
  const [rights, setRights] = useState<'public_domain' | 'licensed' | 'unknown'>('unknown');
  const [seatCount, setSeatCount] = useState('');
  const [copyrightHolder, setCopyrightHolder] = useState('');
  const [shareNow, setShareNow] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (score) {
      setRights(score.source === 'cpdl' ? 'public_domain' : 'unknown');
      setSeatCount('');
      setCopyrightHolder('');
      setShareNow(true);
    }
  }, [score]);

  const publish = async () => {
    if (!score || !isPublishableSource(score)) return;
    // gw_sheet_music CHECK: licensed → seat count required.
    const seatNum = parseInt(seatCount, 10);
    const seatForDb = rights === 'licensed' && Number.isFinite(seatNum) && seatNum > 0 ? seatNum : null;
    if (rights === 'licensed' && seatForDb === null) {
      toast.error('Licensed works need a seat count (how many copies your license covers).');
      return;
    }
    setBusy(true);
    const { data, error } = await (supabase as any)
      .from('gw_sheet_music')
      .insert({
        title: score.title,
        composer: score.composer,
        voicing: score.voicing,
        storage_bucket: 'personal-scores',
        storage_path: score.storage_path,
        rights_status: rights,
        license_seat_count: seatForDb,
        copyright_holder: copyrightHolder.trim() || null,
        shared_with_members: shareNow,
      })
      .select('id')
      .maybeSingle();
    setBusy(false);
    if (error || !data) {
      const code = (error as { code?: string } | null)?.code;
      toast.error(
        code === '23505'
          ? 'This file is already published to your group’s library.'
          : 'Could not publish — your role may not have permission.',
      );
      return;
    }
    toast.success(
      shareNow
        ? 'Published — every member can now see it in Scores.'
        : 'Published to the library (not yet listed for members — share it from the Scores tab).',
    );
    onPublished();
    onOpenChange(false);
  };

  if (!score) return null;
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">Publish “{score.title}” to your group’s library</DialogTitle>
          <DialogDescription>
            The PDF becomes readable by <strong>every member of this workspace</strong> while
            it stays published — the Scores-tab sharing options only control who sees it
            listed. You can unpublish at any time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">Rights status</Label>
            <select
              value={rights}
              onChange={(e) => setRights(e.target.value as typeof rights)}
              className="w-full mt-1 h-9 border border-border rounded-md bg-background px-2 text-sm"
            >
              <option value="unknown">Not yet verified</option>
              <option value="public_domain">Public domain (free to distribute)</option>
              <option value="licensed">Licensed (limited seats)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Works marked “all rights reserved” must stay private — don’t publish them.
            </p>
          </div>
          {rights === 'licensed' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Seat count</Label>
                <Input type="number" min={1} value={seatCount} onChange={(e) => setSeatCount(e.target.value)} placeholder="40" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Copyright holder</Label>
                <Input value={copyrightHolder} onChange={(e) => setCopyrightHolder(e.target.value)} placeholder="Hal Leonard" className="mt-1" />
              </div>
            </div>
          )}
          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">List it for everyone right away</div>
              <div className="text-xs text-muted-foreground">
                Off = the score lands in the library unlisted; share it to people, classes, or sections from the Scores tab.
              </div>
            </div>
            <Switch checked={shareNow} onCheckedChange={setShareNow} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={publish} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <LibraryIcon className="w-4 h-4 mr-1.5" />}
            Publish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
