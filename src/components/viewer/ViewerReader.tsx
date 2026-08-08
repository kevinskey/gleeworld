// forScore-style score reader.
//
// Philosophy: the score is the screen. Default chrome is HIDDEN; a single
// tap on the page surface reveals a thin top bar (back, title, tools) and
// a slim bottom seek bar. Both fade after a short idle. Tools button opens
// a sheet with bookmarks, audio companion, piano, annotate, thumbnail
// page picker — everything that used to crowd the centered pill is now
// one tap behind a single icon.
//
// PDFViewerWithAnnotations does the heavy lifting (worker init, ArrayBuffer
// fallback, page cache, annotation engine) and exposes an imperative
// handle so this shell can drive page navigation, open the audio
// companion, toggle the piano, enter and drive annotation mode, and
// render thumbnails without re-rendering inside.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl } from '@/utils/storage';
import { isPersonalScoreId, toTableId } from '@/lib/viewerScoreId';
import { PERSONAL_SCORES_BUCKET } from '@/lib/personalLibrary';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Menu, Loader2, Music, Piano as PianoIcon, Palette, Bookmark,
  Grid3X3, X, Save, Undo, Eraser, MousePointer, Pencil, Trash2,
  ChevronLeft, ChevronRight, Wrench, SplitSquareHorizontal, Rows3, Link2,
  MoreVertical, Search as SearchIcon, BookMarked, ListMusic, Library,
  FileText, Cloud, ExternalLink, ChevronDown, Briefcase, Timer as MetronomeIcon,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { useSetlists } from '@/hooks/useSetlists';
import { Metronome } from '@/components/audioTools/Metronome';
import { PitchPipe } from '@/components/audioTools/PitchPipe';
import { Tuner } from '@/components/audioTools/Tuner';
import { useHandsFreeControls } from '@/hooks/useHandsFreeControls';
import { HandsFreeSettingsPanel } from '@/components/viewer/HandsFreeSettings';
import { startFaceGestures, stopFaceGestures } from '@/lib/faceGestures';
import { HalfPageView } from '@/components/viewer/HalfPageView';
import { ReflowView } from '@/components/viewer/ReflowView';
import { JumpsOverlay, JumpsList } from '@/components/viewer/JumpsOverlay';
import { LayersPanel } from '@/components/viewer/LayersPanel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Layers as LayersIcon, Shuffle, Radio } from 'lucide-react';
import { RearrangePagesDialog } from '@/components/viewer/RearrangePagesDialog';
import { useCueCoordination } from '@/hooks/useCueCoordination';
import { CuePanel } from '@/components/viewer/CuePanel';
import { SyncStatusBadge } from '@/components/viewer/SyncStatusBadge';
import { ViewerSideNav, type SideNavItem } from '@/components/viewer/ViewerSideNav';
import { useDeviceProfile } from '@/hooks/useDeviceProfile';
import { TwoPageView } from '@/components/viewer/TwoPageView';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PDFViewerWithAnnotations, type PDFViewerHandle } from '@/components/PDFViewerWithAnnotations';
import { useSheetMusicBookmarks } from '@/hooks/useSheetMusicBookmarks';
import { BookmarksMenu } from '@/components/music-library/BookmarksMenu';
import { AudioCompanionControls } from '@/components/music-library/AudioCompanionControls';
import { useSetlistScores, useViewerSetlists, hasSource } from '@/hooks/useViewerSetlists';
import { useRecordScoreOpen } from '@/hooks/useRecordScoreOpen';
import { useNavigate } from 'react-router-dom';

interface ViewerReaderProps {
  // Optional — when omitted the reader renders its chrome in a
  // "no score chosen yet" empty state with a black surface and the
  // library drawer popped out so the user can pick one.
  scoreId?: string;
  setlistId?: string;
  onBack: () => void;
}

interface ScoreMeta {
  id: string;
  title: string;
  composer: string | null;
  // Direct URL (legacy). Newer uploads (Supabase Storage 1.48 → DO Spaces)
  // leave pdf_url null and reference the file via storage_bucket +
  // storage_path; the effective URL is signed on demand.
  pdf_url: string | null;
  storage_path: string | null;
  storage_bucket: string | null;
}

// Bottom-bar auto-hide. Top bar is always visible (forScore-style) so we
// can be brisker about fading the seek bar — 5s matches forScore's feel.
const CHROME_HIDE_DELAY_MS = 5000;

const STAMP_OPTIONS = [
  { group: 'Dynamics', glyphs: ['𝑝𝑝', '𝑝', '𝑚𝑝', '𝑚𝑓', '𝑓', '𝑓𝑓'] },
  { group: 'Articulation', glyphs: ['>', '·', '–', '𝄐', 'ʼ', '⌒'] },
  { group: 'Navigation', glyphs: ['𝄋', '𝄌', '♯', '♭', '♮', '𝄆'] },
];

const COLOR_OPTIONS = ['#ff0000', '#000000', '#0000ff', '#008000', '#800080', '#ffa500'];

export function ViewerReader({ scoreId, setlistId, onBack }: ViewerReaderProps) {
  const navigate = useNavigate();
  const [chromeVisible, setChromeVisible] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);
  // forScore-style chrome — left hamburger opens a content-source drawer
  // (Library · Setlists · Music Library · CPDL), the title-area star menu
  // surfaces per-score actions, and Search/Music Toolkit/Tools live on the
  // right. The original iPad permanent side-nav is replaced by this drawer
  // so the score gets the full width on every form factor.
  // Two distinct left popouts. The Book icon opens the full library
  // (sortable + filterable). The hamburger icon opens setlists-only.
  // Keeping them separate avoids the dual-mode drawer pattern we had
  // before, where the user had to scroll past Library to reach setlists.
  // When the reader is on the LANDING route (no scoreId) we open the
  // library drawer immediately — the user has nothing to read yet, so
  // surfacing the picker is the only useful starting affordance.
  const [libraryDrawerOpen, setLibraryDrawerOpen] = useState(!scoreId);
  const [setlistsDrawerOpen, setSetlistsDrawerOpen] = useState(false);
  const [cpdlDrawerOpen, setCpdlDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addToSetlistOpen, setAddToSetlistOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  // Persisted collapsed state for the iPad/desktop side nav so the user's
  // preferred width survives across scores. Default depends on viewport:
  // narrow iPad / portrait (< 1024px) starts collapsed so the score has
  // room to breathe; landscape / desktop starts expanded.
  const [sideNavCollapsed, setSideNavCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('gw-viewer-sidenav-collapsed');
      if (stored === '1') return true;
      if (stored === '0') return false;
    } catch {}
    // First-run default — collapse on iPad portrait + smaller.
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return true;
    return false;
  });
  const toggleSideNav = useCallback(() => {
    setSideNavCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem('gw-viewer-sidenav-collapsed', next ? '1' : '0'); } catch {}
      return next;
    });
  }, []);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [musicToolsOpen, setMusicToolsOpen] = useState(false);
  const [handsFreeOpen, setHandsFreeOpen] = useState(false);
  const [rearrangeOpen, setRearrangeOpen] = useState(false);
  const [cueOpen, setCueOpen] = useState(false);
  const [annotateActive, setAnnotateActive] = useState(false);
  // Mirror the PDFViewer's audio companion + piano visibility so the side
  // nav can show an active highlight and second-clicks turn the feature
  // back off. The PDFViewer is the source of truth via its ref; we poll
  // these flags on each render via a tiny ticker so the indicator follows
  // changes the user makes from the PDF viewer's own chrome too.
  const [audioCompanionOn, setAudioCompanionOn] = useState(false);
  const [pianoOn, setPianoOn] = useState(false);
  // Display modes — only one at a time. 'normal' is the standard reader,
  // 'half' uses HalfPageView, 'reflow' uses ReflowView teleprompter,
  // 'two-page' shows two pages side-by-side (iPad landscape book mode).
  const [displayMode, setDisplayMode] = useState<'normal' | 'half' | 'reflow' | 'two-page'>('normal');
  const device = useDeviceProfile();
  // Jumps overlay state: when placing a new jump, listen for canvas taps.
  const [placingJump, setPlacingJump] = useState(false);
  const scoreSurfaceRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState({ current: 1, total: 1 });
  const hideTimerRef = useRef<number | null>(null);
  const pdfRef = useRef<PDFViewerHandle | null>(null);

  // Record this open for the Recent sort and any future Continue Reading row.
  useRecordScoreOpen(scoreId);

  // Hands-free page turns — Bluetooth pedal, MIDI, face gestures. The
  // handlers route through the PDFViewer ref so the same code path runs
  // regardless of input source.
  const handsFree = useHandsFreeControls({
    onNext: () => pdfRef.current?.nextPage(),
    onPrev: () => pdfRef.current?.prevPage(),
  });

  // Cue coordination — leader broadcasts page changes; followers receive
  // and snap their reader. If the leader switches to a different score,
  // route to that score's reader URL.
  const cue = useCueCoordination({
    scoreId,
    currentPage: page.current,
    onRemotePage: (msg) => {
      if (msg.scoreId && msg.scoreId !== scoreId) {
        // Different score — navigate the follower to it.
        navigate(`/dashboard/viewer/${msg.scoreId}${setlistId ? `?setlist=${setlistId}` : ''}`);
        return;
      }
      if (msg.page && msg.page !== page.current) {
        pdfRef.current?.goToPage(msg.page);
      }
    },
  });

  // Face gestures need a camera stream + ML model; spin them up only while
  // the toggle is on. The lib handles its own debouncing + cooldown.
  useEffect(() => {
    if (!handsFree.settings.gesturesEnabled) { stopFaceGestures(); return; }
    startFaceGestures({
      onNext: () => pdfRef.current?.nextPage(),
      onPrev: () => pdfRef.current?.prevPage(),
      sensitivity: handsFree.settings.gestureSensitivity,
    }).catch((err) => {
      // Surface why it failed — the most common reasons are camera
      // permission denied + CSP/network blocking the MediaPipe model.
      console.warn('[ViewerReader] face gestures failed', err);
      const msg = String(err?.message ?? err ?? '');
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
        toast.error('Camera permission denied — enable it in Settings to use face gestures.');
      } else if (msg.toLowerCase().includes('fetch') || msg.toLowerCase().includes('network')) {
        toast.error('Could not load the face-gesture model. Check your connection and retry.');
      } else {
        toast.error(`Face gestures unavailable: ${msg || 'unknown error'}`);
      }
    });
    return () => { stopFaceGestures(); };
  }, [handsFree.settings.gesturesEnabled, handsFree.settings.gestureSensitivity]);

  const { data: meta, isLoading } = useQuery<ScoreMeta | null>({
    queryKey: ['viewer-score', scoreId],
    queryFn: async () => {
      if (!scoreId) return null;

      // My Music scores arrive with a prefixed id and live in a different
      // table. They are private by RLS, carry no legacy pdf_url, and always
      // sit in the personal-scores bucket — so once mapped into ScoreMeta the
      // existing signing path below handles them with no further branching.
      if (isPersonalScoreId(scoreId)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from('gw_personal_scores')
          .select('id, title, composer, storage_path')
          .eq('id', toTableId(scoreId))
          .maybeSingle();
        if (!data) return null;
        return {
          id: scoreId,
          title: data.title,
          composer: data.composer ?? null,
          pdf_url: null,
          storage_path: data.storage_path ?? null,
          storage_bucket: PERSONAL_SCORES_BUCKET,
        } as ScoreMeta;
      }

      const { data } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, pdf_url, storage_path, storage_bucket')
        .eq('id', scoreId)
        .maybeSingle();
      return (data as ScoreMeta) ?? null;
    },
    enabled: !!scoreId,
  });

  // Effective PDF URL: prefer the legacy `pdf_url` when present,
  // otherwise sign a URL from storage_bucket + storage_path. Signed URLs
  // expire in 1h; the reader typically re-opens the same file within
  // that window, and re-signing on the next mount is cheap.
  const { data: effectivePdfUrl } = useQuery<string | null>({
    queryKey: ['viewer-pdf-url', scoreId, meta?.pdf_url, meta?.storage_bucket, meta?.storage_path],
    queryFn: async () => {
      if (!meta) return null;
      if (meta.pdf_url) return meta.pdf_url;
      if (meta.storage_bucket && meta.storage_path) {
        return await getSignedUrl(meta.storage_bucket, meta.storage_path, 3600, false);
      }
      return null;
    },
    enabled: !!meta,
    staleTime: 30 * 60 * 1000, // 30 min — well within the 1h signature TTL
  });

  // Optional setlist context — when present we surface Next/Prev-score
  // buttons in the bottom bar so a performer can step through a concert.
  const { data: setlistScores = [] } = useSetlistScores(setlistId);
  const setlistIndex = useMemo(
    () => setlistScores.findIndex((s) => s.sheet_music_id === scoreId),
    [setlistScores, scoreId],
  );
  const prevSetlistScore = setlistIndex > 0 ? setlistScores[setlistIndex - 1] : null;
  const nextSetlistScore = setlistIndex >= 0 && setlistIndex < setlistScores.length - 1
    ? setlistScores[setlistIndex + 1]
    : null;
  const goSetlistScore = (id: string) => navigate(`/dashboard/viewer/${id}?setlist=${setlistId}`);

  const showChrome = useCallback(() => {
    setChromeVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      setChromeVisible((prev) => (toolsOpen || pagesOpen || annotateActive ? prev : false));
    }, CHROME_HIDE_DELAY_MS);
  }, [toolsOpen, pagesOpen, annotateActive]);

  const toggleChrome = useCallback(() => {
    if (chromeVisible) {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      setChromeVisible(false);
    } else {
      showChrome();
    }
  }, [chromeVisible, showChrome]);

  useEffect(() => {
    showChrome();
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [showChrome]);

  // Only block on loading / not-found when the user actually asked for
  // a specific score. The landing state (no scoreId) falls straight
  // through to the chrome with an empty surface.
  if (scoreId && isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // "Has a PDF" now covers both the legacy pdf_url column and the
  // storage_bucket+storage_path pair (DO Spaces via Supabase Storage).
  // Meta loads before the signed URL resolves, so we key the failure
  // guard off the source columns rather than effectivePdfUrl — otherwise
  // the error page flashes for a beat between meta and signing.
  const hasSource = !!(meta?.pdf_url || (meta?.storage_bucket && meta?.storage_path));
  if (scoreId && meta && !hasSource) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Score not found or has no PDF.</p>
        <Button size="sm" variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Viewer
        </Button>
      </div>
    );
  }

  // Effective meta for the rest of the render. When the user is on
  // the landing state we fabricate a placeholder so the chrome (title
  // pill, bookmarks menu, audio companion) all keep their prop contracts
  // without hundreds of conditional checks downstream.
  const m = meta
    ? { ...meta, pdf_url: effectivePdfUrl ?? meta.pdf_url }
    : { id: '', title: 'No score selected', composer: null, pdf_url: null, storage_path: null, storage_bucket: null };
  const hasScore = !!m.pdf_url;

  const callTool = (fn: (h: PDFViewerHandle) => void) => {
    if (pdfRef.current) fn(pdfRef.current);
    setToolsOpen(false);
    showChrome();
  };

  const enterAnnotate = () => {
    if (!pdfRef.current) return;
    pdfRef.current.enterAnnotationMode();
    pdfRef.current.setAnnotationTool('draw');
    setAnnotateActive(true);
    setToolsOpen(false);
    showChrome();
  };

  const exitAnnotate = async () => {
    if (!pdfRef.current) return;
    // Prompt to save if dirty — same flow Music Library uses.
    const proceed = await pdfRef.current.promptToSaveIfDirty();
    if (!proceed) return;
    pdfRef.current.exitAnnotationMode();
    setAnnotateActive(false);
  };

  // Toggle handlers — drive ONLY our header-strip companion now. The
  // PDFViewer also has its own internal companion state but routing
  // through both led to two stacked AudioCompanionControls competing
  // for the same musicId. Our strip already supports Apple Music search,
  // YouTube URL input, and local media-library upload (the three sources
  // the user asked for), so the PDFViewer's internal companion is
  // redundant for this layout.
  const toggleAudioCompanion = () => {
    if (!hasScore) {
      toast.error('Pick a score from the library first.');
      return;
    }
    setAudioCompanionOn((v) => !v);
  };
  const togglePiano = () => {
    callTool((h) => h.togglePiano());
    setPianoOn((v) => !v);
  };
  // Pagination = the bottom seek bar / pagination chrome. We treat
  // chromeVisible as the truth so the Pagination row indicator turns
  // on/off in sync with the actual UI.
  const togglePagination = () => {
    if (chromeVisible) {
      // Hide the chrome — flip the auto-hide state directly.
      setChromeVisible(false);
    } else {
      showChrome();
    }
  };

  // Tool list shared by the iPad+ side nav and the phone hamburger sheet.
  // Each item is a TOGGLE — second click turns the feature back off — and
  // the side nav's active highlight follows that state so the user can
  // always see what's currently on. After firing, we also close the
  // phone-side hamburger sheet so the user immediately sees the result.
  const toolItems: SideNavItem[] = [
    { Icon: Music, label: 'Audio companion', note: 'MP3 / YouTube / Apple Music', onClick: toggleAudioCompanion, active: audioCompanionOn },
    { Icon: PianoIcon, label: 'Piano', note: 'Dockable keyboard', onClick: togglePiano, active: pianoOn },
    { Icon: Wrench, label: 'Music tools', note: 'Metronome · Guitar Tuner', onClick: () => { setMusicToolsOpen((v) => !v); setToolsOpen(false); showChrome(); }, active: musicToolsOpen },
    { Icon: Wrench, label: 'Hands-free', note: 'Pedal · MIDI · gestures', onClick: () => { setHandsFreeOpen((v) => !v); setToolsOpen(false); showChrome(); }, active: handsFreeOpen },
    { Icon: Palette, label: 'Annotate', note: 'Pencil · stamps', onClick: annotateActive ? exitAnnotate : enterAnnotate, active: annotateActive },
    { Icon: Grid3X3, label: 'Page picker', note: 'Thumbnail grid', onClick: () => { setPagesOpen((v) => !v); setToolsOpen(false); showChrome(); }, active: pagesOpen },
    { Icon: SplitSquareHorizontal, label: 'Half-page', note: 'Continuous read', onClick: () => { setDisplayMode((m) => m === 'half' ? 'normal' : 'half'); setToolsOpen(false); showChrome(); }, active: displayMode === 'half' },
    { Icon: BookOpen, label: 'Two-page book', note: 'Side-by-side', onClick: () => { setDisplayMode((m) => m === 'two-page' ? 'normal' : 'two-page'); setToolsOpen(false); showChrome(); }, active: displayMode === 'two-page' },
    { Icon: Rows3, label: 'Reflow', note: 'Teleprompter', onClick: () => { setDisplayMode((m) => m === 'reflow' ? 'normal' : 'reflow'); setToolsOpen(false); showChrome(); }, active: displayMode === 'reflow' },
    { Icon: ChevronRight, label: 'Pagination', note: 'Bottom seek bar', onClick: togglePagination, active: chromeVisible },
    { Icon: Link2, label: 'Add jump', note: 'Tap a spot to drop', onClick: () => { setPlacingJump((v) => !v); setToolsOpen(false); showChrome(); }, active: placingJump },
    { Icon: Shuffle, label: 'Rearrange', note: 'Reorder / dup / skip', onClick: () => { setRearrangeOpen((v) => !v); setToolsOpen(false); showChrome(); }, active: rearrangeOpen },
    { Icon: Radio, label: 'Cue session', note: 'Sync devices', onClick: () => { setCueOpen((v) => !v); setToolsOpen(false); showChrome(); }, active: cueOpen },
  ];

  return (
    <div className="fixed inset-0 bg-background z-40 flex flex-col">
      {/* Top bar — three zones, forScore-style:
            LEFT:   ☰ (content sources drawer) · ◀ Back
            CENTER: Title · Page X of Y · ★ (per-score menu)
            RIGHT:  Annotate · Search · Music Toolkit ▾ · Tools

          The score itself is the whole screen below this 48px strip;
          the bottom seek bar still fades on idle. The hamburger no
          longer opens the Tools sheet — Tools moved to the right; the
          left ☰ now opens a navigation drawer with Library / Setlists
          / GleeWorld Music Library / CPDL so the user can hop between
          content sources from inside the reader. */}
      <div
        className={cn(
          'absolute top-0 inset-x-0 z-[60] px-2 md:px-5 transition-transform duration-200 ease-out',
          // Tap-the-score hides; tap-the-top-edge brings it back.
          // We slide the whole bar up off-screen via translate-y so
          // accidentally tapping on a hidden control isn't possible.
          chromeVisible ? 'translate-y-0' : '-translate-y-full',
        )}
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 6px)' }}
        // Stop clicks inside the top bar from bubbling to the score
        // surface's toggleChrome — pill taps shouldn't hide the bar.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-12 md:h-[3.3rem] flex items-center justify-between gap-2 md:gap-3">
          {/* Exit pill — single back button on the far left. Restored
              after the floating-pill restructure dropped the original
              back arrow; without this the user had no obvious way out
              of the reader. Lives in its own small pill so it doesn't
              crowd the four-icon content-sources cluster next to it. */}
          <div className="flex items-center bg-background/95 backdrop-blur shadow-md rounded-full px-1 py-1 md:px-1.5 md:py-1.5 border border-border/40">
            <PillButton onClick={onBack} label="Exit reader">
              <ArrowLeft className="w-4 h-4" />
            </PillButton>
          </div>
          {/* LEFT pill cluster — quick-access shortcuts. Hamburger opens
              the navigation drawer (Library / Setlists / Services / CPDL).
              The other three (audio companion · library · cloud) duplicate
              the most-used drawer entries so a one-tap path exists from
              the reader. Pill = rounded-full white surface with a soft
              shadow, matching the forScore aesthetic. */}
          <div className="flex items-center gap-0.5 md:gap-1 bg-background/95 backdrop-blur shadow-md rounded-full px-1 py-1 md:px-1.5 md:py-1.5 border border-border/40">
            <PillButton onClick={toggleAudioCompanion} active={audioCompanionOn} label="Audio companion">
              <Music className="w-4 h-4" />
            </PillButton>
            <PillButton onClick={() => setLibraryDrawerOpen(true)} label="Library">
              <BookOpen className="w-4 h-4" />
            </PillButton>
            <PillButton onClick={() => setSetlistsDrawerOpen(true)} label="Setlists">
              <Menu className="w-4 h-4" />
            </PillButton>
            <PillButton onClick={() => setCpdlDrawerOpen(true)} label="CPDL">
              <Cloud className="w-4 h-4" />
            </PillButton>
          </div>

          {/* CENTER pill — grid icon (page picker), title + page count,
              and chevron dropdown for per-score actions. The pill itself
              is a div; each of the three controls is its own button so we
              never end up with nested <button> tags (invalid HTML). */}
          <div className="flex-1 min-w-0 max-w-xl mx-1 h-10 md:h-11 px-1.5 md:px-2 flex items-center gap-1 bg-background/95 backdrop-blur shadow-md rounded-full border border-border/40">
            <button
              type="button"
              onClick={() => { setPagesOpen(true); showChrome(); }}
              className="h-8 w-8 md:h-9 md:w-9 inline-flex items-center justify-center rounded-full hover:bg-muted shrink-0"
              aria-label="Page picker"
            >
              <Grid3X3 className="w-4 h-4 md:w-[1.1rem] md:h-[1.1rem]" />
            </button>
            <div className="flex-1 min-w-0 text-sm md:text-[0.95rem] font-medium truncate text-center flex items-center gap-1.5 justify-center">
              <span className="truncate">{m.title}</span>
              <SyncStatusBadge cueRole={cue.role} />
              <span className="text-muted-foreground tabular-nums shrink-0">, p. {page.current} of {Math.max(1, page.total)}</span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 md:h-9 md:w-9 inline-flex items-center justify-center rounded-full hover:bg-muted shrink-0 text-muted-foreground"
                  aria-label="Score actions"
                >
                  <ChevronDown className="w-4 h-4 md:w-[1.1rem] md:h-[1.1rem]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {truncate(m.title, 32)}
                </DropdownMenuLabel>
                {m.composer && (
                  <div className="px-2 pb-1 text-[11px] text-muted-foreground truncate">{m.composer}</div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/music-library" className="flex items-center gap-2">
                    <Library className="w-4 h-4" /> Show in Library
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAddToSetlistOpen(true)} className="flex items-center gap-2">
                  <ListMusic className="w-4 h-4" /> Add to Setlist…
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="flex items-center gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4" /> Delete…
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* RIGHT pill cluster — annotation, search, metronome,
              tools. Metronome lives directly here (no longer nested in
              a "Music Toolkit" dropdown) to match the forScore design
              the user shared. Briefcase = tools. */}
          <div className="flex items-center gap-0.5 md:gap-1 bg-background/95 backdrop-blur shadow-md rounded-full px-1 py-1 md:px-1.5 md:py-1.5 border border-border/40">
            <PillButton
              onClick={annotateActive ? exitAnnotate : enterAnnotate}
              active={annotateActive}
              label="Annotate"
            >
              <Pencil className="w-4 h-4" />
            </PillButton>
            <PillButton onClick={() => setSearchOpen(true)} label="Search library">
              <SearchIcon className="w-4 h-4" />
            </PillButton>
            <PillButton
              onClick={() => { setMusicToolsOpen(true); showChrome(); }}
              active={musicToolsOpen}
              label="Metronome / Pitch / Tuner"
            >
              <MetronomeIcon className="w-4 h-4" />
            </PillButton>
          {/* Tools — heavier feature drawer (page picker, display modes,
              jumps, rearrange, bookmarks). Same inner sheet as before;
              only its trigger moved into this pill cluster. */}
          <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="h-8 w-8 md:h-9 md:w-9 inline-flex items-center justify-center rounded-full hover:bg-muted text-foreground/80"
                aria-label="Tools"
                title="Tools (pages · display · jumps · bookmarks)"
              >
                <Briefcase className="w-4 h-4 md:w-[1.1rem] md:h-[1.1rem]" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className={device.isIpadLike ? "w-[420px]" : "w-80"}>
              <SheetHeader>
                <SheetTitle>Tools</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-1">
                <ToolButton
                  Icon={Grid3X3}
                  label="Page picker"
                  note="Thumbnail grid of every page"
                  onClick={() => { setPagesOpen(true); setToolsOpen(false); showChrome(); }}
                />
                <ToolButton
                  Icon={SplitSquareHorizontal}
                  label="Half-page mode"
                  note="See bottom of current + top of next at once"
                  onClick={() => { setDisplayMode('half'); setToolsOpen(false); showChrome(); }}
                />
                <ToolButton
                  Icon={BookOpen}
                  label="Two-page book"
                  note={device.isIpadLike ? "Side-by-side pages (great in landscape)" : "Side-by-side pages — best on iPad / desktop"}
                  onClick={() => { setDisplayMode('two-page'); setToolsOpen(false); showChrome(); }}
                />
                <ToolButton
                  Icon={Rows3}
                  label="Reflow"
                  note="Horizontal teleprompter — strip-by-strip scroll"
                  onClick={() => { setDisplayMode('reflow'); setToolsOpen(false); showChrome(); }}
                />
                <ToolButton
                  Icon={Link2}
                  label="Add jump"
                  note="Tap a spot to drop a jump circle (repeats, codas)"
                  onClick={() => { setPlacingJump(true); setToolsOpen(false); showChrome(); }}
                />
                <ToolButton
                  Icon={Shuffle}
                  label="Rearrange pages"
                  note="Reorder, duplicate (for repeats), or skip pages"
                  onClick={() => { setRearrangeOpen(true); setToolsOpen(false); showChrome(); }}
                />
                <div className="pt-3 mt-3 border-t">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-1 mb-2">
                    Bookmarks
                  </div>
                  <BookmarksMenu
                    sheetMusicId={m.id}
                    currentPage={page.current}
                    onJumpToPage={(p) => callTool((h) => h.goToPage(p))}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
          </div>
        </div>
        {/* Audio companion — when toggled on, render it as a thin strip
            BELOW the title bar so the new 3-zone layout above stays
            uncluttered. Previously it shared the title row, which
            crowded everything. */}
        {audioCompanionOn && (
          <div className="px-2 md:px-3 py-1 bg-background/95 backdrop-blur border-b border-border">
            <AudioCompanionControls
              className="bg-transparent border-0 shadow-none rounded-none px-0 py-0"
              musicId={m.id}
              onClose={() => setAudioCompanionOn(false)}
            />
          </div>
        )}
      </div>

      {/* Library popout — the full score library with search + sort,
          opened from the Book icon in the left pill cluster. Tapping a
          row navigates directly to that score in the reader so the user
          can jump between pieces without leaving full-screen view.
          `modal={false}` disables the dark backdrop so the score behind
          stays fully visible while the user is browsing the list. */}
      <Sheet open={libraryDrawerOpen} onOpenChange={setLibraryDrawerOpen} modal={false}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-base">Library</SheetTitle>
          </SheetHeader>
          <LibraryDrawerContent
            currentScoreId={scoreId ?? ''}
            onPick={(id) => {
              setLibraryDrawerOpen(false);
              navigate(`/dashboard/viewer/${id}`);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Setlists popout — opened from the hamburger icon. Lists only
          the user's setlists; expanding one shows the contained scores
          for quick navigation. `modal={false}` keeps the score behind
          unmasked, same as the library popout. */}
      <Sheet open={setlistsDrawerOpen} onOpenChange={setSetlistsDrawerOpen} modal={false}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-base">Setlists</SheetTitle>
          </SheetHeader>
          <SetlistsDrawerContent
            currentScoreId={scoreId ?? ''}
            onPick={(id, sid) => {
              setSetlistsDrawerOpen(false);
              navigate(`/dashboard/viewer/${id}${sid ? `?setlist=${sid}` : ''}`);
            }}
          />
        </SheetContent>
      </Sheet>

      {/* CPDL popout — opened from the cloud icon. Searches the public-
          domain catalog (Choral Public Domain Library titles only) via
          the existing `pd_works_search` RPC, filtered to source = 'cpdl'.
          Each row opens the CPDL source page in a new tab so the user
          can grab the PDF / score without leaving the reader. */}
      <Sheet open={cpdlDrawerOpen} onOpenChange={setCpdlDrawerOpen} modal={false}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b">
            <SheetTitle className="text-base">CPDL Search</SheetTitle>
          </SheetHeader>
          <CpdlDrawerContent />
        </SheetContent>
      </Sheet>

      {/* Library search — quick jump to another score. Open via the
          right-side 🔍 button; submit navigates to the Viewer landing
          with the query prefilled so the user lands on filtered list. */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Search library</DialogTitle>
          </DialogHeader>
          <LibrarySearchForm
            onSubmit={(q) => {
              setSearchOpen(false);
              navigate(`/dashboard/viewer${q ? `?q=${encodeURIComponent(q)}` : ''}`);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add-to-setlist sheet — uses the existing setlist hook. */}
      <AddToSetlistDialog
        open={addToSetlistOpen}
        onOpenChange={setAddToSetlistOpen}
        scoreId={m.id}
        scoreTitle={m.title}
      />

      {/* Delete confirmation — uses the same archive-flag pattern Music
          Library uses (is_archived=true, not a hard DELETE), so the
          score can be recovered from the trash. */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this score?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            “{m.title}” will be archived. You can recover it from your library's archive view.
          </p>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                const { error } = await supabase
                  .from('gw_sheet_music')
                  .update({ is_archived: true })
                  .eq('id', m.id);
                setDeleteConfirmOpen(false);
                if (error) {
                  toast.error('Could not delete score', { description: error.message });
                  return;
                }
                toast.success('Score archived');
                onBack();
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* iPad+ persistent left-column tools nav. The top offset combines
          the safe-area inset and the title bar's inner height in ONE calc
          so the side nav butts right against the title bar with no
          double-counted padding. */}
      {device.isIpadLike && (
        <div
          className="absolute bottom-0 left-0 z-40"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <ViewerSideNav
            collapsed={sideNavCollapsed}
            onToggle={toggleSideNav}
            items={toolItems}
          />
        </div>
      )}

      {/* Score surface — fills the whole screen (top: 0). The title bar is
          absolute z-[60] and floats ON TOP of the page when chrome is shown
          rather than reserving a strip above it, so a fresh score opens
          truly full-bleed with no wasted band under the status bar. */}
      <div
        className={cn(
          'absolute right-0 bottom-0 top-0 z-0 overflow-hidden',
          // Off-white empty-state surface. Was black previously to mirror
          // forScore's dark canvas convention, but the user prefers a
          // soft off-white background that blends with the rest of the
          // light theme so the reader doesn't feel like a different app
          // before a score is chosen.
          hasScore ? '' : 'bg-[#f7f5f0]',
          device.isIpadLike ? (sideNavCollapsed ? 'left-16' : 'left-72') : 'left-0',
        )}
        onClick={toggleChrome}
      >
        <div ref={scoreSurfaceRef} className="w-full h-full relative overflow-hidden">
          {hasScore ? (
            <>
              <PDFViewerWithAnnotations
                ref={pdfRef}
                pdfUrl={m.pdf_url!}
                musicId={m.id}
                musicTitle={m.title}
                chromeless
                onPageChange={(current, total) => setPage({ current, total })}
                className="h-full"
              />
              {/* Tap-to-jump circles on top of the score. */}
              <JumpsOverlay
                sheetMusicId={m.id}
                currentPage={page.current}
                totalPages={page.total}
                surfaceRef={scoreSurfaceRef}
                placementMode={placingJump}
                onPlacementEnd={() => setPlacingJump(false)}
                onJump={(p) => pdfRef.current?.goToPage(p)}
              />
            </>
          ) : (
            // Empty-state surface — black canvas with a quiet hint so
            // the user knows to pick from the library drawer that
            // already auto-opened on the left.
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/60 text-sm">
              Choose a score from the library
            </div>
          )}
        </div>
      </div>

      {/* Top-edge reveal strip — when the chrome is hidden, a 24px-tall
          transparent band sits along the very top of the viewport. Tapping
          it brings the chrome back. Pointer-events are off when chrome is
          visible so it doesn't intercept normal clicks on the bar. */}
      <div
        className={cn(
          'absolute top-0 inset-x-0 z-[65]',
          chromeVisible ? 'pointer-events-none' : 'pointer-events-auto',
        )}
        style={{
          height: 'calc(env(safe-area-inset-top, 0px) + 28px)',
        }}
        onClick={(e) => { e.stopPropagation(); showChrome(); }}
        aria-label="Show top bar"
      />

      {/* Annotation chrome — replaces the bottom bar when in annotation mode. */}
      {annotateActive ? (
        <AnnotationChrome
          chromeVisible={chromeVisible}
          pdfRef={pdfRef}
          onExit={exitAnnotate}
          onShowChrome={showChrome}
        />
      ) : (
        <BottomSeekBar
          chromeVisible={chromeVisible}
          scoreId={m.id}
          page={page}
          onShowChrome={showChrome}
          onSeek={(p) => callTool((h) => h.goToPage(p))}
          onPrev={() => callTool((h) => h.prevPage())}
          onNext={() => callTool((h) => h.nextPage())}
          prevSetlistScore={prevSetlistScore}
          nextSetlistScore={nextSetlistScore}
          onPrevSetlistScore={prevSetlistScore ? () => goSetlistScore(prevSetlistScore.sheet_music_id) : undefined}
          onNextSetlistScore={nextSetlistScore ? () => goSetlistScore(nextSetlistScore.sheet_music_id) : undefined}
        />
      )}

      {/* Page picker dialog */}
      <PagePicker
        open={pagesOpen}
        onOpenChange={setPagesOpen}
        total={page.total}
        current={page.current}
        pdfRef={pdfRef}
        onPick={(p) => {
          if (pdfRef.current) pdfRef.current.goToPage(p);
          setPagesOpen(false);
          showChrome();
        }}
      />

      {/* Music tools sheet — metronome, pitch pipe, tuner. */}
      <Sheet open={musicToolsOpen} onOpenChange={setMusicToolsOpen}>
        <SheetContent side="right" className={device.isIpadLike ? "w-[480px] overflow-y-auto" : "w-96 overflow-y-auto"}>
          <SheetHeader>
            <SheetTitle>Music Tools</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Metronome />
            <PitchPipe />
            <Tuner />
          </div>
        </SheetContent>
      </Sheet>

      {/* Hands-free sheet — Bluetooth pedal, MIDI, face gestures. */}
      <Sheet open={handsFreeOpen} onOpenChange={setHandsFreeOpen}>
        <SheetContent side="right" className={device.isIpadLike ? "w-[480px] overflow-y-auto" : "w-96 overflow-y-auto"}>
          <SheetHeader>
            <SheetTitle>Hands-Free Turning</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <HandsFreeSettingsPanel
              settings={handsFree.settings}
              onChange={handsFree.setSettings}
              midiAvailable={handsFree.midiAvailable}
              midiInputs={handsFree.midiInputs}
              midiLearning={handsFree.midiLearning}
              onStartLearn={handsFree.setMidiLearning}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Half-page split view — overlays the score entirely while active. */}
      {displayMode === 'half' && (
        <HalfPageView
          pdfRef={pdfRef}
          sheetMusicId={m.id}
          currentPage={page.current}
          totalPages={page.total}
          onClose={() => setDisplayMode('normal')}
          onPageChange={(p) => pdfRef.current?.goToPage(p)}
        />
      )}

      {/* Reflow horizontal teleprompter. */}
      {displayMode === 'reflow' && (
        <ReflowView
          pdfRef={pdfRef}
          totalPages={page.total}
          initialPage={page.current}
          onClose={() => setDisplayMode('normal')}
        />
      )}

      {/* Two-page book mode (iPad landscape). */}
      {displayMode === 'two-page' && (
        <TwoPageView
          pdfRef={pdfRef}
          currentPage={page.current}
          totalPages={page.total}
          onClose={() => setDisplayMode('normal')}
          onPageChange={(p) => pdfRef.current?.goToPage(p)}
        />
      )}

      {/* Placement-mode banner so the user knows their next tap places a jump. */}
      {placingJump && (
        <div className="absolute top-12 inset-x-0 z-[55] flex justify-center pointer-events-none">
          <div className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow pointer-events-auto">
            Tap the score to drop a jump · <button className="underline" onClick={() => setPlacingJump(false)}>cancel</button>
          </div>
        </div>
      )}

      {/* Rearrange / clone / delete pages. */}
      <RearrangePagesDialog
        open={rearrangeOpen}
        onOpenChange={setRearrangeOpen}
        sheetMusicId={m.id}
        totalPhysical={page.total}
        pdfRef={pdfRef}
      />

      {/* Cue session sheet — lead / follow page-turn sync. */}
      <Sheet open={cueOpen} onOpenChange={setCueOpen}>
        <SheetContent side="right" className={device.isIpadLike ? "w-[420px]" : "w-96"}>
          <SheetHeader>
            <SheetTitle>Cue Session</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CuePanel
              role={cue.role}
              code={cue.code}
              participants={cue.participants}
              lastError={cue.lastError}
              onStartLeading={cue.startLeading}
              onJoin={cue.joinAsFollower}
              onLeave={cue.leave}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function ToolButton({
  Icon, label, note, onClick,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  note: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-accent/40 text-left"
    >
      <div className="rounded-md bg-muted p-2 shrink-0">
        <Icon className="w-4 h-4 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{note}</div>
      </div>
    </button>
  );
}

function BottomSeekBar({
  chromeVisible, scoreId, page, onShowChrome, onSeek, onPrev, onNext,
  prevSetlistScore, nextSetlistScore, onPrevSetlistScore, onNextSetlistScore,
}: {
  chromeVisible: boolean;
  scoreId: string;
  page: { current: number; total: number };
  onShowChrome: () => void;
  onSeek: (page: number) => void;
  onPrev: () => void;
  onNext: () => void;
  prevSetlistScore: { title: string } | null;
  nextSetlistScore: { title: string } | null;
  onPrevSetlistScore?: () => void;
  onNextSetlistScore?: () => void;
}) {
  const { bookmarks } = useSheetMusicBookmarks(scoreId);
  const total = Math.max(1, page.total);
  return (
    <div
      className={cn(
        'absolute bottom-0 inset-x-0 z-50 transition-transform duration-200 ease-out',
        chromeVisible ? 'translate-y-0' : 'translate-y-full',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      onClick={(e) => { e.stopPropagation(); onShowChrome(); }}
    >
      {/* Setlist stepper row — only when we're inside a setlist. */}
      {(prevSetlistScore || nextSetlistScore) && (
        <div className="px-3 py-1.5 bg-muted/60 backdrop-blur border-t border-border flex items-center gap-2 text-xs">
          <Button
            size="sm"
            variant="ghost"
            onClick={onPrevSetlistScore}
            disabled={!prevSetlistScore}
            className="h-7 px-2 text-xs"
          >
            <ChevronLeft className="w-3 h-3 mr-1" />
            {prevSetlistScore ? `Prev: ${truncate(prevSetlistScore.title, 22)}` : '—'}
          </Button>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="ghost"
            onClick={onNextSetlistScore}
            disabled={!nextSetlistScore}
            className="h-7 px-2 text-xs"
          >
            {nextSetlistScore ? `Next: ${truncate(nextSetlistScore.title, 22)}` : '—'}
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}
      <div className="px-3 py-2 bg-background/95 backdrop-blur border-t border-border flex items-center gap-3">
        <div className="relative">
          <Bookmark className="w-4 h-4 text-muted-foreground" />
          {bookmarks.length > 0 && (
            <span className="absolute -top-1 -right-2 bg-primary text-primary-foreground text-[10px] rounded-full px-1 min-w-[16px] h-[16px] flex items-center justify-center font-semibold">
              {bookmarks.length}
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={onPrev} disabled={page.current <= 1}>
          ◀
        </Button>
        <div className="flex-1 flex items-center gap-3">
          <Slider
            value={[page.current]}
            min={1}
            max={total}
            step={1}
            onValueChange={(v) => onSeek(v[0])}
            className="flex-1"
          />
          <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
            {page.current} / {total}
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={onNext} disabled={page.current >= total}>
          ▶
        </Button>
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function AnnotationChrome({
  chromeVisible, pdfRef, onExit, onShowChrome,
}: {
  chromeVisible: boolean;
  pdfRef: React.MutableRefObject<PDFViewerHandle | null>;
  onExit: () => void;
  onShowChrome: () => void;
}) {
  // We poll the PDFViewer's annotation state at a low frequency (only while
  // chrome is up) so the toolbar reflects which tool is active without
  // forcing PDFViewer to bubble every state change via callback.
  const [state, setState] = useState({ tool: 'draw' as 'select' | 'draw' | 'erase' | 'stamp', color: '#ff0000', stamp: '𝑓', hasUnsaved: false });
  const [layersTick, setLayersTick] = useState(0);
  useEffect(() => {
    if (!chromeVisible) return;
    const tick = () => {
      const h = pdfRef.current;
      if (h) setState(h.getAnnotationState());
    };
    tick();
    const id = window.setInterval(tick, 300);
    return () => window.clearInterval(id);
  }, [chromeVisible, pdfRef]);

  const setTool = (t: typeof state.tool) => {
    pdfRef.current?.setAnnotationTool(t);
    setState((s) => ({ ...s, tool: t }));
    onShowChrome();
  };
  const setColor = (c: string) => {
    pdfRef.current?.setAnnotationColor(c);
    setState((s) => ({ ...s, color: c }));
  };
  const setStamp = (g: string) => {
    pdfRef.current?.setAnnotationStamp(g);
    pdfRef.current?.setAnnotationTool('stamp');
    setState((s) => ({ ...s, stamp: g, tool: 'stamp' }));
  };

  // Floating-card position (top-left corner). Default opens near the top
  // center of the viewport, just below the top bar. The user drags from
  // the grip handle to move it anywhere on screen; we clamp to keep at
  // least 40px visible on every edge so it can't get lost off-screen.
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    return { x: Math.max(20, (w - 560) / 2), y: 72 };
  });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);
  const onDragStart = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
  };
  const onDragMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const nx = Math.min(w - 40, Math.max(-200, e.clientX - dragRef.current.dx));
    const ny = Math.min(h - 40, Math.max(0, e.clientY - dragRef.current.dy));
    setPos({ x: nx, y: ny });
  };
  const onDragEnd = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
  };

  return (
    <div
      className={cn(
        'fixed z-[70] transition-opacity duration-150',
        chromeVisible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
      style={{ left: pos.x, top: pos.y }}
      onClick={(e) => { e.stopPropagation(); onShowChrome(); }}
    >
      {/* Drag handle — grippy strip at the top of the floating card.
          Touch-friendly height; cursor-grab signals the affordance on
          desktop. Pointer events keep it working on mouse, pen, AND
          touch with the same code path. */}
      <div
        className="px-3 h-6 flex items-center justify-center bg-muted/80 backdrop-blur rounded-t-lg border border-b-0 border-border cursor-grab active:cursor-grabbing touch-none select-none"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        title="Drag to move"
      >
        <div className="w-10 h-1 rounded-full bg-foreground/30" />
      </div>
      {/* Compact card — tightened paddings + button surfaces so the
          panel takes less screen real-estate. Font sizes are unchanged
          (text-sm on text buttons, text-base on stamp glyphs) per the
          user's spec; only the container chrome got shrunk. */}
      <div className="px-1.5 py-1 bg-background/95 backdrop-blur border border-t-0 border-border rounded-b-lg shadow-xl flex items-center gap-1 flex-wrap max-w-[92vw]">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 px-1.5" title="Annotation layers">
              <LayersIcon className="w-3.5 h-3.5 mr-1" /> Layers
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72 p-3">
            <LayersPanel
              pdfRef={pdfRef}
              refreshSignal={layersTick}
              onChanged={() => setLayersTick((t) => t + 1)}
            />
          </PopoverContent>
        </Popover>
        <Button size="sm" variant="outline" onClick={onExit} className="h-7 px-1.5">
          <X className="w-3.5 h-3.5 mr-1" /> Exit
        </Button>
        <Button
          size="sm"
          variant={state.hasUnsaved ? 'default' : 'outline'}
          onClick={() => pdfRef.current?.saveAnnotations()}
          disabled={!state.hasUnsaved}
          className="h-7 px-1.5"
        >
          <Save className="w-3.5 h-3.5 mr-1" /> Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => pdfRef.current?.undoAnnotation()}
          className="h-7 w-7 p-0"
          title="Undo"
        >
          <Undo className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => pdfRef.current?.clearAnnotations()}
          className="h-7 w-7 p-0"
          title="Clear"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
        <div className="h-4 w-px bg-border mx-0.5" />
        <Button
          size="sm"
          variant={state.tool === 'select' ? 'default' : 'outline'}
          onClick={() => setTool('select')}
          className="h-7 w-7 p-0"
          title="Select / pan"
        >
          <MousePointer className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant={state.tool === 'draw' ? 'default' : 'outline'}
          onClick={() => setTool('draw')}
          className="h-7 w-7 p-0"
          title="Draw"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant={state.tool === 'erase' ? 'default' : 'outline'}
          onClick={() => setTool('erase')}
          className="h-7 w-7 p-0"
          title="Erase"
        >
          <Eraser className="w-3.5 h-3.5" />
        </Button>
        {/* Quick stamp row — text-base font-size kept, only the surface
            (height + horizontal padding) got tighter. */}
        <div className="flex items-center gap-0">
          {STAMP_OPTIONS.flatMap((g) => g.glyphs).slice(0, 8).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setStamp(g)}
              className={cn(
                'h-7 px-1 text-base italic font-serif font-bold rounded hover:bg-accent',
                state.stamp === g && state.tool === 'stamp' && 'bg-accent ring-1 ring-primary',
              )}
            >
              {g}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-0.5">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                'h-5 w-5 rounded-full border-2',
                state.color === c ? 'border-foreground' : 'border-transparent',
              )}
              style={{ backgroundColor: c }}
              aria-label={`Brush color ${c}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PagePicker({
  open, onOpenChange, total, current, pdfRef, onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  total: number;
  current: number;
  pdfRef: React.MutableRefObject<PDFViewerHandle | null>;
  onPick: (page: number) => void;
}) {
  const pages = useMemo(
    () => Array.from({ length: total }, (_, i) => i + 1),
    [total],
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-base">Pages</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {pages.map((p) => (
              <PageThumbnail
                key={p}
                page={p}
                isCurrent={p === current}
                pdfRef={pdfRef}
                onPick={() => onPick(p)}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PageThumbnail({
  page, isCurrent, pdfRef, onPick,
}: {
  page: number;
  isCurrent: boolean;
  pdfRef: React.MutableRefObject<PDFViewerHandle | null>;
  onPick: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const h = pdfRef.current;
      if (!h) return;
      // Small wait before requesting — the PDFViewer may not have set up
      // renderPageToOffscreen yet on first mount. Retry once after 250ms.
      let url = await h.renderThumbnail(page, 0.22);
      if (!url) {
        await new Promise((r) => setTimeout(r, 250));
        url = await pdfRef.current?.renderThumbnail(page, 0.22) ?? null;
      }
      if (cancelled) return;
      if (url) setSrc(url);
      else setErrored(true);
    })();
    return () => { cancelled = true; };
  }, [page, pdfRef]);
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'group relative aspect-[3/4] rounded border bg-card overflow-hidden flex items-center justify-center',
        isCurrent ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-primary/50',
      )}
    >
      {src ? (
        <img src={src} alt={`Page ${page}`} className="w-full h-full object-contain" />
      ) : errored ? (
        <span className="text-xs text-muted-foreground">—</span>
      ) : (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      )}
      <span className="absolute bottom-1 right-1 text-[10px] tabular-nums bg-background/80 backdrop-blur px-1 rounded">
        {page}
      </span>
    </button>
  );
}

// Pill-cluster icon button. Renders an inline `<button>` by default, or
// wraps a `<Link>` (or any single child) when `asChild` is set. The pill
// visual is supplied by the cluster wrapper — this control only handles
// the hover/active/sizing of the 8×8 hit target inside.
function PillButton({
  children, onClick, active, asChild, label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  asChild?: boolean;
  label: string;
}) {
  // 10% larger hit target + icon on md+ matches the user's request for
  // a more comfortable desktop tap surface without overwhelming mobile.
  const classes = cn(
    'h-8 w-8 md:h-9 md:w-9 inline-flex items-center justify-center rounded-full transition-colors',
    '[&_svg]:w-4 [&_svg]:h-4 md:[&_svg]:w-[1.1rem] md:[&_svg]:h-[1.1rem]',
    active ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-muted',
  );
  if (asChild) {
    // Caller passes a single child (typically <Link>) that already
    // handles its own click; we just style it consistently.
    return (
      <span className={classes} title={label} aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={classes}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}

// Nav drawer row — icon + label + subtitle, used in the left drawer
// to surface the content sources (Library, Setlists, GleeWorld Music
// Library, CPDL). Closes the drawer after navigation so the user lands
// directly on the destination page.
function NavDrawerLink({
  to, Icon, label, note, onNavigate,
}: {
  to: string;
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  note: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className="w-full flex items-start gap-3 p-2.5 rounded-md hover:bg-accent/40"
    >
      <div className="rounded-md bg-muted p-2 shrink-0">
        <Icon className="w-4 h-4 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{note}</div>
      </div>
    </Link>
  );
}

// Library search modal. Submitting bounces to the Viewer landing with
// the query in `?q=…`. Kept minimal — the landing already has a search
// box that consumes the same parameter.
function LibrarySearchForm({ onSubmit }: { onSubmit: (q: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(value.trim()); }}
      className="flex items-center gap-2"
    >
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search title, composer, tag…"
        className="flex-1"
      />
      <Button type="submit" size="sm">Search</Button>
    </form>
  );
}

// Library popout — full sortable + filterable score list inside a Sheet.
// Pulls from `gw_sheet_music` (active scores with a pdf_url), groups by
// the chosen sort key, and highlights the row matching the currently
// open score so the user can see where they are at a glance.
function LibraryDrawerContent({
  currentScoreId, onPick,
}: {
  currentScoreId: string;
  onPick: (scoreId: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'title' | 'composer' | 'recent'>('title');
  const { data: rows = [], isLoading } = useQuery<Array<{ id: string; title: string; composer: string | null; pdf_url: string | null; storage_path: string | null; storage_bucket: string | null; created_at: string | null }>>({
    queryKey: ['viewer-library-drawer'],
    queryFn: async () => {
      const { data } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, pdf_url, storage_path, storage_bucket, created_at')
        .eq('is_archived', false)
        .order('title')
        .limit(1000);
      return data ?? [];
    },
    staleTime: 60_000,
  });
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Same visibility rule as ViewerPage: a row is openable if either
    // the legacy pdf_url is set or it's stored via storage_bucket+path.
    let list = rows.filter((r) => !!(r.pdf_url || r.storage_path));
    if (q) {
      list = list.filter((r) =>
        r.title?.toLowerCase().includes(q) ||
        r.composer?.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    sorted.sort((a, b) => {
      if (sort === 'composer') return (a.composer ?? 'zzz').localeCompare(b.composer ?? 'zzz');
      if (sort === 'recent') return (b.created_at ?? '').localeCompare(a.created_at ?? '');
      return (a.title ?? '').localeCompare(b.title ?? '');
    });
    return sorted;
  }, [rows, search, sort]);
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2 border-b space-y-2">
        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, composer…"
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-1 text-xs">
          {(['title', 'composer', 'recent'] as const).map((k) => (
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
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading library…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground px-4">
            {search ? 'No scores match your search.' : 'No scores in your library yet.'}
          </div>
        ) : (
          <ul className="divide-y">
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onPick(r.id)}
                  className={cn(
                    'w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-accent/40 transition-colors',
                    r.id === currentScoreId && 'bg-primary/10',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    {r.composer && (
                      <div className="text-[11px] text-muted-foreground truncate">{r.composer}</div>
                    )}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// CPDL search popout — calls the existing `pd_works_search` RPC and
// filters client-side to source = 'cpdl' so only Choral Public Domain
// Library titles surface. Each row opens the source page in a new tab
// (the simplest path to grabbing the PDF/score without leaving the
// reader). The query is debounced 300ms to match the existing
// PublicDomainSearch behavior — no RPC fires until the user types.
function CpdlDrawerContent() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(id);
  }, [query]);
  type Row = {
    id: string;
    source: string;
    source_id: string;
    title: string;
    composer: string | null;
    voicing: string | null;
    language: string | null;
    source_page_url: string;
  };
  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ['cpdl-drawer-search', debounced],
    enabled: debounced.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pd_works_search', {
        p_query: debounced || null,
        p_voicing: null,
        p_language: null,
        p_composer: null,
        p_limit: 50,
        p_offset: 0,
      });
      if (error) throw error;
      const all = (data ?? []) as Row[];
      return all.filter((r) => r.source === 'cpdl');
    },
  });
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <SearchIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search CPDL title or composer…"
            className="pl-8 h-8 text-sm"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-0.5">
          CPDL is share-alike licensed — credit the editor when using a score.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {debounced.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground px-4">
            Start typing to search the Choral Public Domain Library.
          </div>
        ) : isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Searching CPDL…
          </div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground px-4">
            No CPDL entries match “{debounced}”.
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.id}>
                <a
                  href={r.source_page_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 hover:bg-accent/40 transition-colors"
                >
                  <div className="text-sm font-medium truncate">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {r.composer ?? 'Unknown composer'}
                    {r.voicing && <> · {r.voicing}</>}
                    {r.language && <> · {r.language}</>}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Setlists popout — lists every setlist the user owns. Tap a row to
// expand and reveal its scores; tap a score to navigate into it with the
// setlist context preserved (?setlist=… so the bottom bar still shows
// prev/next-score stepping).
function SetlistsDrawerContent({
  currentScoreId, onPick,
}: {
  currentScoreId: string;
  onPick: (scoreId: string, setlistId?: string) => void;
}) {
  const { data: setlists = [], isLoading } = useViewerSetlists();
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading setlists…
          </div>
        ) : setlists.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground px-4">
            No setlists yet. Build one from Music Library → Setlists.
          </div>
        ) : (
          <ul className="divide-y">
            {setlists.map((s) => (
              <SetlistDrawerRow
                key={s.id}
                setlist={s}
                expanded={expanded === s.id}
                currentScoreId={currentScoreId}
                onToggle={() => setExpanded((cur) => (cur === s.id ? null : s.id))}
                onPick={(scoreId) => onPick(scoreId, s.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SetlistDrawerRow({
  setlist, expanded, currentScoreId, onToggle, onPick,
}: {
  setlist: { id: string; title: string; concert_name: string; item_count: number };
  expanded: boolean;
  currentScoreId: string;
  onToggle: () => void;
  onPick: (scoreId: string) => void;
}) {
  const { data: scores = [], isLoading } = useSetlistScores(expanded ? setlist.id : undefined);
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-accent/40"
      >
        <ListMusic className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{setlist.title}</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {setlist.concert_name} · {setlist.item_count} score{setlist.item_count === 1 ? '' : 's'}
          </div>
        </div>
        <ChevronRight className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
      </button>
      {expanded && (
        <div className="bg-muted/30">
          {isLoading ? (
            <div className="py-3 text-xs text-muted-foreground text-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" /> Loading…
            </div>
          ) : scores.length === 0 ? (
            <div className="py-3 text-xs text-muted-foreground text-center italic">Empty.</div>
          ) : (
            scores.map((sc) => {
              const openable = hasSource(sc);
              return (
              <button
                key={sc.id}
                type="button"
                disabled={!openable}
                onClick={() => openable && onPick(sc.sheet_music_id)}
                className={cn(
                  'w-full px-5 py-1.5 text-left flex items-center gap-2 text-xs hover:bg-accent/40',
                  !openable && 'opacity-50 cursor-not-allowed',
                  sc.sheet_music_id === currentScoreId && 'bg-primary/10',
                )}
              >
                <span className="tabular-nums text-muted-foreground w-5">{sc.order_index + 1}.</span>
                <span className="flex-1 truncate">{sc.title}</span>
              </button>
              );
            })
          )}
        </div>
      )}
    </li>
  );
}

// Add-to-setlist dialog — pulls the user's setlists, lets them tap one,
// and routes the row through useSetlists.addToSetlist. We use a Dialog
// (not a Sheet) so it pops in front of the score regardless of how the
// reader chrome is configured.
function AddToSetlistDialog({
  open, onOpenChange, scoreId, scoreTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scoreId: string;
  scoreTitle: string;
}) {
  const { setlists, loading, addToSetlist } = useSetlists();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add “{truncate(scoreTitle, 28)}” to setlist</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading setlists…
          </div>
        ) : setlists.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No setlists yet. Create one from the Music Library page.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto divide-y border rounded-md">
            {setlists.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={async () => {
                  const ok = await addToSetlist(s.id, scoreId);
                  if (ok) {
                    toast.success(`Added to ${s.name ?? 'setlist'}`);
                    onOpenChange(false);
                  }
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-accent/40"
              >
                <div className="text-sm font-medium truncate">{s.name ?? 'Untitled setlist'}</div>
                {s.description && (
                  <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
