// Filter + sort controls for the Scores tab. Facet values are derived
// client-side from the loaded rows (the browse query caps at 200, so
// client filtering is correct and cheap). Desktop gets a Popover; phones
// get a bottom Sheet for 44pt targets. Active filters render as a
// removable chip row under the toolbar. Pattern: StreamlinedFilterBar.
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Filter, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ScoreRow } from './types';

export interface ScoresFilters {
  voicings: string[];
  difficulties: string[];
  tags: string[];
  rights: string[];
  composer: string | null;
}

export type ScoresSort = 'title' | 'composer' | 'recent';

export const EMPTY_FILTERS: ScoresFilters = {
  voicings: [], difficulties: [], tags: [], rights: [], composer: null,
};

export function countActiveFilters(f: ScoresFilters): number {
  return f.voicings.length + f.difficulties.length + f.tags.length + f.rights.length + (f.composer ? 1 : 0);
}

// Applies filters to rows — exported so the page's `filtered` memo and this
// component agree on semantics.
export function applyScoresFilters(rows: ScoreRow[], f: ScoresFilters): ScoreRow[] {
  return rows.filter((r) =>
    (f.voicings.length === 0 || (r.voicing != null && f.voicings.includes(r.voicing)))
    && (f.difficulties.length === 0 || (r.difficulty_level != null && f.difficulties.includes(r.difficulty_level)))
    && (f.tags.length === 0 || (r.tags ?? []).some((t) => f.tags.includes(t)))
    && (f.rights.length === 0 || (r.rights_status != null && f.rights.includes(r.rights_status)))
    && (!f.composer || r.composer === f.composer),
  );
}

const RIGHTS_LABEL: Record<string, string> = {
  public_domain: 'Public domain',
  licensed: 'Licensed',
  all_rights_reserved: 'All rights reserved',
  unknown: 'Not yet tagged',
};

function uniqueSorted(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((v): v is string => !!v && v.trim() !== ''))].sort();
}

export function ScoresFilterBar({
  rows, filters, onFiltersChange, sort, onSortChange,
}: {
  rows: ScoreRow[];
  filters: ScoresFilters;
  onFiltersChange: (f: ScoresFilters) => void;
  sort: ScoresSort;
  onSortChange: (s: ScoresSort) => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const voicings = useMemo(() => uniqueSorted(rows.map((r) => r.voicing)), [rows]);
  const difficulties = useMemo(() => uniqueSorted(rows.map((r) => r.difficulty_level)), [rows]);
  const tags = useMemo(() => uniqueSorted(rows.flatMap((r) => r.tags ?? [])), [rows]);
  const rights = useMemo(() => uniqueSorted(rows.map((r) => r.rights_status)), [rows]);
  const composers = useMemo(() => uniqueSorted(rows.map((r) => r.composer)), [rows]);

  const active = countActiveFilters(filters);

  const toggle = (key: 'voicings' | 'difficulties' | 'tags' | 'rights', value: string) => {
    const current = filters[key];
    onFiltersChange({
      ...filters,
      [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    });
  };

  const clearAll = () => onFiltersChange(EMPTY_FILTERS);

  const checkboxGroup = (
    title: string,
    values: string[],
    key: 'voicings' | 'difficulties' | 'tags' | 'rights',
    labelFor: (v: string) => string = (v) => v,
  ) => values.length > 0 && (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold">{title}</Label>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => toggle(key, v)}
            className="flex items-center gap-2 py-1.5 rounded text-left hover:bg-muted/60 min-h-[36px]"
          >
            <Checkbox checked={filters[key].includes(v)} className="pointer-events-none" aria-hidden />
            <span className="text-sm truncate">{labelFor(v)}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const panel = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Filters</span>
        {active > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearAll}>
            <X className="w-3 h-3 mr-1" /> Clear all
          </Button>
        )}
      </div>
      <Separator />
      {composers.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-sm font-semibold">Composer</Label>
          <Select
            value={filters.composer ?? 'all'}
            onValueChange={(v) => onFiltersChange({ ...filters, composer: v === 'all' ? null : v })}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All composers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All composers</SelectItem>
              {composers.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      {checkboxGroup('Voicing', voicings, 'voicings')}
      {checkboxGroup('Difficulty', difficulties, 'difficulties')}
      {checkboxGroup('Tags', tags, 'tags')}
      {checkboxGroup('Rights', rights, 'rights', (v) => RIGHTS_LABEL[v] ?? v)}
    </div>
  );

  const triggerButton = (
    <Button variant="outline" size="sm" className="h-9 relative shrink-0">
      <Filter className="w-4 h-4 sm:mr-1.5" />
      <span className="hidden sm:inline">Filters</span>
      {active > 0 && (
        <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
          {active}
        </Badge>
      )}
    </Button>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>{triggerButton}</SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]">
            <SheetHeader className="sr-only">
              <SheetTitle>Filter scores</SheetTitle>
            </SheetHeader>
            {panel}
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          <PopoverContent className="w-96 max-h-[70vh] overflow-y-auto" align="end">
            {panel}
          </PopoverContent>
        </Popover>
      )}
      <Select value={sort} onValueChange={(v) => onSortChange(v as ScoresSort)}>
        <SelectTrigger className="h-9 w-auto sm:w-44 shrink-0" aria-label="Sort scores">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="title">Title A → Z</SelectItem>
          <SelectItem value="composer">Composer A → Z</SelectItem>
          <SelectItem value="recent">Recently added</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}

// Removable chip row for the active filters — rendered by the page under
// the toolbar so it can span the full content width.
export function ActiveFilterChips({
  filters, onFiltersChange,
}: {
  filters: ScoresFilters;
  onFiltersChange: (f: ScoresFilters) => void;
}) {
  const chips: Array<{ key: string; label: string; remove: () => void }> = [
    ...filters.voicings.map((v) => ({
      key: `voicing-${v}`, label: v,
      remove: () => onFiltersChange({ ...filters, voicings: filters.voicings.filter((x) => x !== v) }),
    })),
    ...filters.difficulties.map((v) => ({
      key: `diff-${v}`, label: v,
      remove: () => onFiltersChange({ ...filters, difficulties: filters.difficulties.filter((x) => x !== v) }),
    })),
    ...filters.tags.map((v) => ({
      key: `tag-${v}`, label: `#${v}`,
      remove: () => onFiltersChange({ ...filters, tags: filters.tags.filter((x) => x !== v) }),
    })),
    ...filters.rights.map((v) => ({
      key: `rights-${v}`, label: RIGHTS_LABEL[v] ?? v,
      remove: () => onFiltersChange({ ...filters, rights: filters.rights.filter((x) => x !== v) }),
    })),
    ...(filters.composer ? [{
      key: 'composer', label: filters.composer,
      remove: () => onFiltersChange({ ...filters, composer: null }),
    }] : []),
  ];
  if (chips.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.remove}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs hover:bg-muted transition-colors"
          aria-label={`Remove filter ${c.label}`}
        >
          {c.label}
          <X className="w-3 h-3" />
        </button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        onClick={() => onFiltersChange(EMPTY_FILTERS)}
      >
        Clear all
      </Button>
    </div>
  );
}
