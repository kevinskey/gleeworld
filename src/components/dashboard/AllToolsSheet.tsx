// AllToolsSheet — the searchable catalog behind Phase 3's "All Tools" entry
// point. Wraps the repo's cmdk-based Command primitives (src/components/ui/
// command.tsx); ranking comes from navSearch's searchNav, never cmdk's
// built-in fuzzy filter, so the same ranking rules that are unit tested in
// navSearch.test.ts are what the member actually sees.
//
// Scope discipline (Task 2 brief): this component does no gating and no
// saving. It renders whatever `available` it is handed (already resolveNav-
// gated by the caller) and calls `onPin` to append a key — it never imports
// NAV_CATALOG or UNIFIED_MODULES itself.
// Spec: docs/superpowers/specs/2026-08-08-my-space-nav-design.md §5.3
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from '@/components/ui/command';
import { searchNav } from '@/lib/navigation/navSearch';
import { NAV_SECTION_LABELS, type CatalogEntry, type NavSectionKey } from '@/lib/navigation/navCatalog';
import { useToast } from '@/hooks/use-toast';

export interface AllToolsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Already gated — resolveNav output, never NAV_CATALOG. */
  available: CatalogEntry[];
  /** Keys already on the shelf; these render as pinned and cannot be re-pinned. */
  pinned: string[];
  /**
   * False until the member's stored record has genuinely loaded. Every ⊕ is
   * withheld while false, because the write path refuses in that state — an
   * offered control that can only fail is the "tap does nothing" shape this
   * sheet exists to avoid.
   */
  canPin: boolean;
  /** Append this key to My Tools. Resolves false on failure. */
  onPin: (key: string) => Promise<boolean>;
}

const SECTION_ORDER = Object.keys(NAV_SECTION_LABELS) as NavSectionKey[];

// Home is always on the shelf and is never stored in My Tools (sanitizeTools
// strips it at write time). It stays in `available` — it must remain
// navigable and findable by search, ⌘K → "command" included — but it gets
// the non-pinnable "In your world" affordance rather than a ⊕ whose write
// would succeed and change nothing. Spec §5.4: "Home is always here."
const ALWAYS_PRESENT_KEY = 'home';

// `group` so the row's selected state can colour its CHILDREN explicitly.
// Setting text-accent-foreground on the row alone is not enough: the label
// and the pinned note render dark on a dark tenant accent because they do
// not inherit it (verified in-browser on a gold-accent tenant — the row
// computed white while its label computed black). Every child that carries
// text on a selected row therefore names its own selected colour, which
// also keeps the icons from staying muted-slate on a saturated accent.
const CARD_ITEM =
  'group relative flex items-center gap-3 min-h-11 px-3 bg-card text-card-foreground cursor-pointer ' +
  'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground';
// Applied to every child of a row that renders text or an icon.
const ON_SELECTED = 'group-data-[selected=true]:text-accent-foreground';
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
const ROW_LABEL = 'flex-1 text-[17px] truncate ' + ON_SELECTED;
const BADGE = 'w-6 h-6 rounded-full flex items-center justify-center shrink-0';
// Same 44px-hit-target-around-a-24px-badge trick as MyWorldEditor, so the
// tap target meets the 44pt minimum without inflating the visible badge.
const TAP_TARGET = 'shrink-0 p-2.5 -m-2.5 flex items-center justify-center disabled:opacity-40';

function PinControl({
  entry,
  isPinned,
  canPin,
  onPin,
}: {
  entry: CatalogEntry;
  isPinned: boolean;
  canPin: boolean;
  onPin: (key: string) => void;
}) {
  if (isPinned) {
    return (
      <span className={`flex items-center gap-1.5 text-[13px] text-muted-foreground shrink-0 ${ON_SELECTED}`}>
        <Check className="w-4 h-4" aria-hidden />
        In your world
      </span>
    );
  }
  // No stored record yet (still loading, or the load failed): the row stays
  // navigable, it just offers no pin. See `canPin` on AllToolsSheetProps.
  if (!canPin) return null;
  // Verified against cmdk 1.0's actual source (not assumed): the item's
  // select handler is wired to onClick only — onPointerMove just moves the
  // keyboard-highlight, it never selects. So stopping propagation on click
  // is what actually keeps a pin tap from also triggering the row's
  // onSelect (navigate + close) out from under it. The mousedown stop is
  // belt-and-braces for any pointer-based interaction Radix/cmdk add later,
  // not load-bearing today — the click stop is the one that matters.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <button
      type="button"
      onMouseDown={stop}
      onClick={(e) => {
        stop(e);
        onPin(entry.key);
      }}
      aria-label={`Pin ${entry.label} to your world`}
      className={TAP_TARGET}
    >
      <span
        className={`${BADGE} bg-primary/10 text-primary `
          + 'group-data-[selected=true]:bg-accent-foreground/20 '
          + 'group-data-[selected=true]:text-accent-foreground'}
      >
        <Plus className="w-4 h-4" aria-hidden />
      </span>
    </button>
  );
}

function ToolRow({
  entry,
  isPinned,
  canPin,
  onSelect,
  onPin,
}: {
  entry: CatalogEntry;
  isPinned: boolean;
  canPin: boolean;
  onSelect: (entry: CatalogEntry) => void;
  onPin: (key: string) => void;
}) {
  return (
    <CommandItem
      // The bare catalog key. No delimiter-splitting needed to recover the
      // entry from cmdk's filter callback below, and no key can ever
      // contain a space to begin with (NAV_CATALOG keys are single
      // hyphenated tokens) — but using the key alone rather than a
      // "key label section" compound string sidesteps that constraint
      // entirely instead of relying on it.
      value={entry.key}
      onSelect={() => onSelect(entry)}
      // Same data-tour NavShelf's own Row stamps on a shelf-rendered entry.
      // The product tour's ensureAllToolsOpen (productTourScript.ts)
      // targets `[data-tour="nav-X"]` regardless of whether the entry it's
      // after is currently on the member's shelf or only reachable through
      // this sheet — a tour step whose target isn't on the default shelf
      // (office-hours, analytics, settings) opens this sheet specifically
      // to find it here, and needs the identical selector to resolve.
      data-tour={entry.tourId}
      className={CARD_ITEM}
    >
      <entry.icon className={`w-5 h-5 shrink-0 text-muted-foreground ${ON_SELECTED}`} aria-hidden />
      <span className={ROW_LABEL}>{entry.label}</span>
      <PinControl entry={entry} isPinned={isPinned} canPin={canPin} onPin={onPin} />
    </CommandItem>
  );
}

export function AllToolsSheet({ open, onOpenChange, available, pinned, canPin, onPin }: AllToolsSheetProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const pinnedSet = new Set(pinned);
  // No "your world is full" state and no disabled ⊕: there is no tool cap
  // anymore. See MY_TOOLS_SANITY_MAX in myTools.ts — this sheet is half the
  // reason the cap could go, because everything in the catalog is reachable
  // from here regardless of shelf length. Do not reinstate one.

  // Radix unmounts DialogContent (and everything inside it, including
  // cmdk's own search state) on close, but this component itself doesn't
  // unmount — without this, reopening the sheet would show an empty input
  // (cmdk's fresh state) while `query` still held the last search, so the
  // grouped-vs-flat layout decision below would silently disagree with
  // what's on screen.
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const handleSelect = (entry: CatalogEntry) => {
    onOpenChange(false);
    navigate(entry.to);
  };

  const handlePin = (key: string) => {
    void (async () => {
      const ok = await onPin(key);
      if (!ok) {
        const entry = available.find((e) => e.key === key);
        toast({
          title: `Couldn't pin ${entry?.label ?? key}`,
          description: 'Check your connection and try again.',
          variant: 'destructive',
        });
      }
    })();
  };

  // --- Filtering: cmdk's `filter` prop is the ONLY thing that decides
  // show/hide for a search. It calls searchNav fresh, per item, using
  // cmdk's own live `search` argument — never this component's `query`
  // state, and never an independently recomputed score. Both alternatives
  // were tried and rejected (see AllToolsSheet.test.tsx for the tests that
  // catch each):
  //
  //   1. Reading `query`/a memoized `ranked` from React state inside this
  //      closure. cmdk recomputes its filtered set SYNCHRONOUSLY inside the
  //      same onChange handler that also calls `onValueChange` (setQuery),
  //      before this component re-renders with a fresh closure — so the
  //      filter cmdk actually calls on that keystroke is last render's,
  //      scoring the NEW search string against the OLD ranked set.
  //      `fireEvent.change` + `waitFor` would still go green once it
  //      settled, which is exactly the vacuous-test shape a prior review
  //      round flagged.
  //   2. Recomputing `scoreEntry` per item WITHOUT going through
  //      `searchNav` at all, while ALSO pre-filtering the JSX-rendered list
  //      via a separate `searchNav`-backed `ranked` array. Two independent
  //      filters mean either one alone determines what's hidden — so
  //      `searchNav` turning into an identity function, or `command.tsx`
  //      silently dropping the `filter` prop entirely, could each go
  //      undetected, because whichever layer still works papers over the
  //      other. This is what a prior review round's mutation testing
  //      caught: reverting either one independently left the suite green.
  //
  // Returning a binary 1/0 (not searchNav's rank position) is deliberate,
  // not a missed optimization: cmdk reorders matching DOM nodes using
  // whatever magnitude `filter` returns, via its own imperative
  // appendChild-based sort — and that sort does not survive this
  // component's browsing<->searching transition, where the CommandGroup
  // wrapping the results changes React key (many per-section groups vs.
  // one flat group) and remounts. A magnitude-based filter reorders the
  // OLD nodes correctly, then loses that order the instant the group
  // remounts with fresh ones in mount order — confirmed by mutation-testing
  // this exact scenario before landing on the binary design below, where
  // cmdk's reorder is a no-op (every visible match ties at 1) and ORDER
  // instead comes from `searchOrder` below, which needs no cooperation from
  // cmdk's internal DOM patching to survive a remount.
  // cmdk calls `filter` once per registered item, synchronously, all
  // within the same loop for a given `search` string (see cmdk's `X()`) —
  // so a same-search cache here turns what would otherwise be an O(n)
  // `searchNav` call PER ITEM (O(n²) per keystroke) into one `searchNav`
  // call per keystroke. Harmless either way at this catalog's size (tens
  // of entries), but free: the cache is a plain closure-scoped variable
  // recreated every render, doesn't need to persist beyond the render
  // that made it, and (unlike `searchOrder` below) still keys strictly off
  // the live `search` argument, not React state, so it doesn't reintroduce
  // the staleness trap `filter`'s own comment above warns about.
  let matchCacheSearch: string | null = null;
  let matchCacheKeys: Set<string> | null = null;
  const filter = (value: string, search: string) => {
    if (!search.trim()) return 1;
    if (search !== matchCacheSearch) {
      matchCacheSearch = search;
      matchCacheKeys = new Set(searchNav(available, search).map((e) => e.key));
    }
    return matchCacheKeys!.has(value) ? 1 : 0;
  };

  // --- Ordering: searchNav's matches, in its order, followed by everything
  // else in catalog order (never displayed — `filter` above hides the
  // tail; it's here purely so the DOM position of a shown item is fixed at
  // mount time, immune to whatever cmdk's own reorder pass does or doesn't
  // do). Driven by `query` React state rather than live search: unlike
  // `filter`, this only affects JSX children order, which React's own
  // reconciliation applies on every render regardless of cmdk's internal
  // timing — there is no "stale computation cmdk consumes before the next
  // render" pathway here the way there was for `filter` above, so the
  // ordinary one-render lag a state-derived value has is invisible by the
  // time anything is actually shown.
  const isBrowsing = !query.trim();
  const searchOrder = isBrowsing
    ? available
    : (() => {
        const matched = searchNav(available, query);
        const matchedKeys = new Set(matched.map((e) => e.key));
        return [...matched, ...available.filter((e) => !matchedKeys.has(e.key))];
      })();

  // Empty query: group by section, catalog order (browsing) — cmdk's own
  // filtering is inert here (an empty search always shows everything
  // regardless of `filter`'s return value), so grouping never fights it.
  // Non-empty query: one flat list — grouping a ranked list would scatter
  // the best matches back across sections, defeating the ranking, which is
  // why this mode renders ungrouped.
  const groups = isBrowsing
    ? (() => {
        const bySection = new Map<NavSectionKey, CatalogEntry[]>();
        for (const entry of available) {
          const list = bySection.get(entry.section) ?? [];
          list.push(entry);
          bySection.set(entry.section, list);
        }
        return SECTION_ORDER
          .map((section) => ({ section, label: NAV_SECTION_LABELS[section], entries: bySection.get(section) ?? [] }))
          .filter((g) => g.entries.length > 0);
      })()
    : [{ section: null, label: null, entries: searchOrder }];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} filter={filter}>
      <VisuallyHidden>
        <DialogTitle>All Tools</DialogTitle>
        <DialogDescription>Search the full tool catalog and pin the ones you want on your shelf.</DialogDescription>
      </VisuallyHidden>
      <CommandInput
        placeholder="Search all tools…"
        autoFocus
        onValueChange={setQuery}
      />
      {/* data-all-tools-sheet marks the sheet's own subtree for the product
          tour: productTourScript closes the sheet when a step ends and needs
          to tell a row it can see INSIDE this sheet (about to unmount) from
          one on the shelf. Nothing else keys off it. */}
      <CommandList data-all-tools-sheet="">
        <CommandEmpty>No tools match that.</CommandEmpty>
        {groups.map(({ section, label, entries }) => (
          <CommandGroup key={section ?? '__flat__'} heading={label ?? undefined} className={GROUP_CARD}>
            {entries.map((entry) => (
              <ToolRow
                key={entry.key}
                entry={entry}
                // Home is never stored, so it can never be in `pinnedSet` —
                // it is nonetheless always there, so it reads as pinned here
                // rather than offering a ⊕ that would write nothing.
                isPinned={pinnedSet.has(entry.key) || entry.key === ALWAYS_PRESENT_KEY}
                canPin={canPin}
                onSelect={handleSelect}
                onPin={handlePin}
              />
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
