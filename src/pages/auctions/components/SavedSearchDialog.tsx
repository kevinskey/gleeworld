// Build a saved search. The form writes the criteria JSONB the matcher job
// reads, so the field names here mirror that shape exactly.
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
import {
  MODALITIES, MODALITY_LABELS, NOTIFY_CHANNEL_LABELS, NOTIFY_FREQUENCY_LABELS,
  type Modality, type NotifyChannel, type NotifyFrequency, type SavedSearch, type SearchCriteria,
} from '@/lib/auctions/types';
import type { SavedSearchInput } from '@/lib/auctions/searchesApi';

interface FormState {
  name: string;
  modality: Modality[];
  manufacturer: string;
  model_contains: string;
  year_min: string;
  max_hammer_dollars: string;
  states: string;
  condition: string;
  notify_channel: NotifyChannel;
  notify_frequency: NotifyFrequency;
  notify_whatsapp: boolean;
  active: boolean;
}

const EMPTY: FormState = {
  name: '', modality: [], manufacturer: '', model_contains: '', year_min: '',
  max_hammer_dollars: '', states: '', condition: '',
  notify_channel: 'in_app', notify_frequency: 'daily', notify_whatsapp: false, active: true,
};

function splitList(value: string): string[] {
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

function toForm(search: SavedSearch): FormState {
  const c = search.criteria ?? {};
  return {
    name: search.name,
    modality: c.modality ?? [],
    manufacturer: (c.manufacturer ?? []).join(', '),
    model_contains: c.model_contains ?? '',
    year_min: c.year_min ? String(c.year_min) : '',
    max_hammer_dollars: c.max_hammer_cents ? String(Math.round(c.max_hammer_cents / 100)) : '',
    states: (c.states ?? []).join(', '),
    condition: (c.condition ?? []).join(', '),
    notify_channel: search.notify_channel,
    notify_frequency: search.notify_frequency,
    notify_whatsapp: search.notify_whatsapp,
    active: search.active,
  };
}

function toCriteria(form: FormState): SearchCriteria {
  const criteria: SearchCriteria = {};
  if (form.modality.length) criteria.modality = form.modality;

  const manufacturer = splitList(form.manufacturer);
  if (manufacturer.length) criteria.manufacturer = manufacturer;

  if (form.model_contains.trim()) criteria.model_contains = form.model_contains.trim();

  const yearMin = Number(form.year_min);
  if (form.year_min.trim() && Number.isFinite(yearMin)) criteria.year_min = yearMin;

  const maxDollars = Number(form.max_hammer_dollars);
  if (form.max_hammer_dollars.trim() && Number.isFinite(maxDollars)) {
    criteria.max_hammer_cents = Math.round(maxDollars * 100);
  }

  const states = splitList(form.states).map((s) => s.toUpperCase());
  if (states.length) criteria.states = states;

  const condition = splitList(form.condition);
  if (condition.length) criteria.condition = condition;

  return criteria;
}

interface SavedSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: SavedSearch | null;
  onSubmit: (input: SavedSearchInput) => void;
  saving: boolean;
}

export function SavedSearchDialog({
  open, onOpenChange, search, onSubmit, saving,
}: SavedSearchDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (!open) return;
    setForm(search ? toForm(search) : EMPTY);
  }, [open, search]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function toggleModality(m: Modality, checked: boolean) {
    setForm((f) => ({
      ...f,
      modality: checked ? [...f.modality, m] : f.modality.filter((x) => x !== m),
    }));
  }

  const canSave = form.name.trim().length > 0 && !saving;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="min-w-0">
          <DialogHeader>
            <DialogTitle>{search ? 'Edit saved search' : 'New saved search'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="search-name">Name this search</Label>
              <Input
                id="search-name"
                placeholder="1.5T MRI under $80k in the Southeast"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Equipment type</legend>
              <p className="text-xs text-muted-foreground">
                Leave all unchecked to consider every type.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {MODALITIES.map((m) => (
                  <div key={m} className="flex items-center gap-2">
                    <Checkbox
                      id={`search-modality-${m}`}
                      checked={form.modality.includes(m)}
                      onCheckedChange={(v) => toggleModality(m, v === true)}
                    />
                    <Label htmlFor={`search-modality-${m}`} className="font-normal text-xs">
                      {MODALITY_LABELS[m]}
                    </Label>
                  </div>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-manufacturer">Manufacturers</Label>
                <Input
                  id="search-manufacturer"
                  placeholder="Siemens, GE"
                  value={form.manufacturer}
                  onChange={(e) => set('manufacturer', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Separate with commas.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-model">Model contains</Label>
                <Input
                  id="search-model"
                  placeholder="Avanto"
                  value={form.model_contains}
                  onChange={(e) => set('model_contains', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-year">Built no earlier than</Label>
                <Input
                  id="search-year"
                  type="number"
                  placeholder="2012"
                  value={form.year_min}
                  onChange={(e) => set('year_min', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Lots with no stated year will not match.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-max">Maximum current bid ($)</Label>
                <Input
                  id="search-max"
                  type="number"
                  min={0}
                  placeholder="80000"
                  value={form.max_hammer_dollars}
                  onChange={(e) => set('max_hammer_dollars', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This is the bid alone. Rigging, freight, install, and service are not included.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-states">States</Label>
                <Input
                  id="search-states"
                  placeholder="GA, FL, AL"
                  value={form.states}
                  onChange={(e) => set('states', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Two-letter codes, separated by commas. Distance-from-a-ZIP filtering is not
                  available yet.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-condition">Condition wording</Label>
                <Input
                  id="search-condition"
                  placeholder="working, powers on"
                  value={form.condition}
                  onChange={(e) => set('condition', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Matches wording in the listing's condition notes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
              <div className="space-y-2">
                <Label htmlFor="search-channel">Alert me</Label>
                <Select
                  value={form.notify_channel}
                  onValueChange={(v) => set('notify_channel', v as NotifyChannel)}
                >
                  <SelectTrigger id="search-channel"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(NOTIFY_CHANNEL_LABELS) as NotifyChannel[]).map((c) => (
                      <SelectItem key={c} value={c}>{NOTIFY_CHANNEL_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="search-frequency">How often</Label>
                <Select
                  value={form.notify_frequency}
                  onValueChange={(v) => set('notify_frequency', v as NotifyFrequency)}
                >
                  <SelectTrigger id="search-frequency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(NOTIFY_FREQUENCY_LABELS) as NotifyFrequency[]).map((f) => (
                      <SelectItem key={f} value={f}>{NOTIFY_FREQUENCY_LABELS[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox
                id="search-whatsapp"
                className="mt-0.5"
                checked={form.notify_whatsapp}
                onCheckedChange={(v) => set('notify_whatsapp', v === true)}
              />
              <div>
                <Label htmlFor="search-whatsapp" className="font-normal">
                  Also send a WhatsApp nudge
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A short message with the count and a link — the lots stay here and in your email.
                  Needs WhatsApp alerts turned on for your account, on the Saved searches page.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="search-active"
                checked={form.active}
                onCheckedChange={(v) => set('active', v === true)}
              />
              <Label htmlFor="search-active" className="font-normal">
                Keep this search running
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              disabled={!canSave}
              onClick={() => onSubmit({
                name: form.name.trim(),
                criteria: toCriteria(form),
                notify_channel: form.notify_channel,
                notify_frequency: form.notify_frequency,
                notify_whatsapp: form.notify_whatsapp,
                active: form.active,
              })}
            >
              {saving ? 'Saving…' : search ? 'Save changes' : 'Create search'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
