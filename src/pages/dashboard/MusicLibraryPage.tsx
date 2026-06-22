// Music Library (Command Center). Sheet music scores only — gw_sheet_music.
// Two tabs: Scores (browse + upload, scope filter, search) and Setlists
// (build/play performance orderings). Clicking a score opens
// PDFViewerWithAnnotations so the score can be marked up; annotations
// persist via gw_sheet_music_annotations and can be shared per existing
// flows. The legacy /music-library two-pane viewer remains for deep links.

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
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
  Maximize2, Minimize2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useScopeFilter } from '@/hooks/useScopeFilter';
import { useSheetMusicTracks } from '@/hooks/useSheetMusicTracks';
import { ScopeFilterChips } from '@/components/library/ScopeFilterChips';
import { useUserRole } from '@/hooks/useUserRole';

const SetlistBuilder = lazy(() =>
  import('@/components/music-library/SetlistBuilder').then((m) => ({ default: m.SetlistBuilder })),
);
const PDFViewerWithAnnotations = lazy(() =>
  import('@/components/PDFViewerWithAnnotations').then((m) => ({ default: m.PDFViewerWithAnnotations })),
);

type TopTab = 'scores' | 'setlists';

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
  audio_url: string | null;
  audio_title: string | null;
  physical_copies_count: number | null;
  physical_location: string | null;
  course_id: string | null;
  created_at: string | null;
}

export default function MusicLibraryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { active: scope, setActive: setScope, options, courses, applyFilter } = useScopeFilter();
  const { canEditMusicLibrary } = useUserRole();
  const canEdit = canEditMusicLibrary();
  const [topTab, setTopTab] = useState<TopTab>('scores');
  const [search, setSearch] = useState('');
  // Annotation viewer state — when set, opens a full-screen dialog with the
  // annotated PDF viewer so the user can mark up the score.
  const [viewing, setViewing] = useState<{ id: string; title: string; pdfUrl: string } | null>(null);
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
    queryKey: ['music-library-scores', scope],
    queryFn: async () => {
      let q = supabase
        .from('gw_sheet_music')
        .select('id, title, composer, voicing, difficulty_level, pdf_url, audio_url, audio_title, physical_copies_count, physical_location, course_id, created_at')
        .eq('is_archived', false)
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 pb-6 space-y-6">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Music Library</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Sheet music scores across your ensembles. Other media types live in the Media Library.
          </p>
        </div>
        {/* Score upload + URL import live in the Librarian add-on. The
            Music Library is read-only for browsing/playback. */}
      </header>

      {/* Top-level tabs: Scores vs Setlists. */}
      <div className="flex gap-2 border-b border-border">
        {([
          { key: 'scores',   label: 'Scores',   Icon: Music },
          { key: 'setlists', label: 'Setlists', Icon: ListMusic },
        ] as Array<{ key: TopTab; label: string; Icon: React.ComponentType<{ className?: string }> }>).map((t) => {
          const isActive = t.key === topTab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTopTab(t.key)}
              className={
                isActive
                  ? 'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                  : 'inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors'
              }
            >
              <t.Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {topTab === 'scores' ? (
        <>
          <Card className={SOFT_CARD} style={SOFT_CARD_STYLE}>
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2">Scope</div>
                <ScopeFilterChips active={scope} options={options} onChange={setScope} />
              </div>
              <div className="relative max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, composer, voicing…"
                  className="pl-9 h-9"
                />
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((r) => (
                <ScoreCard
                  key={r.id}
                  row={r}
                  courseCode={r.course_id ? courseCodeById[r.course_id] ?? null : null}
                  canEdit={canEdit}
                  onAnnotate={() => r.pdf_url && setViewing({ id: r.id, title: r.title, pdfUrl: r.pdf_url })}
                  onAttachAudio={() => setAttachingAudio(r)}
                  onEdit={() => setEditing(r)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
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
    </div>
  );
}

function ScoreCard({
  row, courseCode, canEdit, onAnnotate, onAttachAudio, onEdit,
}: {
  row: ScoreRow;
  courseCode: string | null;
  canEdit: boolean;
  onAnnotate: () => void;
  onAttachAudio: () => void;
  onEdit: () => void;
}) {
  const hasPdf = !!row.pdf_url;
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
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary">
            <Music className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-semibold leading-snug truncate">{row.title || 'Untitled'}</div>
            {/* Always reserve the composer line so cards stay the same
                height whether composer was provided or not. */}
            <div className="text-sm text-muted-foreground truncate mt-0.5">
              {row.composer || '\u00A0'}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {row.voicing && <Badge variant="outline" className="text-xs">{row.voicing}</Badge>}
              {row.difficulty_level && <Badge variant="outline" className="text-xs">{row.difficulty_level}</Badge>}
              {courseCode ? (
                <Badge variant="outline" className="text-xs">{courseCode}</Badge>
              ) : (
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">Platform</Badge>
              )}
              {hasAudio && (
                <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                  <Headphones className="w-3 h-3 mr-1" />
                  Audio
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                <LibraryIcon className="w-3 h-3 mr-1" />
                {copies} {copies === 1 ? 'physical copy' : 'physical copies'}
                {row.physical_location ? ` · ${row.physical_location}` : ''}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-auto pt-3">
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
          {hasPdf && (
            <>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onAttachAudio(); }}
                >
                  <Headphones className="w-4 h-4 mr-1.5" />
                  {hasAudio ? 'Audio' : 'Attach audio'}
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
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

        {addingTrack && <div className="flex gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => setTab('file')}
            className={
              tab === 'file'
                ? 'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            <Upload className="w-4 h-4" /> Upload
          </button>
          <button
            type="button"
            onClick={() => setTab('media')}
            className={
              tab === 'media'
                ? 'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            <LibraryIcon className="w-4 h-4" /> Media Library
          </button>
          <button
            type="button"
            onClick={() => setTab('youtube')}
            className={
              tab === 'youtube'
                ? 'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            <Youtube className="w-4 h-4" /> YouTube
          </button>
          <button
            type="button"
            onClick={() => setTab('apple')}
            className={
              tab === 'apple'
                ? 'inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold border-b-2 border-primary text-primary -mb-px'
                : 'inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
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
    }
  }, [score]);

  async function handleSave() {
    if (!score) return;
    setSubmitting(true);
    try {
      const copies = parseInt(physicalCopies, 10);
      const { error } = await supabase
        .from('gw_sheet_music')
        .update({
          title: title.trim() || 'Untitled',
          composer: composer.trim() || null,
          voicing: voicing.trim() || null,
          physical_copies_count: Number.isFinite(copies) ? copies : 0,
          physical_location: physicalLocation.trim() || null,
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
          <div className="grid grid-cols-2 gap-3">
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

