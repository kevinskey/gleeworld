// Music Library (Command Center). Sheet music scores only — gw_sheet_music.
// Two tabs: Scores (browse + upload, scope filter, search) and Setlists
// (build/play performance orderings). Clicking a score opens
// PDFViewerWithAnnotations so the score can be marked up; annotations
// persist via gw_sheet_music_annotations and can be shared per existing
// flows. The legacy /music-library two-pane viewer remains for deep links.

import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Music, Search, Loader2, FileMusic, ListMusic,
  LayoutGrid, List as ListIcon, Store, CheckSquare, Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useScopeFilter } from '@/hooks/useScopeFilter';
import { ScopeFilterSelect } from '@/components/library/ScopeFilterSelect';
import { useUserRole } from '@/hooks/useUserRole';
import { CopyrightPolicyLink } from '@/components/policies/CopyrightPolicyLink';
import { PublicDomainSearch } from '@/components/music-library/PublicDomainSearch';
import { SOFT_CARD, SOFT_CARD_STYLE, type ScoreRow } from '@/components/music-library/scores/types';
import { ScoreCard } from '@/components/music-library/scores/ScoreCard';
import { ScoreListRow } from '@/components/music-library/scores/ScoreListRow';
import { AttachAudioDialog } from '@/components/music-library/scores/AttachAudioDialog';
import { EditScoreDialog } from '@/components/music-library/scores/EditScoreDialog';
import { ShareScoreDialog } from '@/components/music-library/scores/ShareScoreDialog';
import {
  ScoresFilterBar, ActiveFilterChips, applyScoresFilters,
  type ScoresFilters, type ScoresSort,
} from '@/components/music-library/scores/ScoresFilterBar';
import { AddToCollectionDialog } from '@/components/music-library/scores/AddToCollectionDialog';
import { ScoreViewerDialog } from '@/components/music-library/ScoreViewerDialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MyMusicTab } from '@/components/music-library/MyMusicTab';
import { getSignedUrl } from '@/utils/storage';
import { BookOpen as BookOpenIcon } from 'lucide-react';
import { PartTracksDialog } from '@/features/part-tracks/PartTracksDialog';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { MUSIC_LIBRARY_TABS, type MusicLibraryTabKey } from './musicLibraryTabs';

const SetlistBuilder = lazy(() =>
  import('@/components/music-library/SetlistBuilder').then((m) => ({ default: m.SetlistBuilder })),
);
const GwStoreTab = lazy(() =>
  import('@/components/store/GwStoreTab').then((m) => ({ default: m.GwStoreTab })),
);

type TopTab = MusicLibraryTabKey;

const TAB_ICONS: Record<MusicLibraryTabKey, React.ComponentType<{ className?: string }>> = {
  'scores': Music, 'my-music': FileMusic, 'setlists': ListMusic, 'store': Store, 'public-domain': BookOpenIcon,
};

export default function MusicLibraryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { active: scope, setActive: setScope, options, courses, applyFilter } = useScopeFilter();
  const { canEditMusicLibrary } = useUserRole();
  const canEdit = canEditMusicLibrary();

  const [topTab, setTopTab] = useState<TopTab>('scores');

  // URL search params carry the deep-link (?view=) plus the Scores tab's
  // search/filter/sort state, so a filtered view is shareable and survives
  // reload. All writes use the functional form with replace:true to avoid
  // clobbering concurrent params or spamming history.
  const [searchParams, setSearchParams] = useSearchParams();
  const updateParams = (mutate: (p: URLSearchParams) => void) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      mutate(next);
      return next;
    }, { replace: true });
  };

  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const changeSearch = (v: string) => {
    setSearch(v);
    updateParams((p) => { if (v.trim()) p.set('q', v); else p.delete('q'); });
  };

  const filters = useMemo<ScoresFilters>(() => ({
    voicings: (searchParams.get('voicing') ?? '').split(',').filter(Boolean),
    difficulties: (searchParams.get('diff') ?? '').split(',').filter(Boolean),
    tags: (searchParams.get('tag') ?? '').split(',').filter(Boolean),
    rights: (searchParams.get('rights') ?? '').split(',').filter(Boolean),
    composer: searchParams.get('composer'),
  }), [searchParams]);
  const sort: ScoresSort = (searchParams.get('sort') as ScoresSort) || 'title';
  const setFilters = (f: ScoresFilters) => updateParams((p) => {
    const setOrDel = (k: string, v: string) => { if (v) p.set(k, v); else p.delete(k); };
    setOrDel('voicing', f.voicings.join(','));
    setOrDel('diff', f.difficulties.join(','));
    setOrDel('tag', f.tags.join(','));
    setOrDel('rights', f.rights.join(','));
    setOrDel('composer', f.composer ?? '');
  });
  const setSort = (s: ScoresSort) => updateParams((p) => {
    if (s === 'title') p.delete('sort'); else p.set('sort', s);
  });

  // Collections (gw_music_collections — existing schema, newly consumed by
  // this tab). Picking one narrows the grid to its members.
  const collectionId = searchParams.get('collection');
  const setCollectionId = (id: string | null) => updateParams((p) => {
    if (id) p.set('collection', id); else p.delete('collection');
  });
  const { data: collections = [] } = useQuery<Array<{ id: string; title: string }>>({
    queryKey: ['music-collections'],
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_music_collections')
        .select('id, title')
        .order('is_system', { ascending: false })
        .order('title');
      return (data ?? []) as Array<{ id: string; title: string }>;
    },
  });
  const { data: collectionItemIds } = useQuery<string[]>({
    queryKey: ['collection-items', collectionId],
    enabled: !!collectionId,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_music_collection_items')
        .select('sheet_music_id')
        .eq('collection_id', collectionId!);
      return (data ?? []).map((r: { sheet_music_id: string }) => r.sheet_music_id);
    },
  });

  // Add-to-collection dialog target (More menu, canEdit only).
  const [collectingFor, setCollectingFor] = useState<ScoreRow | null>(null);
  // Scores layout: card grid (default) or compact list. Persisted so the
  // librarian's preference survives reloads.
  const [scoresView, setScoresView] = useState<'cards' | 'list'>(() =>
    typeof window !== 'undefined' && localStorage.getItem('gw-music-library-view') === 'list'
      ? 'list'
      : 'cards',
  );
  const changeScoresView = (v: 'cards' | 'list') => {
    setScoresView(v);
    try { localStorage.setItem('gw-music-library-view', v); } catch { /* private mode */ }
  };
  // Annotation viewer state — when set, opens a full-screen dialog with the
  // annotated PDF viewer so the user can mark up the score. All open paths
  // route through PDFViewerWithAnnotations, which contain-fits the page
  // (whole page visible, no scrolling — PR #321); don't reroute opens to a
  // different viewer. `id` is undefined only when a setlist item somehow
  // lacks a sheet-music id — annotation/audio lookups then short-circuit
  // instead of querying with an empty string.
  const [viewing, setViewing] = useState<{ id?: string; title: string; pdfUrl: string } | null>(null);

  // Share dialog state — the row(s) currently being reviewed for sharing.
  // One row = the card's Share button (replace-on-save); several rows =
  // the bulk-select bar (additive save). Empty array closes the dialog.
  const [sharing, setSharing] = useState<ScoreRow[]>([]);

  // Bulk-select mode (canEdit only): clicking cards toggles selection and
  // a sticky bar offers Share for the whole selection.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelectMode = () => {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  };
  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // A score is served either from a public pdf_url (legacy/tenant uploads) or
  // from a PRIVATE storage object (personal scores published to this tenant —
  // see 20260718140000_publish_private_scores.sql). Private rows must be signed
  // per view; the signed link is short-lived by design.
  const openScoreRow = async (r: { id: string; title: string; pdf_url: string | null; storage_path: string | null; storage_bucket: string | null }) => {
    if (r.storage_path && r.storage_bucket) {
      const url = await getSignedUrl(r.storage_bucket, r.storage_path, 3600, false);
      if (!url) { toast.error(`Could not open "${r.title}". The file may be missing.`); return; }
      setViewing({ id: r.id, title: r.title, pdfUrl: url });
      return;
    }
    if (r.pdf_url) setViewing({ id: r.id, title: r.title, pdfUrl: r.pdf_url });
  };

  // Deep link: /dashboard/music-library?view=<scoreId> opens the score viewer
  // (the Glee Assistant's open-score action navigates here). Fetch by id
  // rather than searching `rows` — the list is scope-filtered and capped.
  const viewParam = searchParams.get('view');
  useEffect(() => {
    if (!viewParam) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('gw_sheet_music')
        .select('id, title, pdf_url, storage_path, storage_bucket')
        .eq('id', viewParam)
        .maybeSingle();
      if (cancelled) return;
      if (data?.pdf_url || data?.storage_path) {
        // Same resolver as the grid — private rows get signed, public ones don't.
        await openScoreRow(data as Parameters<typeof openScoreRow>[0]);
      } else {
        toast.error('Could not open that score — it may have been removed.');
      }
      // Consume the param so closing the viewer doesn't reopen it.
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete('view');
        return next;
      }, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [viewParam, setSearchParams]);
  // Audio attach dialog state — opens the per-score "Attach audio" picker.
  const [attachingAudio, setAttachingAudio] = useState<ScoreRow | null>(null);
  // Edit dialog state — librarian edit (title, composer, voicing, copies, location).
  const [editing, setEditing] = useState<ScoreRow | null>(null);
  const [partTracksFor, setPartTracksFor] = useState<ScoreRow | null>(null);

  const { data: rows = [], isLoading } = useQuery<ScoreRow[]>({
    queryKey: ['music-library-scores', scope, canEdit],
    queryFn: async () => {
      // Server-enforced browse visibility: gw_sheet_music_browse embeds the
      // sharing rules (everyone / shared-with-me / my course / my upload;
      // librarians see all) — see 20260803140000_sheet_music_browse_view.sql.
      // Listing is enforced by the view; open-by-id on the base table stays
      // open on purpose so ?view= deep links and setlists keep working.
      let q = (supabase as any)
        .from('gw_sheet_music_browse')
        .select('id, title, composer, voicing, difficulty_level, pdf_url, storage_path, storage_bucket, audio_url, audio_title, physical_copies_count, physical_location, course_id, created_at, arranger, language, tags, rights_status, license_seat_count, license_expires_at, copyright_holder, shared_with_members, shared_with_users, shared_with_courses, shared_with_voice_parts')
        .order('title')
        .limit(200);
      q = applyFilter(q as any);
      const { data } = await q;
      return (data ?? []) as ScoreRow[];
    },
  });

  const courseCodeById = useMemo(() => {
    const m: Record<string, string> = {};
    courses.forEach((c) => { m[c.id] = c.course_code; });
    return m;
  }, [courses]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let out = rows;
    if (s) {
      out = out.filter((r) =>
        r.title?.toLowerCase().includes(s) ||
        r.composer?.toLowerCase().includes(s) ||
        r.arranger?.toLowerCase().includes(s) ||
        r.voicing?.toLowerCase().includes(s) ||
        (r.tags ?? []).some((t) => t.toLowerCase().includes(s)),
      );
    }
    out = applyScoresFilters(out, filters);
    if (collectionId && collectionItemIds) {
      const inCollection = new Set(collectionItemIds);
      out = out.filter((r) => inCollection.has(r.id));
    }
    if (sort === 'composer') {
      const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
      out = [...out].sort((a, b) => collator.compare(a.composer ?? '', b.composer ?? ''));
    } else if (sort === 'recent') {
      out = [...out].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    }
    // 'title' keeps the server's .order('title').
    return out;
  }, [rows, search, filters, sort, collectionId, collectionItemIds]);

  // Row's Share button — opens the granular share dialog rather than
  // toggling in place. The dialog handles the actual write; passing the
  // row through state gives it access to the current sharing state
  // (shared_with_members/users/courses/voice_parts) as initial values.
  const handleOpenShare = (row: ScoreRow) => setSharing([row]);

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <DashboardPageShell
      title="Music Library"
      subtitle="Sheet music scores across your ensembles. Other media types live in the Media Library."
    >
      {/* Score upload + URL import live in the Librarian add-on. The
          Music Library is read-only for browsing/playback. */}

      {/* Top-level tabs: Scores | My Music | Setlists | GW Sheet Music Store | Public Domain (CPDL search). */}
      {/* Five tabs exceed a 390px viewport, so the row scrolls rather than
          clipping the last one. The negative margin lets the scroll area reach
          the screen edges inside the shell's padding; body is overflow-x:clip,
          so a wider-than-parent container would be cut off, not scrollable.
          touch-pan-x locks a swipe that starts on the strip to the horizontal
          axis (no diagonal wobble dragging the page along), and
          overscroll-x-contain stops the strip's edge-bounce from chaining
          into the page scroll. */}
      <div className="flex gap-2 border-b border-border overflow-x-auto touch-pan-x overscroll-x-contain -mx-3 px-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {MUSIC_LIBRARY_TABS.map((t) => {
          const isActive = t.key === topTab;
          const Icon = TAB_ICONS[t.key];
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTopTab(t.key)}
              className={
                isActive
                  ? 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                  : 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm text-muted-foreground hover:text-foreground transition-colors'
              }
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {topTab === 'scores' && (
        <>
          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            {/* One row instead of three. The scope chips were a per-class list
                that wrapped to 3-4 lines once a director was in more than a
                couple of classes, and the "SCOPE" caps label cost another row
                to say what the control already says. Desktop reads
                scope | search | layout; phone stacks search underneath. */}
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <ScopeFilterSelect
                  active={scope}
                  options={options}
                  onChange={setScope}
                  className="flex-1 min-w-0 sm:flex-none sm:w-52"
                />
                <div className="relative w-full order-last sm:order-none sm:flex-1 sm:min-w-0">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => changeSearch(e.target.value)}
                    placeholder="Search by title, composer, arranger, tag…"
                    className="pl-9"
                  />
                </div>
                {collections.length > 0 && (
                  <Select
                    value={collectionId ?? 'all'}
                    onValueChange={(v) => setCollectionId(v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="h-9 w-auto sm:w-48 shrink-0" aria-label="Collection">
                      <SelectValue placeholder="All collections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All collections</SelectItem>
                      {collections.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <ScoresFilterBar
                  rows={rows}
                  filters={filters}
                  onFiltersChange={setFilters}
                  sort={sort}
                  onSortChange={setSort}
                />
                <div className="shrink-0 flex items-center gap-0.5 rounded-lg border border-border p-0.5" role="group" aria-label="Layout">
                  <Button
                    variant={scoresView === 'cards' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={() => changeScoresView('cards')}
                    aria-label="Card view"
                    aria-pressed={scoresView === 'cards'}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={scoresView === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={() => changeScoresView('list')}
                    aria-label="List view"
                    aria-pressed={scoresView === 'list'}
                  >
                    <ListIcon className="w-4 h-4" />
                  </Button>
                </div>
                {canEdit && (
                  <Button
                    variant={selectMode ? 'secondary' : 'outline'}
                    size="sm"
                    className="shrink-0 h-9"
                    onClick={toggleSelectMode}
                    aria-pressed={selectMode}
                    title="Select several scores to share at once"
                  >
                    <CheckSquare className="w-4 h-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">{selectMode ? 'Done' : 'Select'}</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <ActiveFilterChips filters={filters} onFiltersChange={setFilters} />

          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-6 h-6 animate-spin inline text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
              <CardContent className="p-12 text-center">
                <FileMusic className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-base font-semibold">No scores match the current filters.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {rows.length === 0
                    ? 'Add your first score to build the library.'
                    : 'Try a different scope or search term.'}
                </p>
              </CardContent>
            </Card>
          ) : scoresView === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map((r) => (
                <ScoreCard
                  key={r.id}
                  row={r}
                  courseCode={r.course_id ? courseCodeById[r.course_id] ?? null : null}
                  canEdit={canEdit}
                  onAnnotate={() => { void openScoreRow(r); }}
                  onAttachAudio={() => setAttachingAudio(r)}
                  onEdit={() => setEditing(r)}
                  onToggleShare={() => handleOpenShare(r)}
                  onPartTracks={() => setPartTracksFor(r)}
                  onAddToCollection={canEdit ? () => setCollectingFor(r) : undefined}
                  selectable={selectMode}
                  selected={selectedIds.has(r.id)}
                  onToggleSelect={() => toggleSelected(r.id)}
                />
              ))}
            </div>
          ) : (
            <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
              <div className="divide-y divide-border">
                {filtered.map((r) => (
                  <ScoreListRow
                    key={r.id}
                    row={r}
                    courseCode={r.course_id ? courseCodeById[r.course_id] ?? null : null}
                    canEdit={canEdit}
                    onAnnotate={() => { void openScoreRow(r); }}
                    onAttachAudio={() => setAttachingAudio(r)}
                    onEdit={() => setEditing(r)}
                    onToggleShare={() => handleOpenShare(r)}
                    onPartTracks={() => setPartTracksFor(r)}
                    onAddToCollection={canEdit ? () => setCollectingFor(r) : undefined}
                    selectable={selectMode}
                    selected={selectedIds.has(r.id)}
                    onToggleSelect={() => toggleSelected(r.id)}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Sticky bulk-share bar — appears once something is selected.
              Sticky (not fixed) so it stays inside the shell's content
              column and above the docked mobile footer. */}
          {selectMode && selectedIds.size > 0 && (
            <div className="sticky bottom-[calc(56px+env(safe-area-inset-bottom,0px)+0.5rem)] md:bottom-4 z-20">
              <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">
                    {selectedIds.size} selected
                  </span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSharing(rows.filter((r) => selectedIds.has(r.id)))}
                    >
                      <Share2 className="w-4 h-4 mr-1.5" />
                      Share…
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {topTab === 'my-music' && <MyMusicTab />}

      {topTab === 'setlists' && (
        // Setlists tab — wraps the existing SetlistBuilder inside the same
        // card surface. SetlistBuilder owns create / reorder / share /
        // delete; we pass onPdfSelect so picking a song from inside a
        // setlist still opens the annotated viewer.
        <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
          <CardContent className="p-5">
            <Suspense
              fallback={
                <div className="py-10 text-center">
                  <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" />
                </div>
              }
            >
              <SetlistBuilder
                // SetlistBuilder passes the real sheet_music.id — keep it so
                // annotations + audio tracks load for setlist opens too. An
                // undefined id (never '') cleanly disables those lookups.
                onPdfSelect={(url, title, id) =>
                  url && setViewing({ id, title, pdfUrl: url })
                }
                onOpenPlayer={() => { /* handled inside SetlistBuilder */ }}
              />
            </Suspense>
          </CardContent>
        </Card>
      )}

      {topTab === 'store' && (
        <Suspense fallback={<div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" /></div>}>
          <GwStoreTab />
        </Suspense>
      )}

      {topTab === 'public-domain' && <PublicDomainSearch />}

<AttachAudioDialog
        score={attachingAudio}
        userId={user?.id ?? null}
        onOpenChange={(open) => !open && setAttachingAudio(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['music-library-scores'] });
          setAttachingAudio(null);
        }}
      />

      <EditScoreDialog
        score={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['music-library-scores'] });
          setEditing(null);
        }}
      />

      <ShareScoreDialog
        scores={sharing}
        onOpenChange={(open) => !open && setSharing([])}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['music-library-scores'] });
          setSharing([]);
          // After a bulk share, drop the selection but stay in select mode
          // so the librarian can keep working through the library.
          setSelectedIds(new Set());
        }}
      />

      <AddToCollectionDialog
        score={collectingFor}
        onOpenChange={(open) => !open && setCollectingFor(null)}
      />

      {partTracksFor && (
        <PartTracksDialog
          sheetMusicId={partTracksFor.id}
          sheetMusicTitle={partTracksFor.title || 'Untitled'}
          open
          onOpenChange={(open) => !open && setPartTracksFor(null)}
          pdfSource={{
            url: partTracksFor.pdf_url ?? null,
            bucket: partTracksFor.storage_bucket ?? null,
            path: partTracksFor.storage_path ?? null,
          }}
        />
      )}

      {/* Annotation viewer — near-fullscreen dialog wrapping the shared
          contain-fit PDFViewerWithAnnotations (whole page visible, no
          scrolling — PR #321). Annotations save into
          gw_sheet_music_annotations and persist across sessions. */}
      <ScoreViewerDialog
        viewing={viewing}
        onClose={() => setViewing(null)}
        liveTitle={viewing ? rows.find((r) => r.id === viewing.id)?.title ?? null : null}
        onEditScore={
          canEdit
            ? () => {
                if (!viewing) return;
                const row = rows.find((r) => r.id === viewing.id);
                if (row) setEditing(row);
              }
            : undefined
        }
      />

      <CopyrightPolicyLink />
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
}

