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
// Google SERPs cannot be embedded (X-Frame-Options/CSP) and scraping them
// violates ToS — but the Custom Search JSON API is the sanctioned route, and
// the Concierge already ships an edge function for it. So the dropdown now
// ALSO shows real web results (Kevin, 2026-10-03: "let google search results
// appear in ui dropdown"): a debounced call to concierge-search {webOnly}
// fills a results lane between SoundCloud and the Search-Google row. The
// local lanes stay synchronous and render instantly; web results stream in
// beneath them when they arrive. Debounce + min-length matter here beyond
// politeness: CSE's free tier is 100 queries/day, so we only search once
// typing pauses. The "Search Google" tab-opening row remains both the
// fallback for when the API is down and the plain-Enter default.
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Globe, Music, Search, Sparkles } from 'lucide-react';
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
  | { kind: 'soundcloud' }
  | { kind: 'web'; result: WebResult }
  | { kind: 'google' };

/** Shape concierge-search returns per hit (Google CSE fields). */
interface WebResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

// Enough rows to be useful, few enough that the Google fallback row stays
// visible without scrolling on a phone.
const MAX_WEB_ROWS = 4;
const WEB_DEBOUNCE_MS = 450;
const WEB_MIN_CHARS = 3;

/** Event the SoundCloudPanel listens for — the smart bar's SoundCloud lane
 *  pipes the query into the panel's own track search rather than opening
 *  soundcloud.com, keeping "everything I need right there" literal. */
export const SC_SEARCH_EVENT = 'gw:sc-search';

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

  // ── Web results lane ─────────────────────────────────────────────────
  // seq guards against out-of-order responses: a slow answer for "spel"
  // must never overwrite the results for "spelman glee". Results are keyed
  // by the query they answered so the render can drop stale ones too.
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [webFor, setWebFor] = useState('');
  const [webLoading, setWebLoading] = useState(false);
  const webSeq = useRef(0);

  useEffect(() => {
    if (trimmed.length < WEB_MIN_CHARS) {
      setWebResults([]);
      setWebFor('');
      setWebLoading(false);
      return;
    }
    const seq = ++webSeq.current;
    setWebLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('concierge-search', {
          body: { query: trimmed, webOnly: true },
        });
        if (seq !== webSeq.current) return; // stale
        if (error || !data?.searchConfigured) {
          // API down or key misconfigured — the lane just doesn't appear,
          // and the Search-Google row still works. No error UI in a
          // suggestion dropdown.
          setWebResults([]);
          setWebFor('');
        } else {
          setWebResults(((data.results ?? []) as WebResult[]).slice(0, MAX_WEB_ROWS));
          setWebFor(trimmed);
        }
      } catch {
        if (seq === webSeq.current) { setWebResults([]); setWebFor(''); }
      } finally {
        if (seq === webSeq.current) setWebLoading(false);
      }
    }, WEB_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmed]);

  const rows = useMemo<Row[]>(() => {
    if (!trimmed) return [];
    const pool = entries ?? UNGATED_FALLBACK;
    // searchNav returns the WHOLE pool for an empty query (its documented
    // default-view behavior) — the trimmed guard above is what keeps us from
    // rendering the entire catalog as "matches".
    const apps = searchNav(pool, trimmed).slice(0, MAX_APP_ROWS);
    const out: Row[] = apps.map((entry) => ({ kind: 'app', entry }));
    if (assistant) out.push({ kind: 'assistant' });
    out.push({ kind: 'soundcloud' });
    // Only results that answer the CURRENT text — webFor goes stale the
    // moment the user keeps typing, and a dropdown showing answers to a
    // question the user is no longer asking reads as broken.
    if (webFor === trimmed) {
      for (const result of webResults) out.push({ kind: 'web', result });
    }
    out.push({ kind: 'google' });
    return out;
  }, [entries, trimmed, assistant, webResults, webFor]);

  const close = () => { setOpen(false); setHighlight(-1); };

  const runRow = (row: Row) => {
    if (row.kind === 'app') {
      navigate(row.entry.to);
    } else if (row.kind === 'assistant' && assistant) {
      // Fire-and-forget: send() resolves when the assistant replies, and the
      // sheet is where that reply renders — nothing here awaits it.
      void assistant.send(trimmed);
      assistant.setSheetOpen(true);
    } else if (row.kind === 'soundcloud') {
      window.dispatchEvent(new CustomEvent(SC_SEARCH_EVENT, { detail: { query: trimmed } }));
    } else if (row.kind === 'web') {
      window.open(row.result.link, '_blank', 'noopener');
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
            if (row.kind === 'soundcloud') {
              return (
                <button key="soundcloud" type="button" className={rowClass} {...common}>
                  <Music className="h-4 w-4 shrink-0 text-orange-500" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">
                    Search SoundCloud for <span className="font-medium">{trimmed}</span>
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
            if (row.kind === 'web') {
              return (
                <button key={`web-${row.result.link}`} type="button" className={rowClass} {...common}>
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{row.result.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {row.result.displayLink}
                    </span>
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
                {webLoading && (
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground animate-pulse">
                    loading…
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
