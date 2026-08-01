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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Music, Upload, Search, Loader2, FileMusic, ListMusic,
  PencilLine, Headphones, Youtube, X, Pencil, Library as LibraryIcon,
  Maximize2, Minimize2, LayoutGrid, List as ListIcon, Share2,
  Users as UsersIcon, GraduationCap, Check as CheckIcon, Store,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useScopeFilter } from '@/hooks/useScopeFilter';
import { useSheetMusicTracks } from '@/hooks/useSheetMusicTracks';
import { ScopeFilterSelect } from '@/components/library/ScopeFilterSelect';
import { useUserRole } from '@/hooks/useUserRole';
import { CopyrightPolicyLink } from '@/components/policies/CopyrightPolicyLink';
import { RightsBadge } from '@/components/policies/RightsBadge';
import { PublicDomainSearch } from '@/components/music-library/PublicDomainSearch';
import { MyMusicTab } from '@/components/music-library/MyMusicTab';
import { getSignedUrl } from '@/utils/storage';
import { BookOpen as BookOpenIcon } from 'lucide-react';
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

const SOFT_CARD = 'border-0 rounded-2xl bg-card';
const SOFT_CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 3px 6px rgba(15,23,42,0.08), 0 10px 20px -6px rgba(15,23,42,0.18)',
};

interface ScoreRow {
  id: string;
  title: string;
  composer: string | null;
  voicing: string | null;
  difficulty_level: string | null;
  pdf_url: string | null;
  storage_path: string | null;
  storage_bucket: string | null;
  audio_url: string | null;
  audio_title: string | null;
  physical_copies_count: number | null;
  physical_location: string | null;
  course_id: string | null;
  created_at: string | null;
  // Rights model (added via migration 20260622040000_sheet_music_rights.sql).
  // unknown = legacy row that still needs to be tagged by the librarian.
  rights_status: 'public_domain' | 'licensed' | 'all_rights_reserved' | 'unknown' | null;
  license_seat_count: number | null;
  license_expires_at: string | null;
  copyright_holder: string | null;
  // Member-visibility flag (migration 20260712120000_personal_music_library.sql).
  // Browse filter only: the Scores tab hides unflagged scores from members,
  // but this is NOT an access control — RLS is unchanged and deep-link/
  // setlist flows still open unshared scores (server-side hardening is a
  // phase-2 follow-up).
  shared_with_members: boolean | null;
  shared_with_users: string[] | null;
  shared_with_courses: string[] | null;
}

export default function MusicLibraryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { active: scope, setActive: setScope, options, courses, applyFilter } = useScopeFilter();
  const { canEditMusicLibrary } = useUserRole();
  const canEdit = canEditMusicLibrary();

  // Non-admin visibility rule: a score is visible if
  //   shared_with_members = true
  //   OR the current user is in shared_with_users
  //   OR the current user is enrolled in one of shared_with_courses
  // Course enrollments are pre-fetched once and folded into the scores
  // query's OR filter as an array-overlap predicate. Admins bypass all
  // of this via the canEdit branch below.
  const { data: enrolledCourseIds = [] } = useQuery<string[]>({
    queryKey: ['my-enrolled-courses', user?.id],
    enabled: !!user && !canEdit,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_course_enrollments')
        .select('course_id')
        .or(`user_id.eq.${user!.id},student_profile_id.eq.${user!.id}`)
        .eq('enrollment_status', 'enrolled');
      return Array.from(new Set((data ?? []).map((r: any) => r.course_id).filter(Boolean)));
    },
  });
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
    queryKey: ['music-library-scores', scope, canEdit, enrolledCourseIds.join(',')],
    queryFn: async () => {
      let q = supabase
        .from('gw_sheet_music')
        .select('id, title, composer, voicing, difficulty_level, pdf_url, storage_path, storage_bucket, audio_url, audio_title, physical_copies_count, physical_location, course_id, created_at, rights_status, license_seat_count, license_expires_at, copyright_holder, shared_with_members, shared_with_users, shared_with_courses')
        .eq('is_archived', false)
        .order('title')
        .limit(200);
      // Browse filter only: the Scores tab hides unshared scores from
      // members. NOT an access control — RLS is unchanged and
      // deep-link/setlist flows still open unshared scores (server-side
      // hardening is a phase-2 follow-up). Editors see everything.
      //
      // Sharing shape (2026-07-25):
      //   shared_with_members = true             → visible to all members
      //   auth.uid() ∈ shared_with_users         → visible to that user
      //   auth.uid() enrolled in a course whose
      //     id ∈ shared_with_courses            → visible to that student
      // Combined via a PostgREST `.or(...)` clause; `cs` = contains,
      // `ov` = overlaps. Curly-brace UUID literals are the PG array
      // syntax the operator expects.
      if (!canEdit && user) {
        const clauses: string[] = ['shared_with_members.eq.true'];
        clauses.push(`shared_with_users.cs.{${user.id}}`);
        if (enrolledCourseIds.length > 0) {
          clauses.push(`shared_with_courses.ov.{${enrolledCourseIds.join(',')}}`);
        }
        q = q.or(clauses.join(','));
      } else if (!canEdit) {
        // Signed out or user missing — mimic legacy "shared_with_members
        // only" so nothing leaks while auth is still resolving.
        q = q.eq('shared_with_members', true);
      }
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
          so a wider-than-parent container would be cut off, not scrollable. */}
      <div className="flex gap-2 border-b border-border overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          className={`p-0 flex flex-col overflow-hidden bg-background [&>button]:hidden ${
            isViewerFullscreen
              ? 'w-screen h-screen max-w-none rounded-none'
              : 'max-w-6xl h-[90vh]'
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

function ScoreCard({
  row, courseCode, canEdit, onAnnotate, onAttachAudio, onEdit, onToggleShare,
}: {
  row: ScoreRow;
  courseCode: string | null;
  canEdit: boolean;
  onAnnotate: () => void;
  onAttachAudio: () => void;
  onEdit: () => void;
  onToggleShare: () => void;
}) {
  const hasPdf = !!row.pdf_url || !!row.storage_path;
  const hasAudio = !!row.audio_url;
  const copies = row.physical_copies_count ?? 0;
  return (
    <Card
      className={`${SOFT_CARD} h-full flex flex-col ${hasPdf ? 'cursor-pointer transition-colors hover:bg-accent/40' : ''}`}
      style={SOFT_CARD_STYLE}
      onClick={hasPdf ? onAnnotate : undefined}
      role={hasPdf ? 'button' : undefined}
      tabIndex={hasPdf ? 0 : undefined}
      onKeyDown={
        hasPdf
          ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAnnotate(); } }
          : undefined
      }
    >
      <CardContent className="p-3 sm:p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
            <Music className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            {/* Titles are frequently raw upload filenames with no spaces, so
                wrap on any character \u2014 truncating them to one line hid the
                only part that distinguishes one score from another. */}
            <div
              className="text-sm font-semibold leading-snug line-clamp-2 break-words"
              title={row.title || 'Untitled'}
            >
              {row.title || 'Untitled'}
            </div>
            {/* Always reserve the composer line so cards stay the same
                height whether composer was provided or not. */}
            <div className="text-sm text-muted-foreground truncate mt-0.5">
              {row.composer || '\u00A0'}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <RightsBadge
                status={row.rights_status}
                seatCount={row.license_seat_count}
                warning={
                  row.rights_status === 'licensed' && row.license_expires_at && new Date(row.license_expires_at) < new Date()
                    ? 'expired'
                    : null
                }
                compact
              />
              {row.voicing && <Badge variant="outline" className="text-xs">{row.voicing}</Badge>}
              {row.difficulty_level && <Badge variant="outline" className="text-xs">{row.difficulty_level}</Badge>}
              {courseCode ? (
                <Badge variant="outline" className="text-xs">{courseCode}</Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">Platform</Badge>
              )}
              {hasAudio && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  <Headphones className="w-3 h-3 mr-1" />
                  Audio
                </Badge>
              )}
              {/* Only worth a badge when copies actually exist — "0 physical
                  copies" was on every card and crowded out the badges that
                  carry information. */}
              {copies > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs max-w-full"
                  title={`${copies} ${copies === 1 ? 'physical copy' : 'physical copies'}${row.physical_location ? ` · ${row.physical_location}` : ''}`}
                >
                  <LibraryIcon className="w-3 h-3 mr-1 shrink-0" />
                  <span className="truncate">
                    {copies} {copies === 1 ? 'copy' : 'copies'}
                    {row.physical_location ? ` · ${row.physical_location}` : ''}
                  </span>
                </Badge>
              )}
            </div>
          </div>
        </div>
        {/* Four labelled buttons cannot fit a one-third-column card, and flex
            items default to min-width:auto, so the old non-wrapping row spilled
            past the card edge. The secondary actions are now icon-only at every
            width — labels live in aria-label/title — which keeps the whole row
            on one line with Annotate, the only action worth a label, last. */}
        <div className="flex flex-wrap items-center justify-end gap-1.5 mt-auto pt-3">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              aria-label="Edit score details"
              title="Edit score details"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {canEdit && (
            <Button
              variant={row.shared_with_members ? 'secondary' : 'outline'}
              size="sm"
              className="shrink-0"
              onClick={(e) => { e.stopPropagation(); onToggleShare(); }}
              aria-label={row.shared_with_members ? 'Shared with members — tap to unshare' : 'Share with members'}
              title={row.shared_with_members ? 'Shared with members' : 'Share with members'}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          )}
          {hasPdf && (
            <>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={(e) => { e.stopPropagation(); onAttachAudio(); }}
                  aria-label={hasAudio ? 'Replace attached audio' : 'Attach audio'}
                  title={hasAudio ? 'Replace attached audio' : 'Attach audio'}
                >
                  <Headphones className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={(e) => { e.stopPropagation(); onAnnotate(); }}
              >
                <PencilLine className="w-4 h-4 mr-1.5" />
                Annotate
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact one-line-per-score rendering for the list layout. Same data and
// actions as ScoreCard; the badge cluster collapses away below md so phone
// rows stay title + actions.
function ScoreListRow({
  row, courseCode, canEdit, onAnnotate, onAttachAudio, onEdit, onToggleShare,
}: {
  row: ScoreRow;
  courseCode: string | null;
  canEdit: boolean;
  onAnnotate: () => void;
  onAttachAudio: () => void;
  onEdit: () => void;
  onToggleShare: () => void;
}) {
  const hasPdf = !!row.pdf_url || !!row.storage_path;
  const hasAudio = !!row.audio_url;
  const copies = row.physical_copies_count ?? 0;
  return (
    <div
      className={`flex items-center gap-3 px-3 sm:px-4 py-3 ${hasPdf ? 'cursor-pointer transition-colors hover:bg-accent/40' : ''}`}
      onClick={hasPdf ? onAnnotate : undefined}
      role={hasPdf ? 'button' : undefined}
      tabIndex={hasPdf ? 0 : undefined}
      onKeyDown={
        hasPdf
          ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAnnotate(); } }
          : undefined
      }
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
        <Music className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold leading-snug truncate">{row.title || 'Untitled'}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">{row.composer || ' '}</div>
        {/* Badges live inside the flexible title column and wrap, so they can
            never squeeze the title to zero width or push the actions off the
            card edge (which is exactly what happened at iPad widths when this
            cluster was a shrink-0 sibling of the title). */}
        <div className="hidden md:flex items-center gap-2 flex-wrap mt-1.5">
        <RightsBadge
          status={row.rights_status}
          seatCount={row.license_seat_count}
          warning={
            row.rights_status === 'licensed' && row.license_expires_at && new Date(row.license_expires_at) < new Date()
              ? 'expired'
              : null
          }
          compact
        />
        {row.voicing && <Badge variant="outline" className="text-xs">{row.voicing}</Badge>}
        {courseCode ? (
          <Badge variant="outline" className="text-xs">{courseCode}</Badge>
        ) : (
          <Badge variant="outline" className="text-xs text-muted-foreground">Platform</Badge>
        )}
        {hasAudio && (
          <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
            <Headphones className="w-3 h-3 mr-1" />
            Audio
          </Badge>
        )}
        <Badge
          variant="outline"
          className="text-xs"
          title={`${copies} ${copies === 1 ? 'physical copy' : 'physical copies'}${row.physical_location ? ` · ${row.physical_location}` : ''}`}
        >
          <LibraryIcon className="w-3 h-3 mr-1" />
          {copies}
        </Badge>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            aria-label="Edit score details"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        )}
        {canEdit && (
          <Button
            variant={row.shared_with_members ? 'secondary' : 'outline'}
            size="sm"
            className="text-xs"
            onClick={(e) => { e.stopPropagation(); onToggleShare(); }}
            aria-label={row.shared_with_members ? 'Shared with members' : 'Share with members'}
          >
            <Share2 className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{row.shared_with_members ? 'Shared' : 'Share'}</span>
          </Button>
        )}
        {hasPdf && (
          <>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex"
                onClick={(e) => { e.stopPropagation(); onAttachAudio(); }}
              >
                <Headphones className="w-4 h-4 mr-1.5" />
                {hasAudio ? 'Audio' : 'Attach audio'}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onAnnotate(); }}
              aria-label="Annotate score"
            >
              <PencilLine className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Annotate</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function AttachAudioDialog({
  score, userId, onOpenChange, onSaved,
}: {
  score: ScoreRow | null;
  userId: string | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const open = !!score;
  const [tab, setTab] = useState<'file' | 'youtube' | 'media' | 'apple'>('file');
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mediaPick, setMediaPick] = useState<{ id: string; title: string; file_url: string } | null>(null);
  const [mediaSearch, setMediaSearch] = useState('');
  // Multi-track state. tracks list comes from the new audio_tracks table.
  const { tracks, addTrack, setDefaultTrack, deleteTrack } = useSheetMusicTracks(score?.id);
  const [addingTrack, setAddingTrack] = useState(false);
  // Apple Music tab state. Search is debounced through useEffect below.
  const [appleSearch, setAppleSearch] = useState('');
  const [appleResults, setAppleResults] = useState<Array<{ id: string; title: string; artist: string; album: string; artworkUrl: string | null; storefront: string }>>([]);
  const [appleSearching, setAppleSearching] = useState(false);
  const [appleErr, setAppleErr] = useState<string | null>(null);
  const [applePick, setApplePick] = useState<{ id: string; title: string; artist: string; storefront: string; artworkUrl: string | null } | null>(null);

  // Audio items in this tenant's media library — used by the "From Media
  // Library" tab so users can bind a backing track they already uploaded
  // without re-uploading. RLS scopes results to the current tenant.
  const { data: mediaAudio = [], isLoading: mediaLoading } = useQuery({
    queryKey: ['media-library-audio', open],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_media_library')
        .select('id, title, file_url, file_type, category, tags')
        .or('file_type.ilike.audio%,file_type.eq.audio')
        .eq('is_deleted', false)
        .order('title')
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string; file_url: string; file_type: string; category: string; tags: string[] | null }>;
    },
  });

  // Reset form whenever a new score is opened.
  useEffect(() => {
    if (score) {
      const initialTitle = score.audio_title ?? '';
      const hasApple = !!(score as any).apple_music_id;
      const isYouTubeUrl = !!score.audio_url && /youtu(be\.com|\.be)/i.test(score.audio_url);
      setTab(hasApple ? 'apple' : isYouTubeUrl ? 'youtube' : 'file');
      setYoutubeUrl(isYouTubeUrl ? (score.audio_url ?? '') : '');
      setFile(null);
      setTitle(initialTitle);
      setMediaPick(null);
      setMediaSearch('');
      setAppleSearch('');
      setAppleResults([]);
      setAppleErr(null);
      setApplePick(hasApple ? {
        id: (score as any).apple_music_id,
        title: (score as any).apple_music_title ?? initialTitle ?? '',
        artist: (score as any).apple_music_artist ?? '',
        storefront: (score as any).apple_music_storefront ?? 'us',
        artworkUrl: (score as any).apple_music_artwork_url ?? null,
      } : null);
    }
  }, [score]);

  // Debounced Apple Music catalog search. Triggers MusicKit JS load + token
  // fetch on the first non-empty term, then runs a search per keystroke
  // pause. We never block the dialog open on this — it's lazy on the tab.
  useEffect(() => {
    if (tab !== 'apple') return;
    const term = appleSearch.trim();
    if (!term) { setAppleResults([]); setAppleErr(null); return; }
    let cancelled = false;
    setAppleSearching(true);
    setAppleErr(null);
    const handle = window.setTimeout(async () => {
      try {
        const { searchAppleMusic } = await import('@/lib/musicKit');
        const { songs } = await searchAppleMusic(term);
        if (!cancelled) setAppleResults(songs);
      } catch (e: any) {
        if (!cancelled) setAppleErr(e?.message ?? 'Apple Music search failed.');
      } finally {
        if (!cancelled) setAppleSearching(false);
      }
    }, 300);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [tab, appleSearch]);

  const filteredMedia = useMemo(() => {
    const s = mediaSearch.trim().toLowerCase();
    if (!s) return mediaAudio;
    return mediaAudio.filter((m) =>
      m.title?.toLowerCase().includes(s) ||
      (m.tags ?? []).some((t) => t.toLowerCase().includes(s)),
    );
  }, [mediaAudio, mediaSearch]);

  // Saves the current tab's selection as a NEW track in
  // gw_sheet_music_audio_tracks. The first track per score auto-becomes
  // default (server-side via the hook). Legacy gw_sheet_music columns
  // are mirrored to the new default so callers that haven't migrated
  // (older PDFViewerWithAnnotations builds, the iOS app on a stale build)
  // still load the same recording.
  async function handleSave() {
    if (!score || !userId) return;
    setSubmitting(true);
    try {
      const label = title.trim() || (
        tab === 'apple' ? (applePick?.title ?? 'Apple Music') :
        tab === 'media' ? (mediaPick?.title ?? 'Recording') :
        tab === 'youtube' ? 'YouTube' :
        file ? file.name.replace(/\.[^.]+$/, '') : 'Recording'
      );

      const trackPayload: any = { label, kind: tab === 'apple' ? 'apple_music' : tab === 'media' ? 'media_library' : tab === 'youtube' ? 'youtube' : 'file' };

      if (tab === 'file') {
        if (!file) { toast.error('Pick an MP3 first.'); setSubmitting(false); return; }
        const ext = file.name.split('.').pop() || 'mp3';
        const path = `audio/${score.id}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('sheet-music')
          .upload(path, file, { contentType: file.type, upsert: true });
        if (uploadErr) throw uploadErr;
        trackPayload.audio_url = supabase.storage.from('sheet-music').getPublicUrl(path).data.publicUrl;
        trackPayload.audio_title = label;
      } else if (tab === 'youtube') {
        const url = youtubeUrl.trim();
        if (!url || !/youtu(be\.com|\.be)/i.test(url)) {
          toast.error(!url ? 'Paste a YouTube URL first.' : 'That doesn\u2019t look like a YouTube URL.');
          setSubmitting(false); return;
        }
        trackPayload.audio_url = url;
        trackPayload.audio_title = label;
      } else if (tab === 'media') {
        if (!mediaPick) { toast.error('Pick an audio file from your media library.'); setSubmitting(false); return; }
        trackPayload.audio_url = mediaPick.file_url;
        trackPayload.audio_title = label;
      } else if (tab === 'apple') {
        if (!applePick) { toast.error('Search and pick an Apple Music track.'); setSubmitting(false); return; }
        trackPayload.apple_music_id = applePick.id;
        trackPayload.apple_music_storefront = applePick.storefront;
        trackPayload.apple_music_title = applePick.title;
        trackPayload.apple_music_artist = applePick.artist;
        trackPayload.apple_music_artwork_url = applePick.artworkUrl;
      }

      const isFirst = tracks.length === 0;
      const inserted = await addTrack.mutateAsync(trackPayload);

      // Mirror to legacy columns when this is (or becomes) the default,
      // so existing read paths keep working without redeploying.
      if (isFirst || inserted.is_default) {
        await supabase.from('gw_sheet_music').update(
          trackPayload.kind === 'apple_music' ? {
            audio_url: null, audio_title: inserted.label,
            apple_music_id: trackPayload.apple_music_id,
            apple_music_storefront: trackPayload.apple_music_storefront,
            apple_music_title: trackPayload.apple_music_title,
            apple_music_artist: trackPayload.apple_music_artist,
            apple_music_artwork_url: trackPayload.apple_music_artwork_url,
          } : {
            audio_url: trackPayload.audio_url, audio_title: inserted.label,
            apple_music_id: null, apple_music_storefront: null,
            apple_music_title: null, apple_music_artist: null, apple_music_artwork_url: null,
          },
        ).eq('id', score.id);
      }

      toast.success('Track added.');
      setAddingTrack(false);
      // Reset the picker fields so the next "Add a track" starts clean.
      setFile(null); setYoutubeUrl(''); setMediaPick(null); setApplePick(null);
      setTitle('');
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add track.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    if (!score) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('gw_sheet_music')
        .update({
          audio_url: null, audio_title: null,
          apple_music_id: null, apple_music_storefront: null,
          apple_music_title: null, apple_music_artist: null,
          apple_music_artwork_url: null,
        })
        .eq('id', score.id);
      if (error) throw error;
      toast.success('Audio removed.');
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove audio.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Audio tracks</DialogTitle>
          <DialogDescription>
            Bind one or many recordings to this score (Rehearsal, Accompaniment, Reference…). The default loads automatically; pick another from the audio companion.
          </DialogDescription>
        </DialogHeader>

        {/* Existing tracks list. Empty state nudges the user to add one. */}
        <div className="space-y-1">
          {tracks.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">No tracks yet.</p>
          ) : (
            <ul className="border rounded-md divide-y">
              {tracks.map((t) => (
                <li key={t.id} className="flex items-center gap-2 px-2 py-1.5">
                  <span className="shrink-0">
                    {t.kind === 'apple_music' ? <Music className="w-3.5 h-3.5 text-pink-500" /> :
                     t.kind === 'youtube' ? <Youtube className="w-3.5 h-3.5 text-red-500" /> :
                     t.kind === 'media_library' ? <LibraryIcon className="w-3.5 h-3.5 text-muted-foreground" /> :
                     <Headphones className="w-3.5 h-3.5 text-muted-foreground" />}
                  </span>
                  <span className="text-sm flex-1 truncate">{t.label}</span>
                  <button
                    type="button"
                    onClick={() => setDefaultTrack.mutate(t.id)}
                    className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded transition-colors ${
                      t.is_default
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent'
                    }`}
                    title={t.is_default ? 'Default — auto-loads when score opens' : 'Set as default'}
                  >
                    {t.is_default ? 'Default' : 'Set default'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (confirm(`Delete track "${t.label}"?`)) deleteTrack.mutate(t.id); }}
                    className="text-muted-foreground hover:text-destructive p-0.5"
                    title="Delete"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!addingTrack && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAddingTrack(true)}
              className="w-full mt-2"
            >
              <Upload className="w-4 h-4 mr-1.5" /> Add a track
            </Button>
          )}
        </div>

        {/* Four source tabs are wider than the dialog's inner width on a phone.
            DialogContent scrolls vertically but not horizontally, so this row
            needs its own horizontal scroll or the last tab is unreachable. */}
        {addingTrack && <div className="flex gap-2 border-b border-border overflow-x-auto -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setTab('file')}
            className={
              tab === 'file'
                ? 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
          <button
            type="button"
            onClick={() => setTab('media')}
            className={
              tab === 'media'
                ? 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            <LibraryIcon className="w-4 h-4" /> Media Library
          </button>
          <button
            type="button"
            onClick={() => setTab('youtube')}
            className={
              tab === 'youtube'
                ? 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            <Youtube className="w-4 h-4" /> YouTube
          </button>
          <button
            type="button"
            onClick={() => setTab('apple')}
            className={
              tab === 'apple'
                ? 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex shrink-0 whitespace-nowrap items-center gap-1.5 px-3 py-2 min-h-[44px] lg:min-h-0 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            <Music className="w-4 h-4" /> Apple Music
          </button>
        </div>}

        {addingTrack && <div className="space-y-3 pt-2">
          {tab === 'file' && (
            <div>
              <Label className="text-sm">MP3 file</Label>
              <Input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/aac,audio/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="cursor-pointer"
              />
            </div>
          )}
          {tab === 'youtube' && (
            <div>
              <Label className="text-sm">YouTube URL</Label>
              <Input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Video stays hidden during playback — only the audio plays.
              </p>
            </div>
          )}
          {tab === 'apple' && (
            <div className="space-y-2">
              <Label className="text-sm">Search Apple Music</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={appleSearch}
                  onChange={(e) => setAppleSearch(e.target.value)}
                  placeholder="Song, artist, or album…"
                  className="pl-8 h-9"
                />
              </div>
              {appleErr && (
                <p className="text-xs text-destructive">{appleErr}</p>
              )}
              <p className="text-[11px] text-muted-foreground italic">
                Playback requires an active Apple Music subscription. Free users will see a subscription prompt when they hit play.
              </p>
              <div className="border rounded-md max-h-60 overflow-y-auto divide-y">
                {applePick && !appleSearch.trim() && (
                  <div className="p-3 flex items-center gap-3 bg-accent/30">
                    {applePick.artworkUrl && (
                      <img src={applePick.artworkUrl} alt="" className="w-10 h-10 rounded shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{applePick.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{applePick.artist}</div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-primary">Picked</span>
                  </div>
                )}
                {appleSearching ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Searching Apple Music…
                  </div>
                ) : appleResults.length === 0 && appleSearch.trim() && !appleErr ? (
                  <div className="p-4 text-center text-xs text-muted-foreground italic">
                    No matches in the Apple Music catalog.
                  </div>
                ) : (
                  appleResults.map((r) => {
                    const picked = applePick?.id === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => {
                          setApplePick({ id: r.id, title: r.title, artist: r.artist, storefront: r.storefront, artworkUrl: r.artworkUrl });
                          if (!title.trim()) setTitle(r.title);
                        }}
                        className={
                          picked
                            ? 'w-full flex items-center gap-3 px-3 py-2 text-left bg-accent/60'
                            : 'w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/40'
                        }
                      >
                        {r.artworkUrl ? (
                          <img src={r.artworkUrl} alt="" className="w-10 h-10 rounded shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted shrink-0 flex items-center justify-center">
                            <Music className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {r.artist}{r.album ? ` · ${r.album}` : ''}
                          </div>
                        </div>
                        {picked && <Headphones className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
          {tab === 'media' && (
            <div className="space-y-2">
              <Label className="text-sm">Pick a track from your Media Library</Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={mediaSearch}
                  onChange={(e) => setMediaSearch(e.target.value)}
                  placeholder="Search title or tag…"
                  className="pl-8 h-9"
                />
              </div>
              <div className="border rounded-md max-h-60 overflow-y-auto divide-y">
                {mediaLoading ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading…
                  </div>
                ) : filteredMedia.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground italic">
                    {mediaSearch
                      ? 'No matches in your media library.'
                      : 'No audio in the media library yet. Upload one in Media Library first.'}
                  </div>
                ) : (
                  filteredMedia.map((m) => {
                    const picked = mediaPick?.id === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMediaPick({ id: m.id, title: m.title, file_url: m.file_url });
                          if (!title.trim()) setTitle(m.title);
                        }}
                        className={
                          picked
                            ? 'w-full flex items-center gap-2 px-3 py-2 text-left bg-accent/60'
                            : 'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/40'
                        }
                      >
                        <Music className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate flex-1">{m.title}</span>
                        {picked && <Headphones className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm">Track label</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Rehearsal, Accompaniment, Reference…"
            />
          </div>
        </div>}

        <DialogFooter className="flex-row items-center justify-between sm:justify-between gap-2">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Close
            </Button>
            {addingTrack && (
              <>
                <Button variant="ghost" onClick={() => setAddingTrack(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Headphones className="w-4 h-4 mr-1.5" />}
                  Add
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditScoreDialog({
  score, onOpenChange, onSaved,
}: {
  score: ScoreRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const open = !!score;
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [voicing, setVoicing] = useState('');
  const [physicalCopies, setPhysicalCopies] = useState('');
  const [physicalLocation, setPhysicalLocation] = useState('');
  // Rights model — see Copyright & Content Policy.
  const [rightsStatus, setRightsStatus] = useState<'public_domain' | 'licensed' | 'all_rights_reserved' | 'unknown'>('unknown');
  const [licenseSeatCount, setLicenseSeatCount] = useState('');
  const [copyrightHolder, setCopyrightHolder] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (score) {
      setTitle(score.title ?? '');
      setComposer(score.composer ?? '');
      setVoicing(score.voicing ?? '');
      setPhysicalCopies(
        score.physical_copies_count != null ? String(score.physical_copies_count) : '',
      );
      setPhysicalLocation(score.physical_location ?? '');
      setRightsStatus((score.rights_status as any) ?? 'unknown');
      setLicenseSeatCount(score.license_seat_count != null ? String(score.license_seat_count) : '');
      setCopyrightHolder(score.copyright_holder ?? '');
    }
  }, [score]);

  async function handleSave() {
    if (!score) return;
    setSubmitting(true);
    try {
      const copies = parseInt(physicalCopies, 10);
      // CHECK constraint requires: licensed → seat count set; non-licensed → seat count null.
      const seatNum = parseInt(licenseSeatCount, 10);
      const seatForDb = rightsStatus === 'licensed' && Number.isFinite(seatNum) && seatNum > 0
        ? seatNum
        : null;
      if (rightsStatus === 'licensed' && seatForDb === null) {
        throw new Error('Licensed works need a seat count (how many copies your license covers).');
      }
      const { error } = await supabase
        .from('gw_sheet_music')
        .update({
          title: title.trim() || 'Untitled',
          composer: composer.trim() || null,
          voicing: voicing.trim() || null,
          physical_copies_count: Number.isFinite(copies) ? copies : 0,
          physical_location: physicalLocation.trim() || null,
          rights_status: rightsStatus,
          license_seat_count: seatForDb,
          copyright_holder: copyrightHolder.trim() || null,
        })
        .eq('id', score.id);
      if (error) throw error;
      toast.success('Score updated.');
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || 'Update failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit score</DialogTitle>
          <DialogDescription>
            Update title, composer, voicing, and physical inventory for this score.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">Composer</Label>
            <Input value={composer} onChange={(e) => setComposer(e.target.value)} />
          </div>
          <div>
            <Label className="text-sm">Voicing</Label>
            <Input value={voicing} onChange={(e) => setVoicing(e.target.value)} placeholder="SATB" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Physical copies</Label>
              <Input
                type="number"
                min={0}
                value={physicalCopies}
                onChange={(e) => setPhysicalCopies(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-sm">Library location</Label>
              <Input
                value={physicalLocation}
                onChange={(e) => setPhysicalLocation(e.target.value)}
                placeholder="Folder B-12"
              />
            </div>
          </div>

          {/* Rights model — see /copyright-policy. */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Rights &amp; licensing
            </div>
            <div>
              <Label className="text-sm">Rights status</Label>
              <select
                value={rightsStatus}
                onChange={(e) => setRightsStatus(e.target.value as typeof rightsStatus)}
                className="w-full mt-1 h-9 border border-border rounded-md bg-background px-2 text-sm"
              >
                <option value="unknown">Not yet tagged</option>
                <option value="public_domain">Public domain (free to distribute)</option>
                <option value="licensed">Licensed (limited seats)</option>
                <option value="all_rights_reserved">All rights reserved (private use only)</option>
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {rightsStatus === 'public_domain' && 'No seat limit. Modern editions may still be copyrighted — verify the editor.'}
                {rightsStatus === 'licensed' && 'One active member per seat. Reduce roster or buy more copies if you grow past the count.'}
                {rightsStatus === 'all_rights_reserved' && 'Private use only — do NOT share with members or move to the shared library.'}
                {rightsStatus === 'unknown' && 'Tag this work before adding it to a course library.'}
              </p>
            </div>
            {rightsStatus === 'licensed' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Seat count</Label>
                  <Input
                    type="number"
                    min={1}
                    value={licenseSeatCount}
                    onChange={(e) => setLicenseSeatCount(e.target.value)}
                    placeholder="40"
                  />
                </div>
                <div>
                  <Label className="text-sm">Copyright holder</Label>
                  <Input
                    value={copyrightHolder}
                    onChange={(e) => setCopyrightHolder(e.target.value)}
                    placeholder="Hal Leonard"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={submitting || !title.trim()}>
            {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Pencil className="w-4 h-4 mr-1.5" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Share dialog ────────────────────────────────────────────────────────
//
// Combines three sharing lanes in one place:
//   1. "Everyone in this workspace" — the tenant-wide shared_with_members
//      flag (kept for the ~thousand-row broadcast case).
//   2. "Specific people" — shared_with_users uuid[] on the score. Members
//      whose auth.uid() lands in the array see the row in Scores.
//   3. "Classes" — shared_with_courses uuid[] on the score. Anyone
//      currently enrolled (gw_course_enrollments) in a listed course
//      sees the row. Removing a student from the class immediately
//      revokes access on the next Scores refresh.
//
// One Save writes all three arrays back in a single update. On failure
// (RLS silent no-op, network, etc.) we toast and leave the dialog open
// so the librarian can retry rather than lose their selections.
function ShareScoreDialog({
  score, onOpenChange, onSaved,
}: {
  score: ScoreRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const open = !!score;
  const [everyone, setEveryone] = useState(false);
  const [users, setUsers] = useState<Set<string>>(new Set());
  const [coursesSel, setCoursesSel] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [peopleFilter, setPeopleFilter] = useState('');

  // Reset draft state whenever the dialog opens for a different score.
  useEffect(() => {
    if (!score) return;
    setEveryone(!!score.shared_with_members);
    setUsers(new Set(score.shared_with_users ?? []));
    setCoursesSel(new Set(score.shared_with_courses ?? []));
    setPeopleFilter('');
  }, [score]);

  // Tenant members — used for the individual-share picker. Fetched only
  // when the dialog is open to avoid pulling every profile at page load.
  const { data: people = [], isLoading: peopleLoading } = useQuery<Array<{ user_id: string; full_name: string | null; email: string | null; role: string | null }>>({
    queryKey: ['share-dialog-people'],
    enabled: open,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name, email, role')
        .eq('disabled', false)
        .order('full_name', { ascending: true, nullsFirst: false });
      return (data ?? []) as any[];
    },
  });

  // Tenant classes — pulled from gw_courses; only active ones surface
  // because sharing to a dormant/archived class would be surprising.
  const { data: classes = [], isLoading: classesLoading } = useQuery<Array<{ id: string; title: string; course_code: string | null }>>({
    queryKey: ['share-dialog-courses'],
    enabled: open,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_courses')
        .select('id, title, course_code, is_active')
        .eq('is_active', true)
        .order('title');
      return ((data ?? []) as any[]).map((c) => ({ id: c.id, title: c.title, course_code: c.course_code }));
    },
  });

  const filteredPeople = useMemo(() => {
    const q = peopleFilter.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) =>
      (p.full_name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q),
    );
  }, [people, peopleFilter]);

  const toggleUser = (uid: string) => {
    setUsers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  };
  const toggleCourse = (cid: string) => {
    setCoursesSel((prev) => {
      const next = new Set(prev);
      if (next.has(cid)) next.delete(cid); else next.add(cid);
      return next;
    });
  };

  const save = async () => {
    if (!score) return;
    setSaving(true);
    // `.select()` after update so an RLS-silenced no-op surfaces as a real
    // failure (row_count === 0) instead of a lying success toast.
    const { data, error } = await (supabase as any)
      .from('gw_sheet_music')
      .update({
        shared_with_members: everyone,
        shared_with_users: Array.from(users),
        shared_with_courses: Array.from(coursesSel),
      })
      .eq('id', score.id)
      .select('id');
    setSaving(false);
    if (error || !data?.length) {
      toast.error("Sharing couldn't be updated — your role may not have permission.");
      return;
    }
    const summary = everyone
      ? 'Shared with everyone in this workspace'
      : (users.size + coursesSel.size === 0
        ? 'Not shared — visible only to you and other admins'
        : `Shared with ${users.size} person${users.size === 1 ? '' : 's'} · ${coursesSel.size} class${coursesSel.size === 1 ? '' : 'es'}`);
    toast.success(summary);
    onSaved();
  };

  if (!score) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">Share “{score.title}”</DialogTitle>
          <DialogDescription>
            Choose who can see this score in their Scores tab. Sharing is additive — any
            of the three lanes below is enough for a member to see the row.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 overflow-y-auto flex-1 -mx-1 px-1">
          {/* Lane 1 — everyone */}
          <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Everyone in this workspace</div>
              <div className="text-xs text-muted-foreground">
                Every member of your tenant can see the score. Turn this off to share only with the specific people and classes below.
              </div>
            </div>
            <Switch checked={everyone} onCheckedChange={setEveryone} />
          </div>

          {/* Lane 2 — specific people */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm inline-flex items-center gap-1.5">
                <UsersIcon className="w-3.5 h-3.5 text-muted-foreground" />
                Specific people
                {users.size > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{users.size}</Badge>}
              </Label>
              {users.size > 0 && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setUsers(new Set())}>
                  Clear
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={peopleFilter}
                onChange={(e) => setPeopleFilter(e.target.value)}
                placeholder="Search by name or email…"
                className="pl-7 h-8 text-sm"
              />
            </div>
            <ScrollArea className="h-40 rounded-lg border">
              <div className="p-1">
                {peopleLoading ? (
                  <div className="p-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading people…
                  </div>
                ) : filteredPeople.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">No people match.</div>
                ) : filteredPeople.map((p) => {
                  const selected = users.has(p.user_id);
                  return (
                    <button
                      key={p.user_id}
                      type="button"
                      onClick={() => toggleUser(p.user_id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/60 text-left"
                    >
                      <Checkbox checked={selected} onCheckedChange={() => toggleUser(p.user_id)} className="pointer-events-none" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm truncate">{p.full_name || p.email || '(no name)'}</div>
                        {p.full_name && p.email && (
                          <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Lane 3 — classes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm inline-flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                Classes
                {coursesSel.size > 0 && <Badge variant="secondary" className="ml-1 text-[10px]">{coursesSel.size}</Badge>}
              </Label>
              {coursesSel.size > 0 && (
                <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCoursesSel(new Set())}>
                  Clear
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Every currently-enrolled student in a selected class sees this score. Access follows the class roster — removing a student from the class also removes their access here.
            </p>
            <ScrollArea className="h-32 rounded-lg border">
              <div className="p-1">
                {classesLoading ? (
                  <div className="p-3 text-xs text-muted-foreground inline-flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading classes…
                  </div>
                ) : classes.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">No active classes in this workspace.</div>
                ) : classes.map((c) => {
                  const selected = coursesSel.has(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCourse(c.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/60 text-left"
                    >
                      <Checkbox checked={selected} onCheckedChange={() => toggleCourse(c.id)} className="pointer-events-none" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm truncate">{c.title}</div>
                        {c.course_code && (
                          <div className="text-xs text-muted-foreground truncate">{c.course_code}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CheckIcon className="w-4 h-4 mr-1.5" />}
            Save sharing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

