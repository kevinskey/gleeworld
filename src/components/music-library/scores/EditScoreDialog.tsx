import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { ScoreRow } from './types';

export function EditScoreDialog({
  score, onOpenChange, onSaved,
}: {
  score: ScoreRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const open = !!score;
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [voicing, setVoicing] = useState('');
  const [physicalCopies, setPhysicalCopies] = useState('');
  const [physicalLocation, setPhysicalLocation] = useState('');
  // Rights model — see Copyright & Content Policy.
  const [rightsStatus, setRightsStatus] = useState<'public_domain' | 'licensed' | 'all_rights_reserved' | 'unknown'>('unknown');
  const [licenseSeatCount, setLicenseSeatCount] = useState('');
  const [copyrightHolder, setCopyrightHolder] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (score) {
      setTitle(score.title ?? '');
      setComposer(score.composer ?? '');
      setVoicing(score.voicing ?? '');
      setPhysicalCopies(
        score.physical_copies_count != null ? String(score.physical_copies_count) : '',
      );
      setPhysicalLocation(score.physical_location ?? '');
      setRightsStatus((score.rights_status as any) ?? 'unknown');
      setLicenseSeatCount(score.license_seat_count != null ? String(score.license_seat_count) : '');
      setCopyrightHolder(score.copyright_holder ?? '');
    }
  }, [score]);

  async function handleSave() {
    if (!score) return;
    setSubmitting(true);
    try {
      const copies = parseInt(physicalCopies, 10);
      // CHECK constraint requires: licensed → seat count set; non-licensed → seat count null.
      const seatNum = parseInt(licenseSeatCount, 10);
      const seatForDb = rightsStatus === 'licensed' && Number.isFinite(seatNum) && seatNum > 0
        ? seatNum
        : null;
      if (rightsStatus === 'licensed' && seatForDb === null) {
        throw new Error('Licensed works need a seat count (how many copies your license covers).');
      }
      const { error } = await supabase
        .from('gw_sheet_music')
        .update({
          title: title.trim() || 'Untitled',
          composer: composer.trim() || null,
          voicing: voicing.trim() || null,
          physical_copies_count: Number.isFinite(copies) ? copies : 0,
          physical_location: physicalLocation.trim() || null,
          rights_status: rightsStatus,
          license_seat_count: seatForDb,
          copyright_holder: copyrightHolder.trim() || null,
        })
        .eq('id', score.id);
      if (error) throw error;
      toast.success('Score updated.');
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || 'Update failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit score</DialogTitle>
          <DialogDescription>
            Update title, composer, voicing, and physical inventory for this score.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">Composer</Label>
            <Input value={composer} onChange={(e) => setComposer(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">Voicing</Label>
            <Input value={voicing} onChange={(e) => setVoicing(e.target.value)} placeholder="SATB" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Physical copies</Label>
              <Input
                type="number"
                min={0}
                value={physicalCopies}
                onChange={(e) => setPhysicalCopies(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-sm">Library location</Label>
              <Input
                value={physicalLocation}
                onChange={(e) => setPhysicalLocation(e.target.value)}
                placeholder="Folder B-12"
              />
            </div>
          </div>

          {/* Rights model — see /copyright-policy. */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rights &amp; licensing
            </div>
            <div>
              <Label className="text-sm">Rights status</Label>
              <select
                value={rightsStatus}
                onChange={(e) => setRightsStatus(e.target.value as typeof rightsStatus)}
                className="w-full mt-1 h-9 border border-border rounded-md bg-background px-2 text-sm"
              >
                <option value="unknown">Not yet tagged</option>
                <option value="public_domain">Public domain (free to distribute)</option>
                <option value="licensed">Licensed (limited seats)</option>
                <option value="all_rights_reserved">All rights reserved (private use only)</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {rightsStatus === 'public_domain' && 'No seat limit. Modern editions may still be copyrighted — verify the editor.'}
                {rightsStatus === 'licensed' && 'One active member per seat. Reduce roster or buy more copies if you grow past the count.'}
                {rightsStatus === 'all_rights_reserved' && 'Private use only — do NOT share with members or move to the shared library.'}
                {rightsStatus === 'unknown' && 'Tag this work before adding it to a course library.'}
              </p>
            </div>
            {rightsStatus === 'licensed' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Seat count</Label>
                  <Input
                    type="number"
                    min={1}
                    value={licenseSeatCount}
                    onChange={(e) => setLicenseSeatCount(e.target.value)}
                    placeholder="40"
                  />
                </div>
                <div>
                  <Label className="text-sm">Copyright holder</Label>
                  <Input
                    value={copyrightHolder}
                    onChange={(e) => setCopyrightHolder(e.target.value)}
                    placeholder="Hal Leonard"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting || !title.trim()}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Pencil className="w-4 h-4 mr-1.5" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
