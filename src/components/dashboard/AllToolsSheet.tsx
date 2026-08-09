// AllToolsSheet — the searchable catalog behind Phase 3's "All Tools" entry
// point. Wraps the repo's cmdk-based Command primitives (src/components/ui/
// command.tsx); ranking comes from navSearch's searchNav/scoreEntry, never
// cmdk's built-in fuzzy filter, so the same ranking rules that are unit
// tested in navSearch.test.ts are what the member actually sees.
//
// Scope discipline (Task 2 brief): this component does no gating and no
// saving. It renders whatever `available` it is handed (already resolveNav-
// gated by the caller) and calls `onPin` to append a key — it never imports
// NAV_CATALOG or UNIFIED_MODULES itself.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §5.3
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { DialogTitle } from '@/components/ui/dialog';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from '@/components/ui/command';
import { searchNav, scoreEntry } from '@/lib/navigation/navSearch';
import { NAV_SECTION_LABELS, type CatalogEntry, type NavSectionKey } from '@/lib/navigation/navCatalog';
import { MY_TOOLS_CAP } from '@/lib/navigation/myTools';

export interface AllToolsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Already gated — resolveNav output, never NAV_CATALOG. */
  available: CatalogEntry[];
  /** Keys already on the shelf; these render as pinned and cannot be re-pinned. */
  pinned: string[];
  /** Append this key to My Tools. Resolves false on failure. */
  onPin: (key: string) => Promise<boolean>;
}

const SECTION_ORDER = Object.keys(NAV_SECTION_LABELS) as NavSectionKey[];

const CARD_ITEM =
  'relative flex items-center gap-3 min-h-11 px-3 bg-card text-card-foreground cursor-pointer ' +
  'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground';
// Targets cmdk's own generated [cmdk-group-heading]/[cmdk-group-items]
// elements directly (arbitrary-variant selectors), rather than setting
// typography on the CommandGroup wrapper itself — that would cascade onto
// every row's inherited font-size/text-transform too, since nothing but
// each row's own ROW_LABEL class would override it.
const GROUP_CARD =
  '[&_[cmdk-group-heading]]:text-[13px] [&_[cmdk-group-heading]]:uppercase ' +
  '[&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground ' +
  '[&_[cmdk-group-heading]]:px-1 [&_[cmdk-group-heading]]:pb-1.5 ' +
  '[&_[cmdk-group-items]]:bg-card [&_[cmdk-group-items]]:rounded-xl ' +
  '[&_[cmdk-group-items]]:overflow-hidden [&_[cmdk-group-items]]:divide-y [&_[cmdk-group-items]]:divide-border';
const ROW_LABEL = 'flex-1 text-[17px] truncate';
const BADGE = 'w-6 h-6 rounded-full flex items-center justify-center shrink-0';
// Same 44px-hit-target-around-a-24px-badge trick as MySpaceEditor, so the
// tap target meets the 44pt minimum without inflating the visible badge.
const TAP_TARGET = 'shrink-0 p-2.5 -m-2.5 flex items-center justify-center disabled:opacity-40';

/** entry key -> "label sectionLabel", handed to cmdk as the item's `value`
 *  so cmdk's own accessibility/keyboard plumbing has something to match
 *  against, while the actual ranking always comes from searchNav below —
 *  cmdk's filter prop is wired to defer to it rather than its own fuzzy
 *  matcher. */
function itemValue(entry: CatalogEntry): string {
  return `${entry.key} ${entry.label} ${NAV_SECTION_LABELS[entry.section]}`;
}

function PinControl({
  entry,
  isPinned,
  atCap,
  onPin,
}: {
  entry: CatalogEntry;
  isPinned: boolean;
  atCap: boolean;
  onPin: (key: string) => void;
}) {
  if (isPinned) {
    return (
      <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground shrink-0">
        <Check className="w-4 h-4" aria-hidden />
        In your space
      </span>
    );
  }
  // cmdk selects a CommandItem on pointerdown/mousedown, not just click — a
  // nested button's onClick alone still lets the parent item's onSelect
  // fire first, navigating and closing the sheet out from under the pin.
  // Stopping propagation on both mousedown and click is what actually stops
  // that (see task brief mechanic #1).
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <button
      type="button"
      onMouseDown={stop}
      onClick={(e) => {
        stop(e);
        if (atCap) return;
        onPin(entry.key);
      }}
      disabled={atCap}
      aria-label={`Pin ${entry.label} to your space`}
      className={TAP_TARGET}
    >
      <span className={`${BADGE} bg-primary/10 text-primary`}>
        <Plus className="w-4 h-4" aria-hidden />
      </span>
    </button>
  );
}

function ToolRow({
  entry,
  isPinned,
  atCap,
  onSelect,
  onPin,
}: {
  entry: CatalogEntry;
  isPinned: boolean;
  atCap: boolean;
  onSelect: (entry: CatalogEntry) => void;
  onPin: (key: string) => void;
}) {
  return (
    <CommandItem
      value={itemValue(entry)}
      onSelect={() => onSelect(entry)}
      className={CARD_ITEM}
    >
      <entry.icon className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden />
      <span className={ROW_LABEL}>{entry.label}</span>
      <PinControl entry={entry} isPinned={isPinned} atCap={atCap} onPin={onPin} />
    </CommandItem>
  );
}

export function AllToolsSheet({ open, onOpenChange, available, pinned, onPin }: AllToolsSheetProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const pinnedSet = useMemo(() => new Set(pinned), [pinned]);
  const atCap = pinned.length >= MY_TOOLS_CAP;

  // Radix unmounts DialogContent (and everything inside it, including
  // cmdk's own search state) on close, but this component itself doesn't
  // unmount — without this, reopening the sheet would show an empty input
  // (cmdk's fresh state) while `query` still held the last search, so the
  // grouped/ranked decision below would silently disagree with what's on
  // screen.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  // Empty query: group by section, catalog order (browsing). Any query:
  // one flat ranked list from searchNav — grouping a ranked list would
  // scatter the best matches back across sections, defeating the ranking.
  const grouped = useMemo(() => {
    if (query.trim()) return null;
    const bySection = new Map<NavSectionKey, CatalogEntry[]>();
    for (const entry of available) {
      const list = bySection.get(entry.section) ?? [];
      list.push(entry);
      bySection.set(entry.section, list);
    }
    return SECTION_ORDER
      .map((section) => ({ section, label: NAV_SECTION_LABELS[section], entries: bySection.get(section) ?? [] }))
      .filter((g) => g.entries.length > 0);
  }, [available, query]);

  const ranked = useMemo(
    () => (query.trim() ? searchNav(available, query) : null),
    [available, query],
  );

  const handleSelect = (entry: CatalogEntry) => {
    onOpenChange(false);
    navigate(entry.to);
  };

  const handlePin = (key: string) => {
    void onPin(key);
  };

  // cmdk's own fuzzy matcher must not second-guess searchNav's ranking (the
  // brief is explicit: ranking comes from scoreEntry, not cmdk's default) —
  // so this is wired as cmdk's `filter` prop, called per item with the raw
  // `value` we set on that CommandItem and cmdk's own live search string.
  //
  // Deliberately NOT closing over `ranked`/`query` React state: cmdk runs
  // this filter synchronously, as part of its own internal store update,
  // the instant the input's onChange fires — before React has re-rendered
  // this component with a fresh closure. A version that read `ranked` here
  // would score every item against the PREVIOUS keystroke's results on
  // every render but the first, which is exactly the kind of test-passes-
  // vacuously trap the brief warns about (fireEvent.change + waitFor would
  // still pass once things settled, hiding a real lag). Recomputing
  // scoreEntry directly from the `search` argument cmdk hands us sidesteps
  // that entirely — `available` is the only closed-over value, and it does
  // not change while the member types.
  const byKey = useMemo(() => new Map(available.map((e) => [e.key, e])), [available]);
  const filter = (value: string, search: string) => {
    if (!search.trim()) return 1;
    const entry = byKey.get(value.split(' ')[0]);
    if (!entry) return 0;
    return scoreEntry(entry, search) > 0 ? 1 : 0;
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} filter={filter}>
      <VisuallyHidden>
        <DialogTitle>All Tools</DialogTitle>
      </VisuallyHidden>
      <CommandInput
        placeholder="Search all tools…"
        autoFocus
        onValueChange={setQuery}
      />
      {atCap && (
        <p className="px-4 py-2 text-[13px] text-muted-foreground border-b">
          Your space is full — remove one in Setup to pin another.
        </p>
      )}
      <CommandList>
        <CommandEmpty>No tools match that.</CommandEmpty>
        {grouped
          ? grouped.map(({ section, label, entries }) => (
              <CommandGroup key={section} heading={label} className={GROUP_CARD}>
                {entries.map((entry) => (
                  <ToolRow
                    key={entry.key}
                    entry={entry}
                    isPinned={pinnedSet.has(entry.key)}
                    atCap={atCap}
                    onSelect={handleSelect}
                    onPin={handlePin}
                  />
                ))}
              </CommandGroup>
            ))
          : (
              <CommandGroup className={GROUP_CARD}>
                {(ranked ?? []).map((entry) => (
                  <ToolRow
                    key={entry.key}
                    entry={entry}
                    isPinned={pinnedSet.has(entry.key)}
                    atCap={atCap}
                    onSelect={handleSelect}
                    onPin={handlePin}
                  />
                ))}
              </CommandGroup>
            )}
      </CommandList>
    </CommandDialog>
  );
}
