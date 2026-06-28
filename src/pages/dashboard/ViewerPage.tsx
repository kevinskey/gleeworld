// Viewer — forScore-style score reader, separate add-on from Music Library.
//
// Music Library = browse + manage (upload, edit, scope filter, setlists).
// Viewer = read + perform (alphabetical library, tap a row to open the
// full-bleed reader with tap-to-reveal chrome).
//
// Landing layout mirrors forScore's home:
//   • Top tabs: Library · Setlists · Bookmarks
//   • Search bar
//   • Flat list of scores sorted alphabetically, each row showing title,
//     composer, voicing + key / time-sig / tag badges. Big tap targets.
//   • Alphabetical section headers when sorting by Title or Composer.
//
// When :scoreId is in the URL we render the reader instead of the list.

import { lazy, Suspense, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search, BookOpen, ListMusic, Bookmark, ChevronRight, Loader2,
  ArrowUpDown, Calendar, MapPin, Music2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useViewerRecentOpens } from '@/hooks/useViewerRecentOpens';
import { useAllBookmarks } from '@/hooks/useAllBookmarks';
import { useViewerSetlists, useSetlistScores, type ViewerSetlist } from '@/hooks/useViewerSetlists';
import { CopyrightPolicyLink } from '@/components/policies/CopyrightPolicyLink';

const ViewerReader = lazy(() =>
  import('@/components/viewer/ViewerReader').then((m) => ({ default: m.ViewerReader })),
);

type Tab = 'library' | 'setlists' | 'bookmarks';
type SortKey = 'title' | 'composer' | 'recent';

interface ScoreRow {
  id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  key_signature: string | null;
  time_signature: string | null;
  tags: string[] | null;
  pdf_url: string | null;
  audio_url: string | null;
  created_at: string | null;
}

export default function ViewerPage() {
  const { scoreId } = useParams<{ scoreId?: string }>();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const setlistId = search.get('setlist') ?? undefined;

  // Render the reader chrome for BOTH the landing and a-score-is-open
  // states. When no scoreId is in the URL, the reader shows a black
  // empty surface (because the user hasn't picked a score yet) and
  // auto-opens the library popout so they can choose one. This keeps
  // the visual identity consistent — same pills, same drawer, no jarring
  // jump between a list-style landing and a full-bleed reader.
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <ViewerReader
        scoreId={scoreId}
        setlistId={setlistId}
        onBack={() => navigate('/dashboard')}
      />
    </Suspense>
  );
}

function FullScreenSpinner() {
  return (
    <div className="h-[80vh] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function ViewerLanding({
  onOpenScore,
}: {
  onOpenScore: (scoreId: string, setlistId?: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('library');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('title');

  const { data: rows = [], isLoading } = useQuery<ScoreRow[]>({
    queryKey: ['viewer-library'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, voicing, key_signature, time_signature, tags, pdf_url, audio_url, created_at')
        .eq('is_archived', false)
        .order('title')
        .limit(500);
      return (data ?? []) as ScoreRow[];
    },
  });

  const { data: recentMap = {} } = useViewerRecentOpens();

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let list = rows.filter((r) => !!r.pdf_url);
    if (s) {
      list = list.filter((r) =>
        r.title?.toLowerCase().includes(s) ||
        r.composer?.toLowerCase().includes(s) ||
        r.voicing?.toLowerCase().includes(s) ||
        (r.tags ?? []).some((t) => t.toLowerCase().includes(s)),
      );
    }
    const sorted = [...list].sort((a, b) => {
      if (sort === 'composer') {
        return (a.composer ?? 'zzz').localeCompare(b.composer ?? 'zzz');
      }
      if (sort === 'recent') {
        // Sort by user's actual last-open time; never-opened scores fall to
        // the bottom (sorted by created_at as tiebreaker).
        const ra = recentMap[a.id] ?? '';
        const rb = recentMap[b.id] ?? '';
        if (ra && rb) return rb.localeCompare(ra);
        if (ra && !rb) return -1;
        if (!ra && rb) return 1;
        return (b.created_at ?? '').localeCompare(a.created_at ?? '');
      }
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
    return sorted;
  }, [rows, search, sort, recentMap]);

  // Alphabet groupings — only shown for Title/Composer sorts.
  const grouped = useMemo(() => {
    if (sort !== 'title' && sort !== 'composer') return null;
    const groups: Record<string, ScoreRow[]> = {};
    for (const r of filtered) {
      const head = sort === 'composer'
        ? (r.composer?.trim()?.[0] ?? '?').toUpperCase()
        : (r.title?.trim()?.[0] ?? '?').toUpperCase();
      const key = /[A-Z]/.test(head) ? head : '#';
      (groups[key] ??= []).push(r);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, sort]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-6 space-y-4">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Viewer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Performance reader for your sheet music. Tap a score to open the full-screen view.
          </p>
        </div>
      </header>

      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'library',   label: 'Library',   Icon: BookOpen },
          { key: 'setlists',  label: 'Setlists',  Icon: ListMusic },
          { key: 'bookmarks', label: 'Bookmarks', Icon: Bookmark },
        ] as const).map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 text-sm transition-colors -mb-px',
                active
                  ? 'font-semibold border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <t.Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'library' && (
        <LibraryTab
          search={search} setSearch={setSearch}
          sort={sort} setSort={setSort}
          isLoading={isLoading}
          filtered={filtered}
          grouped={grouped}
          onOpenScore={onOpenScore}
        />
      )}
      {tab === 'setlists' && <SetlistsTab onOpenScore={onOpenScore} />}
      {tab === 'bookmarks' && <BookmarksTab onOpenScore={onOpenScore} />}

      <CopyrightPolicyLink />
    </div>
  );
}

function LibraryTab({
  search, setSearch, sort, setSort, isLoading, filtered, grouped, onOpenScore,
}: {
  search: string; setSearch: (s: string) => void;
  sort: SortKey; setSort: (k: SortKey) => void;
  isLoading: boolean;
  filtered: ScoreRow[];
  grouped: [string, ScoreRow[]][] | null;
  onOpenScore: (scoreId: string, setlistId?: string) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-md min-w-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, composer, voicing, tag…"
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-1 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
          {(['title', 'composer', 'recent'] as SortKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSort(k)}
              className={cn(
                'px-2 py-1 rounded transition-colors',
                sort === k ? 'bg-accent text-accent-foreground font-semibold' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {k === 'title' ? 'Title' : k === 'composer' ? 'Composer' : 'Recent'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading library…
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {search ? 'No scores match your search.' : 'No scores in your library yet.'}
        </div>
      ) : grouped ? (
        <div className="rounded-lg border bg-card divide-y">
          {grouped.map(([letter, items]) => (
            <section key={letter}>
              <div className="px-3 py-1.5 text-[11px] tracking-widest font-semibold text-muted-foreground bg-muted/50">
                {letter}
              </div>
              {items.map((r) => (
                <ScoreRowItem key={r.id} row={r} onOpen={() => onOpenScore(r.id)} />
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card divide-y">
          {filtered.map((r) => (
            <ScoreRowItem key={r.id} row={r} onOpen={() => onOpenScore(r.id)} />
          ))}
        </div>
      )}
    </>
  );
}

function SetlistsTab({
  onOpenScore,
}: {
  onOpenScore: (scoreId: string, setlistId?: string) => void;
}) {
  const { data: setlists = [], isLoading } = useViewerSetlists();
  const [expanded, setExpanded] = useState<string | null>(null);
  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading setlists…
      </div>
    );
  }
  if (setlists.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No setlists yet. Build one in Music Library → Setlists.
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-card divide-y">
      {setlists.map((s) => (
        <SetlistRow
          key={s.id}
          setlist={s}
          expanded={expanded === s.id}
          onToggleExpand={() => setExpanded((cur) => (cur === s.id ? null : s.id))}
          onOpenScore={(scoreId) => onOpenScore(scoreId, s.id)}
        />
      ))}
    </div>
  );
}

function SetlistRow({
  setlist, expanded, onToggleExpand, onOpenScore,
}: {
  setlist: ViewerSetlist;
  expanded: boolean;
  onToggleExpand: () => void;
  onOpenScore: (scoreId: string) => void;
}) {
  // Lazy-load the score list only when the user expands a setlist row.
  const { data: scores = [], isLoading } = useSetlistScores(expanded ? setlist.id : undefined);
  return (
    <div>
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-accent/40 transition-colors"
      >
        <div className="rounded-md bg-muted p-2">
          <ListMusic className="w-4 h-4 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{setlist.title}</div>
          <div className="text-xs text-muted-foreground truncate flex flex-wrap items-center gap-2">
            <span>{setlist.concert_name}</span>
            {setlist.event_date && (
              <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {setlist.event_date}</span>
            )}
            {setlist.venue && (
              <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {setlist.venue}</span>
            )}
            <span>· {setlist.item_count} score{setlist.item_count === 1 ? '' : 's'}</span>
          </div>
        </div>
        <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
      </button>
      {expanded && (
        <div className="pl-6 pr-3 pb-2 bg-muted/30 divide-y">
          {isLoading ? (
            <div className="py-4 text-xs text-muted-foreground text-center">
              <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading…
            </div>
          ) : scores.length === 0 ? (
            <div className="py-4 text-xs text-muted-foreground text-center italic">Empty setlist.</div>
          ) : (
            scores.map((sc) => (
              <button
                key={sc.id}
                type="button"
                disabled={!sc.pdf_url}
                onClick={() => sc.pdf_url && onOpenScore(sc.sheet_music_id)}
                className={cn(
                  // min-h-[44px] = Apple HIG min tap target. Old py-2
                  // only gave ~32px which fails on touch devices.
                  'w-full flex items-center gap-3 px-2 py-2 min-h-[44px] text-left transition-colors',
                  sc.pdf_url ? 'hover:bg-accent/40' : 'opacity-50 cursor-not-allowed',
                )}
              >
                <span className="text-xs tabular-nums text-muted-foreground w-6">{sc.order_index + 1}.</span>
                <span className="text-sm flex-1 truncate">{sc.title}</span>
                {sc.composer && (
                  <span className="text-xs text-muted-foreground truncate max-w-[40%]">{sc.composer}</span>
                )}
                {sc.pdf_url ? (
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <span className="text-[10px] uppercase text-muted-foreground">no pdf</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function BookmarksTab({
  onOpenScore,
}: {
  onOpenScore: (scoreId: string, setlistId?: string) => void;
}) {
  const { data: bookmarks = [], isLoading } = useAllBookmarks();
  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading bookmarks…
      </div>
    );
  }
  if (bookmarks.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No bookmarks yet. Open a score and tap the bookmark icon in the toolbar to save a spot.
      </div>
    );
  }
  // Group by score so users can scan by piece.
  const byScore: Record<string, { title: string; composer: string | null; items: typeof bookmarks }> = {};
  for (const b of bookmarks) {
    const k = b.sheet_music_id;
    if (!byScore[k]) byScore[k] = { title: b.score_title, composer: b.score_composer, items: [] };
    byScore[k].items.push(b);
  }
  return (
    <div className="rounded-lg border bg-card divide-y">
      {Object.entries(byScore).map(([scoreId, group]) => (
        <section key={scoreId} className="p-3 space-y-1">
          <button
            type="button"
            onClick={() => onOpenScore(scoreId)}
            className="text-left w-full"
          >
            <div className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
              {group.title}
            </div>
            {group.composer && (
              <div className="text-xs text-muted-foreground">{group.composer}</div>
            )}
          </button>
          <ul className="pl-3 mt-1 space-y-0.5">
            {group.items.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onOpenScore(scoreId)}
                  className="w-full text-left text-sm flex items-center gap-2 py-2 min-h-[44px] hover:text-primary transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs tabular-nums text-muted-foreground">p.{b.page_number}</span>
                  <span>{b.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ScoreRowItem({ row, onOpen }: { row: ScoreRow; onOpen: () => void }) {
  const badges: { label: string; tone?: 'key' | 'time' | 'tag' }[] = [];
  if (row.key_signature) badges.push({ label: row.key_signature, tone: 'key' });
  if (row.time_signature) badges.push({ label: row.time_signature, tone: 'time' });
  if (row.voicing) badges.push({ label: row.voicing });
  (row.tags ?? []).slice(0, 3).forEach((t) => badges.push({ label: t, tone: 'tag' }));
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/40 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{row.title}</div>
        <div className="text-xs text-muted-foreground truncate flex flex-wrap items-center gap-1.5 mt-0.5">
          {row.composer && <span>{row.composer}</span>}
          {badges.length > 0 && row.composer && <span>·</span>}
          {badges.map((b, i) => (
            <Badge
              key={`${b.label}-${i}`}
              variant="outline"
              className={cn(
                'h-5 px-1.5 text-[10px] font-normal',
                b.tone === 'key' && 'border-amber-400/40 text-amber-700',
                b.tone === 'time' && 'border-sky-400/40 text-sky-700',
                b.tone === 'tag' && 'border-muted-foreground/30',
              )}
            >
              {b.tone === 'key' && <Music2 className="w-2.5 h-2.5 mr-0.5" />}
              {b.label}
            </Badge>
          ))}
        </div>
      </div>
      {row.audio_url && (
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground border rounded px-1.5 py-0.5 shrink-0">
          audio
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
    </button>
  );
}
