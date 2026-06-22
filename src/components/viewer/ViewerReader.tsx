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
} from 'lucide-react';
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
import { useSetlistScores } from '@/hooks/useViewerSetlists';
import { useRecordScoreOpen } from '@/hooks/useRecordScoreOpen';
import { useNavigate } from 'react-router-dom';

interface ViewerReaderProps {
  scoreId: string;
  setlistId?: string;
  onBack: () => void;
}

interface ScoreMeta {
  id: string;
  title: string;
  composer: string | null;
  pdf_url: string | null;
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
      const { data } = await supabase
        .from('gw_sheet_music')
        .select('id, title, composer, pdf_url')
        .eq('id', scoreId)
        .maybeSingle();
      return (data as ScoreMeta) ?? null;
    },
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

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!meta || !meta.pdf_url) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Score not found or has no PDF.</p>
        <Button size="sm" variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Viewer
        </Button>
      </div>
    );
  }

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

  // Toggle handlers — read the PDFViewer's current state, flip it, then
  // mirror back so the side nav indicator updates immediately.
  const toggleAudioCompanion = () => {
    callTool((h) => h.toggleAudioCompanion());
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
      {/* Top bar — always visible, forScore-style. The menu (☰) button is
          the always-available way back to the library + setlists + tools,
          so the user can never feel trapped in the reader regardless of
          how the bottom chrome is behaving. Only the seek bar fades. */}
      <div
        className="absolute top-0 inset-x-0 z-[60]"
        style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}
      >
        {/* Use both device detection AND CSS breakpoints — Safari on
            wide displays + iPad simulators that fall back to Mac UA
            should still render iPad-sized icons. */}
        {/* Compact 48px title bar (matches the score's top offset calc). */}
        <div className="h-12 px-2 md:px-3 flex items-center gap-2 bg-background/95 backdrop-blur border-b border-border">
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 md:h-11 md:w-11"
            onClick={onBack}
            aria-label="Back to Viewer"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
          {/* Title block — pushed LEFT (no longer centered) so the audio
              companion can share the same header row to its right. The
              title still truncates if it gets too long for the available
              space alongside the companion pill. */}
          <div className="min-w-0 text-left max-w-[44%]">
            <div className="text-sm md:text-base lg:text-lg font-semibold truncate flex items-center gap-2">
              <span className="truncate">{meta.title}</span>
              <SyncStatusBadge cueRole={cue.role} />
            </div>
            <div className="text-[11px] md:text-xs text-muted-foreground truncate">
              {meta.composer ?? ''}
              {setlistId && setlistIndex >= 0 && (
                <span className="ml-2">
                  · Setlist {setlistIndex + 1} of {setlistScores.length}
                </span>
              )}
              {cue.role && cue.code && (
                <span className="ml-2 inline-flex items-center gap-1 text-primary">
                  <Radio className="w-3 h-3" /> {cue.role === 'leader' ? 'Leading' : 'Following'} · {cue.code}
                </span>
              )}
            </div>
          </div>

          {/* Audio companion lives inline in the header now (was a
              separate strip below the title bar). Only renders when the
              user has it toggled on. Centered flexible space fills the
              gap between title + right-hand controls so the pill always
              has room to grow. */}
          {/* Audio companion always lives in the title bar so the
              conductor never has to hunt for transport controls. The
              `inline` className strips the pill's own card chrome
              (bg, border, shadow, rounded, padding) so the controls
              merge with the title bar's height instead of floating
              over it as a separate widget. */}
          <div className="flex-1 min-w-0 flex justify-center relative z-[70] h-full">
            <AudioCompanionControls
              className="bg-transparent border-0 shadow-none rounded-none px-0 py-0 h-full"
              musicId={meta.id}
              onClose={() => { setAudioCompanionOn(false); callTool((h) => h.toggleAudioCompanion()); }}
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 md:h-11 md:w-11"
            onClick={() => { setPagesOpen(true); showChrome(); }}
            aria-label="Page picker"
          >
            <Grid3X3 className="w-5 h-5 md:w-6 md:h-6" />
          </Button>
          <Sheet open={toolsOpen} onOpenChange={setToolsOpen}>
            {/* On iPad+ the persistent left side-nav replaces this menu —
                hide the hamburger so the toolbar isn't redundant. */}
            {!device.isIpadLike && (
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-10 w-10 md:h-11 md:w-11"
                  aria-label="Tools"
                >
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
            )}
            <SheetContent side="right" className={device.isIpadLike ? "w-[420px]" : "w-80"}>
              <SheetHeader>
                <SheetTitle>Tools</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-1">
                <ToolButton
                  Icon={Music}
                  label="Audio companion"
                  note="MP3 or YouTube playback alongside the score"
                  onClick={() => callTool((h) => h.openAudioCompanion())}
                />
                <ToolButton
                  Icon={PianoIcon}
                  label="Piano"
                  note="Toggle dockable on-screen keyboard"
                  onClick={() => callTool((h) => h.togglePiano())}
                />
                <ToolButton
                  Icon={Wrench}
                  label="Music tools"
                  note="Metronome · Pitch Pipe · Guitar Tuner"
                  onClick={() => { setMusicToolsOpen(true); setToolsOpen(false); showChrome(); }}
                />
                <ToolButton
                  Icon={Wrench}
                  label="Hands-free"
                  note="Bluetooth pedal · MIDI · face gestures"
                  onClick={() => { setHandsFreeOpen(true); setToolsOpen(false); showChrome(); }}
                />
                <ToolButton
                  Icon={Palette}
                  label="Annotate"
                  note="Pencil · eraser · stamps"
                  onClick={enterAnnotate}
                />
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
                <ToolButton
                  Icon={Radio}
                  label="Cue session"
                  note="Sync page turns across multiple devices"
                  onClick={() => { setCueOpen(true); setToolsOpen(false); showChrome(); }}
                />
                <div className="pt-3 mt-3 border-t">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-1 mb-2">
                    Bookmarks
                  </div>
                  <BookmarksMenu
                    sheetMusicId={meta.id}
                    currentPage={page.current}
                    onJumpToPage={(p) => callTool((h) => h.goToPage(p))}
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

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

      {/* Score surface — sits flush against the title bar bottom. The top
          edge is calc(safe-area + title bar height) so we don't accumulate
          two safe-area paddings the way separate top + paddingTop did. */}
      <div
        className={cn(
          'absolute right-0 bottom-0 z-0 overflow-hidden',
          device.isIpadLike ? (sideNavCollapsed ? 'left-16' : 'left-72') : 'left-0',
        )}
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 3rem)' }}
        onClick={toggleChrome}
      >
        <div ref={scoreSurfaceRef} className="w-full h-full relative overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <PDFViewerWithAnnotations
            ref={pdfRef}
            pdfUrl={meta.pdf_url}
            musicId={meta.id}
            musicTitle={meta.title}
            chromeless
            onPageChange={(current, total) => setPage({ current, total })}
            className="h-full"
          />
          {/* Tap-to-jump circles on top of the score. */}
          <JumpsOverlay
            sheetMusicId={meta.id}
            currentPage={page.current}
            totalPages={page.total}
            surfaceRef={scoreSurfaceRef}
            placementMode={placingJump}
            onPlacementEnd={() => setPlacingJump(false)}
            onJump={(p) => pdfRef.current?.goToPage(p)}
          />
        </div>
      </div>

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
          scoreId={meta.id}
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
          sheetMusicId={meta.id}
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
        sheetMusicId={meta.id}
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

  return (
    <div
      className={cn(
        'absolute bottom-0 inset-x-0 z-50 transition-transform duration-200 ease-out',
        chromeVisible ? 'translate-y-0' : 'translate-y-full',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
      onClick={(e) => { e.stopPropagation(); onShowChrome(); }}
    >
      <div className="px-3 py-2 bg-background/95 backdrop-blur border-t border-border flex items-center gap-2 flex-wrap">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 px-2" title="Annotation layers">
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
        <Button size="sm" variant="outline" onClick={onExit} className="h-8 px-2">
          <X className="w-3.5 h-3.5 mr-1" /> Exit
        </Button>
        <Button
          size="sm"
          variant={state.hasUnsaved ? 'default' : 'outline'}
          onClick={() => pdfRef.current?.saveAnnotations()}
          disabled={!state.hasUnsaved}
          className="h-8 px-2"
        >
          <Save className="w-3.5 h-3.5 mr-1" /> Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => pdfRef.current?.undoAnnotation()}
          className="h-8 w-8 p-0"
          title="Undo"
        >
          <Undo className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => pdfRef.current?.clearAnnotations()}
          className="h-8 w-8 p-0"
          title="Clear"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
        <div className="h-5 w-px bg-border mx-1" />
        <Button
          size="sm"
          variant={state.tool === 'select' ? 'default' : 'outline'}
          onClick={() => setTool('select')}
          className="h-8 w-8 p-0"
          title="Select / pan"
        >
          <MousePointer className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant={state.tool === 'draw' ? 'default' : 'outline'}
          onClick={() => setTool('draw')}
          className="h-8 w-8 p-0"
          title="Draw"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="sm"
          variant={state.tool === 'erase' ? 'default' : 'outline'}
          onClick={() => setTool('erase')}
          className="h-8 w-8 p-0"
          title="Erase"
        >
          <Eraser className="w-3.5 h-3.5" />
        </Button>
        {/* Quick stamp row — tap a glyph to arm stamp tool with that glyph. */}
        <div className="flex items-center gap-0.5">
          {STAMP_OPTIONS.flatMap((g) => g.glyphs).slice(0, 8).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setStamp(g)}
              className={cn(
                'h-8 px-1.5 text-base italic font-serif font-bold rounded hover:bg-accent',
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
                'h-7 w-7 rounded-full border-2',
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
