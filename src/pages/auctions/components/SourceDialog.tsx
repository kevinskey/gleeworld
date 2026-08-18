// Create or edit an auction house.
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  INGEST_METHOD_LABELS, TERMS_POSITION_LABELS,
  type AuctionSource, type IngestMethod, type TermsPosition,
} from '@/lib/auctions/types';
import type { SourceInput } from '@/lib/auctions/sourcesApi';

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const EMPTY: SourceInput = {
  name: '', slug: '', base_url: null, ingest_method: 'manual',
  buyer_premium_pct: null, buyer_premium_note: null, buyer_premium_source_url: null,
  terms_url: null, terms_position: 'unreviewed', calendar_url: null,
  email_alerts_url: null, notes: null, active: true,
};

interface SourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: AuctionSource | null;
  onSubmit: (input: SourceInput) => void;
  saving: boolean;
}

export function SourceDialog({ open, onOpenChange, source, onSubmit, saving }: SourceDialogProps) {
  const [form, setForm] = useState<SourceInput>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSlugTouched(Boolean(source));
    setForm(source
      ? {
          name: source.name,
          slug: source.slug,
          base_url: source.base_url,
          ingest_method: source.ingest_method,
          buyer_premium_pct: source.buyer_premium_pct,
          buyer_premium_note: source.buyer_premium_note,
          buyer_premium_source_url: source.buyer_premium_source_url,
          terms_url: source.terms_url,
          terms_position: source.terms_position,
          calendar_url: source.calendar_url,
          email_alerts_url: source.email_alerts_url,
          notes: source.notes,
          active: source.active,
        }
      : EMPTY);
  }, [open, source]);

  const set = <K extends keyof SourceInput>(key: K, value: SourceInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function handleName(name: string) {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
  }

  // Mirrors the database CHECK: a premium without provenance is refused
  // there, so the form refuses it here rather than surfacing a constraint error.
  const premiumNeedsSource =
    form.buyer_premium_pct !== null && !form.buyer_premium_source_url?.trim();
  const canSave =
    form.name.trim().length > 0 && form.slug.trim().length > 0 && !premiumNeedsSource && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="min-w-0">
          <DialogHeader>
            <DialogTitle>{source ? 'Edit auction house' : 'Add an auction house'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="source-name">Name</Label>
              <Input id="source-name" value={form.name} onChange={(e) => handleName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-slug">Short name for links</Label>
              <Input
                id="source-slug"
                value={form.slug}
                onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-url">Website</Label>
              <Input
                id="source-url"
                placeholder="https://"
                value={form.base_url ?? ''}
                onChange={(e) => set('base_url', e.target.value || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-ingest">Where the listings come from</Label>
              <Select
                value={form.ingest_method}
                onValueChange={(v) => set('ingest_method', v as IngestMethod)}
              >
                <SelectTrigger id="source-ingest"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(INGEST_METHOD_LABELS) as IngestMethod[]).map((m) => (
                    <SelectItem key={m} value={m}>{INGEST_METHOD_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-premium">Buyer's premium (%)</Label>
              <Input
                id="source-premium"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.buyer_premium_pct ?? ''}
                onChange={(e) =>
                  set('buyer_premium_pct', e.target.value === '' ? null : Number(e.target.value))
                }
              />
              <p className="text-xs text-muted-foreground">
                Leave blank until you have confirmed it from the house's own terms. A guessed premium
                would quietly distort cost planning later.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-premium-url">Where the premium is published</Label>
              <Input
                id="source-premium-url"
                placeholder="https://"
                value={form.buyer_premium_source_url ?? ''}
                onChange={(e) => set('buyer_premium_source_url', e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground">
                Required whenever a premium is entered — a rate with no source cannot be told apart
                from a guess later.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-premium-note">What the terms actually say</Label>
              <Input
                id="source-premium-note"
                placeholder="18% online, 15% in the room"
                value={form.buyer_premium_note ?? ''}
                onChange={(e) => set('buyer_premium_note', e.target.value || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-terms-position">What their terms allow</Label>
              <Select
                value={form.terms_position}
                onValueChange={(v) => set('terms_position', v as TermsPosition)}
              >
                <SelectTrigger id="source-terms-position"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TERMS_POSITION_LABELS) as TermsPosition[]).map((t) => (
                    <SelectItem key={t} value={t}>{TERMS_POSITION_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A house stays on manual entry until its terms have been read and allow more.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-terms-url">Terms page</Label>
              <Input
                id="source-terms-url"
                placeholder="https://"
                value={form.terms_url ?? ''}
                onChange={(e) => set('terms_url', e.target.value || null)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="source-calendar-url">Upcoming auctions page</Label>
                <Input
                  id="source-calendar-url"
                  placeholder="https://"
                  value={form.calendar_url ?? ''}
                  onChange={(e) => set('calendar_url', e.target.value || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source-alerts-url">Email alert signup</Label>
                <Input
                  id="source-alerts-url"
                  placeholder="https://"
                  value={form.email_alerts_url ?? ''}
                  onChange={(e) => set('email_alerts_url', e.target.value || null)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source-notes">Notes</Label>
              <Textarea
                id="source-notes"
                rows={3}
                value={form.notes ?? ''}
                onChange={(e) => set('notes', e.target.value || null)}
              />
              <p className="text-xs text-muted-foreground">
                Record this house's terms of service position here — whether automated access is
                allowed, and what tier it may use.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="source-active"
                checked={form.active}
                onCheckedChange={(v) => set('active', v === true)}
              />
              <Label htmlFor="source-active" className="font-normal">
                Show this house on the calendar
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => onSubmit(form)} disabled={!canSave}>
              {saving ? 'Saving…' : source ? 'Save changes' : 'Add house'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
