// Create or edit a single auction (sale).
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
import { fromLocalInput, toLocalInput } from '@/lib/auctions/datetime';
import {
  MODALITIES, MODALITY_LABELS,
  type AuctionStatus, type AuctionWithSource, type Modality, type AuctionSource,
} from '@/lib/auctions/types';
import type { AuctionInput } from '@/lib/auctions/auctionsApi';

const STATUSES: { value: AuctionStatus; label: string }[] = [
  { value: 'announced', label: 'Announced' },
  { value: 'catalog_posted', label: 'Catalog posted' },
  { value: 'open', label: 'Bidding open' },
  { value: 'closed', label: 'Closed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Form state keeps dates as datetime-local strings; they convert to UTC on save.
interface FormState {
  source_id: string;
  external_id: string;
  title: string;
  location_city: string;
  location_state: string;
  opens_at: string;
  closes_at: string;
  catalog_url: string;
  catalog_released_at: string;
  status: AuctionStatus;
  modality_focus: Modality[];
}

const EMPTY: FormState = {
  source_id: '', external_id: '', title: '', location_city: '', location_state: '',
  opens_at: '', closes_at: '', catalog_url: '', catalog_released_at: '',
  status: 'announced', modality_focus: [],
};

interface AuctionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auction: AuctionWithSource | null;
  sources: AuctionSource[];
  onSubmit: (input: AuctionInput) => void;
  saving: boolean;
}

export function AuctionDialog({
  open, onOpenChange, auction, sources, onSubmit, saving,
}: AuctionDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm(auction
      ? {
          source_id: auction.source_id,
          external_id: auction.external_id ?? '',
          title: auction.title,
          location_city: auction.location_city ?? '',
          location_state: auction.location_state ?? '',
          opens_at: toLocalInput(auction.opens_at),
          closes_at: toLocalInput(auction.closes_at),
          catalog_url: auction.catalog_url ?? '',
          catalog_released_at: toLocalInput(auction.catalog_released_at),
          status: auction.status,
          modality_focus: auction.modality_focus ?? [],
        }
      : { ...EMPTY, source_id: sources[0]?.id ?? '' });
  }, [open, auction, sources]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function toggleModality(m: Modality, checked: boolean) {
    setForm((f) => ({
      ...f,
      modality_focus: checked
        ? [...f.modality_focus, m]
        : f.modality_focus.filter((x) => x !== m),
    }));
  }

  const opensIso = fromLocalInput(form.opens_at);
  const closesIso = fromLocalInput(form.closes_at);
  const datesOutOfOrder = Boolean(opensIso && closesIso && closesIso < opensIso);
  const canSave = form.title.trim().length > 0 && form.source_id !== '' && !datesOutOfOrder && !saving;

  function submit() {
    onSubmit({
      source_id: form.source_id,
      external_id: form.external_id.trim() || null,
      title: form.title.trim(),
      location_city: form.location_city.trim() || null,
      location_state: form.location_state.trim() || null,
      opens_at: opensIso,
      closes_at: closesIso,
      catalog_url: form.catalog_url.trim() || null,
      catalog_released_at: fromLocalInput(form.catalog_released_at),
      status: form.status,
      modality_focus: form.modality_focus,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="min-w-0">
          <DialogHeader>
            <DialogTitle>{auction ? 'Edit auction' : 'Add an auction'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="auction-source">Auction house</Label>
              <Select value={form.source_id} onValueChange={(v) => set('source_id', v)}>
                <SelectTrigger id="auction-source">
                  <SelectValue placeholder="Choose a house" />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auction-title">Title</Label>
              <Input id="auction-title" value={form.title} onChange={(e) => set('title', e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auction-city">City</Label>
                <Input id="auction-city" value={form.location_city} onChange={(e) => set('location_city', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auction-state">State</Label>
                <Input id="auction-state" value={form.location_state} onChange={(e) => set('location_state', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auction-opens">Opens</Label>
                <Input id="auction-opens" type="datetime-local" value={form.opens_at} onChange={(e) => set('opens_at', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="auction-closes">Closes</Label>
                <Input id="auction-closes" type="datetime-local" value={form.closes_at} onChange={(e) => set('closes_at', e.target.value)} />
              </div>
            </div>
            {datesOutOfOrder && (
              <p className="text-xs text-destructive">
                The closing time is before the opening time. Adjust one of them to save.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="auction-catalog-date">Catalog release</Label>
              <Input
                id="auction-catalog-date"
                type="datetime-local"
                value={form.catalog_released_at}
                onChange={(e) => set('catalog_released_at', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if the house has not announced one — the calendar will show an estimate
                three days before the sale opens, clearly marked as an estimate.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="auction-catalog-url">Catalog link</Label>
              <Input
                id="auction-catalog-url"
                placeholder="https://"
                value={form.catalog_url}
                onChange={(e) => set('catalog_url', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auction-status">Status</Label>
                <Select value={form.status} onValueChange={(v) => set('status', v as AuctionStatus)}>
                  <SelectTrigger id="auction-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="auction-external">House's own reference</Label>
                <Input
                  id="auction-external"
                  value={form.external_id}
                  onChange={(e) => set('external_id', e.target.value)}
                />
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Equipment expected</legend>
              <p className="text-xs text-muted-foreground">
                Leave all unchecked for a general sale — it will show up under every equipment filter.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {MODALITIES.map((m) => (
                  <div key={m} className="flex items-center gap-2">
                    <Checkbox
                      id={`modality-${m}`}
                      checked={form.modality_focus.includes(m)}
                      onCheckedChange={(v) => toggleModality(m, v === true)}
                    />
                    <Label htmlFor={`modality-${m}`} className="font-normal text-xs">
                      {MODALITY_LABELS[m]}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!canSave}>
              {saving ? 'Saving…' : auction ? 'Save changes' : 'Add auction'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
