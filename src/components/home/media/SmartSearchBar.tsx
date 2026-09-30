// SmartSearchBar — the Command Center's single "just type" field. Doc asked
// for "a google search field in a functionally smart way", so this is NOT a
// dumb box that only opens Google: as you type it triages intent into three
// lanes, in a fixed order the user can learn:
//
//   1. App destinations (up to 3) — matched by navSearch against the same
//      gated catalog the sidebar uses, so typing "cal" surfaces Calendar
//      before any web search does.
//   2. "Ask the assistant" — hands the raw query to the GleeWorld assistant
//      and opens its sheet. Hidden entirely when no AssistantProvider is
//      mounted (public pages), via useAssistantOptional.
//   3. "Search Google" — always last, and ALSO what a plain Enter does when
//      nothing is highlighted, because Google is this field's namesake and
//      muscle memory from every browser omnibox expects it.
//
// Google results cannot be embedded: Google sends X-Frame-Options/CSP
// headers that block iframing, and scraping SERPs violates their ToS. So
// opening a real tab via window.open IS the correct integration here, not a
// shortcut — there is deliberately no in-panel "results" view and no network
// call of any kind in this component. Everything is synchronous local
// matching, which is what makes the dropdown feel instant.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchNav } from '@/lib/navigation/navSearch';
import { resolveNav, type CatalogEntry } from '@/lib/navigation/navCatalog';
import { useAssistantOptional } from '@/lib/assistant/AssistantProvider';

interface SmartSearchBarProps {
  /**
   * Already-gated catalog entries — resolveNav output, never NAV_CATALOG
   * raw (navSearch's contract; it does no gating itself). The shell that
   * mounts this bar should pass its resolvedEntries so app matches respect
   * module gates and hidden routes.
   *
   * Optional on purpose: when omitted we fall back to resolveNav with an
   * all-false context, which (per resolveNav's "total" guarantee) can only
   * UNDER-show — ungated destinations still match, gated ones never leak.
   * That keeps the bar usable in isolation without duplicating the shell's
   * moduleAccess plumbing here.
   */
  entries?: CatalogEntry[];
  className?: string;
}

// The safe default described above. Built once at module load — the catalog
// is static, and an all-false context has no per-render inputs.
const UNGATED_FALLBACK: CatalogEntry[] = resolveNav({
  hasModule: () => false,
  isTenantAdmin: false,
  isPlatformAdmin: false,
  canLibrarian: false,
  isPartner: false,
  hiddenRoutes: new Set<string>(),
});

// How many app rows the dropdown shows. Three keeps the dropdown scannable
// at a glance and leaves the assistant + Google rows above the fold even on
// short phone viewports.
const MAX_APP_ROWS = 3;

// Flattened row model so arrow keys walk ONE list regardless of which lanes
// are present (assistant row disappears without a provider; app rows vary
// with the query). A discriminated union rather than three parallel arrays
// so the Enter handler is a single switch with no index arithmetic.
type Row =
  | { kind: 'app'; entry: CatalogEntry }
  | { kind: 'assistant' }
  | { kind: 'google' };

export function SmartSearchBar({ entries, className }: SmartSearchBarProps) {
  const navigate = useNavigate();
  const assistant = useAssistantOptional();

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  // -1 = nothing highlighted, which is a REAL state, not an accident: plain
  // Enter from -1 goes to Google (see header). Arrow keys move into the
  // list from there.
  const [highlight, setHighlight] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  // Blur closes the dropdown, but a mousedown on a row blurs the input
  // BEFORE the row's click fires — closing instantly would eat the click.
  // A 150ms grace window lets the click land; refocusing cancels it.
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);

  const trimmed = query.trim();

  const rows = useMemo<Row[]>(() => {
    if (!trimmed) return [];
    const pool = entries ?? UNGATED_FALLBACK;
    // searchNav returns the WHOLE pool for an empty query (its documented
    // default-view behavior) — the trimmed guard above is what keeps us from
    // rendering the entire catalog as "matches".
    const apps = searchNav(pool, trimmed).slice(0, MAX_APP_ROWS);
    const out: Row[] = apps.map((entry) => ({ kind: 'app', entry }));
    if (assistant) out.push({ kind: 'assistant' });
    out.push({ kind: 'google' });
    return out;
  }, [entries, trimmed, assistant]);

  const close = () => { setOpen(false); setHighlight(-1); };

  const runRow = (row: Row) => {
    if (row.kind === 'app') {
      navigate(row.entry.to);
    } else if (row.kind === 'assistant' && assistant) {
      // Fire-and-forget: send() resolves when the assistant replies, and the
      // sheet is where that reply renders — nothing here awaits it.
      void assistant.send(trimmed);
      assistant.setSheetOpen(true);
    } else {
      // 'noopener' severs window.opener so the Google tab can't script this
      // one back (reverse-tabnabbing).
      window.open(
        'https://www.google.com/search?q=' + encodeURIComponent(trimmed),
        '_blank',
        'noopener',
      );
    }
    setQuery('');
    close();
    // Keep focus so a follow-up search is one keystroke away — except for
    // app navigation, where the destination page owns focus next.
    if (row.kind !== 'app') inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!trimmed || rows.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (h + 1) % rows.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      // From -1, ArrowUp wraps to the LAST row (Google), mirroring omnibox
      // behavior where up from the field lands on the bottom suggestion.
      setHighlight((h) => (h <= 0 ? rows.length - 1 : h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Nothing highlighted → the Google row, the field's namesake action.
      const row = highlight >= 0 && highlight < rows.length
        ? rows[highlight]
        : rows[rows.length - 1];
      if (row) runRow(row);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  return (
    // relative so the dropdown anchors to the field, not the page. The bar
    // itself is width-only — it lives inside whatever card/row the parent
    // gives it and must not fight the panel sizing contract.
    <div className={cn('relative w-full', className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          role="combobox"
          aria-expanded={open && rows.length > 0}
          aria-autocomplete="list"
          aria-label="Search Google, your apps, or ask the assistant"
          placeholder="Search Google, your apps, or ask…"
          className={cn(
            // Big and friendly on purpose — this is the zone's marquee
            // control, not a filter box tucked in a corner.
            'h-12 w-full rounded-xl border border-border bg-card pl-12 pr-4 text-base',
            'text-foreground placeholder:text-muted-foreground',
            'outline-none transition-shadow focus:ring-2 focus:ring-ring',
          )}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(e.target.value.trim().length > 0);
            // New text = new intent; a stale highlight from the previous
            // query would make Enter do something the user can't predict.
            setHighlight(-1);
          }}
          onFocus={() => {
            if (blurTimer.current) { clearTimeout(blurTimer.current); blurTimer.current = null; }
            if (trimmed) setOpen(true);
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(close, 150);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && rows.length > 0 && (
        <div
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
        >
          {rows.map((row, i) => {
            const active = i === highlight;
            const rowClass = cn(
              'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm',
              active ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50',
            );
            // Shared handlers: mousedown-preventDefault keeps the input
            // focused (so the blur grace timer isn't even needed for a fast
            // click), and hover moves the highlight so keyboard + mouse
            // never show two different "active" rows.
            const common = {
              role: 'option' as const,
              'aria-selected': active,
              onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
              onMouseEnter: () => setHighlight(i),
              onClick: () => runRow(row),
            };
            if (row.kind === 'app') {
              const Icon = row.entry.icon;
              return (
                <button key={`app-${row.entry.key}`} type="button" className={rowClass} {...common}>
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{row.entry.label}</span>
                  <span className="shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    App
                  </span>
                </button>
              );
            }
            if (row.kind === 'assistant') {
              return (
                <button key="assistant" type="button" className={rowClass} {...common}>
                  <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">
                    Ask the assistant: <span className="font-medium">{trimmed}</span>
                  </span>
                </button>
              );
            }
            return (
              <button key="google" type="button" className={rowClass} {...common}>
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">
                  Search Google for <span className="font-medium">{trimmed}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
