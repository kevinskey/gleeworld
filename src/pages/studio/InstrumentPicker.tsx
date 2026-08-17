// InstrumentPicker — replaces the track strip's native <select> for MIDI
// instruments. The catalog outgrew a flat dropdown (Studio + synths + a
// hundred GM sounds): groups are now COLLAPSIBLE, with a search box that
// cuts across every group. Native <select> optgroups can't collapse, hence
// this popover.
//
// Value contract is unchanged from the select it replaces: '<type>:<preset>'
// split on the FIRST colon ('sampler:gm:violin' → type 'sampler', preset
// 'gm:violin'). The caller owns the session write.
//
// Which groups are open persists per device (localStorage); the group that
// holds the CURRENT instrument is always forced open so the selection can
// never hide from the user.
import { useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { GM_GROUPED, toGmPresetId } from '@/lib/studio/gmInstruments';
import { GW_INSTRUMENTS, toGwPresetId } from '@/lib/studio/gwInstruments';

export interface PickerItem { value: string; label: string }
export interface PickerGroup { label: string; items: PickerItem[] }

// Exported for tests: the full grouped catalog, in picker order.
export function buildInstrumentGroups(): PickerGroup[] {
  return [
    { label: 'Studio', items: GW_INSTRUMENTS.map((g) => ({ value: `sampler:${toGwPresetId(g.name)}`, label: g.label })) },
    {
      label: 'Synth & Basic',
      items: [
        { value: 'synth_basic:sine', label: 'Synth · Sine' },
        { value: 'synth_basic:triangle', label: 'Synth · Triangle' },
        { value: 'synth_basic:square', label: 'Synth · Square' },
        { value: 'synth_basic:sawtooth', label: 'Synth · Sawtooth' },
        { value: 'sampler:kit_basic', label: 'Sampler · Kit' },
      ],
    },
    ...GM_GROUPED.map((group) => ({
      label: group.family,
      items: group.instruments.map((g) => ({ value: `sampler:${toGmPresetId(g.name)}`, label: g.label })),
    })),
  ];
}

// Exported for tests: case-insensitive substring filter across all groups.
export function filterGroups(groups: PickerGroup[], query: string): PickerGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) }))
    .filter((g) => g.items.length > 0);
}

const OPEN_KEY = 'studio.instrumentPicker.open';
// First run: Studio + Synth open, the GM long tail collapsed — mirrors how
// often each gets used without hiding anything.
const DEFAULT_OPEN = ['Studio', 'Synth & Basic'];

function loadOpen(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(OPEN_KEY) || 'null');
    if (Array.isArray(v)) return new Set(v.filter((x): x is string => typeof x === 'string'));
  } catch { /* corrupt / private mode */ }
  return new Set(DEFAULT_OPEN);
}

export function InstrumentPicker({ value, onChange }: {
  value: string;
  onChange: (value: string) => void;
}) {
  const groups = useMemo(buildInstrumentGroups, []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Set<string>>(loadOpen);
  const searchRef = useRef<HTMLInputElement>(null);

  const currentLabel = useMemo(() => {
    for (const g of groups) for (const i of g.items) if (i.value === value) return i.label;
    return 'Instrument…';
  }, [groups, value]);
  const currentGroup = useMemo(() => {
    for (const g of groups) if (g.items.some((i) => i.value === value)) return g.label;
    return null;
  }, [groups, value]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      try { localStorage.setItem(OPEN_KEY, JSON.stringify([...next])); } catch { /* private mode */ }
      return next;
    });
  };

  const searching = query.trim().length > 0;
  const shown = filterGroups(groups, query);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-5 bg-zinc-950 border border-zinc-800 rounded text-zinc-300 px-1 flex-1 min-w-0 text-left truncate hover:border-zinc-600"
          title={currentLabel}
        >
          {currentLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => { e.preventDefault(); searchRef.current?.focus(); }}
        className="w-64 max-h-[min(28rem,70vh)] overflow-y-auto p-1.5 bg-zinc-950 border-zinc-800 text-zinc-200"
      >
        <div className="sticky -top-1.5 -mx-1.5 -mt-1.5 px-1.5 pt-1.5 pb-1 bg-zinc-950 z-10">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" aria-hidden />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search instruments…"
              className="w-full h-7 pl-7 pr-2 rounded bg-zinc-900 border border-zinc-800 text-[13px] text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-zinc-600"
            />
          </div>
        </div>
        {shown.length === 0 && (
          <div className="px-2 py-3 text-[13px] text-zinc-500">No instruments match.</div>
        )}
        {shown.map((g) => {
          // While searching every matching group shows expanded; otherwise
          // collapse honors the persisted set, with the current selection's
          // group always open.
          const expanded = searching || openGroups.has(g.label) || g.label === currentGroup;
          return (
            <div key={g.label} className="mb-0.5">
              <button
                type="button"
                onClick={() => !searching && toggleGroup(g.label)}
                aria-expanded={expanded}
                className="w-full flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-bold uppercase tracking-wide text-zinc-500 hover:text-zinc-300"
              >
                <span className="flex-1 text-left">{g.label}</span>
                <ChevronRight
                  className={`w-3 h-3 transition-transform motion-reduce:transition-none ${expanded ? 'rotate-90' : ''}`}
                  aria-hidden
                />
              </button>
              {expanded && g.items.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  onClick={() => { onChange(i.value); setOpen(false); setQuery(''); }}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-[13px] text-left hover:bg-zinc-800 ${i.value === value ? 'text-white font-semibold' : 'text-zinc-300'}`}
                >
                  <span className="w-3.5 shrink-0">
                    {i.value === value && <Check className="w-3.5 h-3.5" aria-hidden />}
                  </span>
                  <span className="truncate">{i.label}</span>
                </button>
              ))}
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
