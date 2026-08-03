// Music Library (Command Center). Sheet music scores only — gw_sheet_music.
// Two tabs: Scores (browse + upload, scope filter, search) and Setlists
// (build/play performance orderings). Clicking a score opens
// PDFViewerWithAnnotations so the score can be marked up; annotations
// persist via gw_sheet_music_annotations and can be shared per existing
// flows. The legacy /music-library two-pane viewer remains for deep links.

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Music, Search, Loader2, FileMusic, ListMusic,
  PencilLine, X, Maximize2, Minimize2, LayoutGrid, List as ListIcon, Store,
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
const PDFViewerWithAnnotations = lazy(() =>
  import('@/components/PDFViewerWithAnnotations').then((m) => ({ default: m.PDFViewerWithAnnotations })),
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
  const [search, setSearch] = useState('');
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
  // annotated PDF viewer so the user can mark up the score.
  const [viewing, setViewing] = useState<{ id: string; title: string; pdfUrl: string } | null>(null);

  // Share dialog state — the row currently being reviewed for sharing.
  // Opened via the row's Share button (canEdit only). Setting to null
  // closes the dialog without saving.
  const [sharing, setSharing] = useState<ScoreRow | null>(null);

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
  const [searchParams, setSearchParams] = useSearchParams();
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
  // Fullscreen toggle for the viewer dialog (max viewing area for annotation).
  // Guarded for environments without the Fullscreen API (notably iOS
  // WKWebView under Capacitor) — accessing `document.fullscreenElement` is
  // fine but the request/exit methods don't exist there, so we feature-detect
  // "Fullscreen" here means fill the browser window, not the whole monitor —
  // toggling a CSS state instead of calling the Fullscreen API keeps the
  // tab chrome visible and works identically on every device, including iOS
  // Safari where requestFullscreen() isn't available anyway.
  const viewerDialogRef = useRef<HTMLDivElement>(null);
  const [isViewerFullscreen, setIsViewerFullscreen] = useState(false);
  const toggleViewerFullscreen = () => setIsViewerFullscreen((v) => !v);

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
        .select('id, title, composer, voicing, difficulty_level, pdf_url, storage_path, storage_bucket, audio_url, audio_title, physical_copies_count, physical_location, course_id, created_at, rights_status, license_seat_count, license_expires_at, copyright_holder, shared_with_members, shared_with_users, shared_with_courses')
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
    if (!search.trim()) return rows;
    const s = search.trim().toLowerCase();
    return rows.filter((r) =>
      r.title?.toLowerCase().includes(s) ||
      r.composer?.toLowerCase().includes(s) ||
      r.voicing?.toLowerCase().includes(s),
    );
  }, [rows, search]);

  // Row's Share button — opens the granular share dialog rather than
  // toggling in place. The dialog handles the actual write; passing the
  // row through state gives it access to the current sharing state
  // (shared_with_members/users/courses) as initial values.
  const handleOpenShare = (row: ScoreRow) => setSharing(row);

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
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title, composer, voicing…"
                    className="pl-9"
                  />
                </div>
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
              </div>
            </CardContent>
          </Card>

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
                  />
                ))}
              </div>
            </Card>
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
                onPdfSelect={(url, title, id) =>
                  url && setViewing({ id: id ?? '', title, pdfUrl: url })
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
        score={sharing}
        onOpenChange={(open) => !open && setSharing(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['music-library-scores'] });
          setSharing(null);
        }}
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

      {/* Annotation viewer — opens a near-fullscreen dialog wrapping the
          shared PDFViewerWithAnnotations. Annotations save into
          gw_sheet_music_annotations and persist across sessions. */}
      <Dialog
        open={!!viewing}
        onOpenChange={(v) => {
          if (!v) {
            setViewing(null);
            setIsViewerFullscreen(false);
          }
        }}
      >
        <DialogContent
          ref={viewerDialogRef}
          // Hide default Radix X close — we render a properly-sized close
          // button next to fullscreen below. The defaults were 32px and
          // overlapping on iPhone.
          // The default Radix close is the only direct button child of
          // DialogContent — our own X+Maximize live inside DialogHeader — so
          // [&>button]:hidden hides exactly the duplicate. When the user
          // hits the Maximize button the dialog grows to fill the browser
          // window (not the whole monitor — that was confusing).
          // Safe-area: the app is edge-to-edge (status bar overlays the
          // webview), so a full-height dialog starts at y=0 UNDER the iPhone
          // clock. Fullscreen pads the header past the inset; the centered
          // variant caps its height so the translate-centered top edge can
          // never rise into the inset (2× top inset keeps the split-margin
          // math above the bar on notched phones).
          className={`p-0 flex flex-col overflow-hidden bg-background [&>button]:hidden ${
            isViewerFullscreen
              ? 'w-screen h-[100dvh] max-w-none rounded-none pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]'
              : 'max-w-6xl h-[90dvh] max-h-[calc(100dvh-env(safe-area-inset-top,0px)*2-1rem)]'
          }`}
        >
          <DialogHeader className="p-4 border-b border-border shrink-0 flex-row items-center justify-between space-y-0 gap-3">
            <DialogTitle className="flex items-center gap-3 text-xl sm:text-2xl md:text-3xl font-bold tracking-tight min-w-0 flex-1">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    if (!viewing) return;
                    const row = rows.find((r) => r.id === viewing.id);
                    if (row) setEditing(row);
                  }}
                  className="text-primary hover:opacity-70 transition-opacity shrink-0"
                  aria-label="Edit score details"
                  title="Edit title / metadata"
                >
                  <PencilLine className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
              {/* Pull the title from the live `rows` query — if the user
                  edits via the pencil, react-query refetches `rows` and
                  this header updates instantly. Fall back to the
                  snapshot captured at open time. */}
              <span className="truncate">
                {(viewing && rows.find((r) => r.id === viewing.id)?.title) || viewing?.title || 'Score'}
              </span>
            </DialogTitle>
            {/* Bigger on desktop, still 44pt-safe on iOS. Outline variant + a
                subtle border so they read as actual buttons against the
                light header instead of tiny ghost icons in the corner. */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleViewerFullscreen}
                className="h-11 w-11 md:h-12 md:w-12"
                aria-label={isViewerFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                title={isViewerFullscreen ? 'Exit fullscreen' : 'Fullscreen (great on iPad)'}
              >
                {isViewerFullscreen ? <Minimize2 className="w-5 h-5 md:w-6 md:h-6" /> : <Maximize2 className="w-5 h-5 md:w-6 md:h-6" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setViewing(null)}
                className="h-11 w-11 md:h-12 md:w-12"
                aria-label="Close score viewer"
                title="Close"
              >
                <X className="w-5 h-5 md:w-6 md:h-6" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {viewing && (
              <Suspense
                fallback={
                  <div className="py-10 text-center">
                    <Loader2 className="w-5 h-5 animate-spin inline text-muted-foreground" />
                  </div>
                }
              >
                <PDFViewerWithAnnotations
                  pdfUrl={viewing.pdfUrl}
                  musicId={viewing.id}
                  musicTitle={rows.find((r) => r.id === viewing.id)?.title || viewing.title}
                  startInAnnotationMode={false}
                  className="h-full"
                />
              </Suspense>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CopyrightPolicyLink />
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
}

