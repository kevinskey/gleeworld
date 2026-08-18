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
import { INGEST_METHOD_LABELS, type AuctionSource, type IngestMethod } from '@/lib/auctions/types';
import type { SourceInput } from '@/lib/auctions/sourcesApi';

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const EMPTY: SourceInput = {
  name: '', slug: '', base_url: null, ingest_method: 'manual',
  buyer_premium_pct: null, notes: null, active: true,
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

  const canSave = form.name.trim().length > 0 && form.slug.trim().length > 0 && !saving;

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
