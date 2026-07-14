import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { Viewer, Worker, ScrollMode } from '@react-pdf-viewer/core';

import '@react-pdf-viewer/core/lib/styles/index.css';

import { scrollModePlugin } from '@react-pdf-viewer/scroll-mode';

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pencil, 
  Eraser, 
  Save, 
  Trash2, 
  Undo,
  MousePointer,
  Loader2,
  Palette,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Share2,
  Music,
  Piano
} from "lucide-react";
import { DockablePiano } from '@/components/music-library/DockablePiano';
import { AudioCompanionControls } from '@/components/music-library/AudioCompanionControls';
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSheetMusicUrl } from '@/hooks/useSheetMusicUrl';
import { useSheetMusicAnnotations } from '@/hooks/useSheetMusicAnnotations';
import { useAnnotationLayers } from '@/hooks/useAnnotationLayers';
import { useSheetMusicAudio } from '@/hooks/useSheetMusicAudio';
import { useSheetMusicTracks } from '@/hooks/useSheetMusicTracks';
import { useAudioCompanion } from '@/contexts/AudioCompanionContext';
import { cn } from '@/lib/utils';
import { AnnotationShareButton } from '@/components/music-library/AnnotationShareButton';
import { BookmarksMenu } from '@/components/music-library/BookmarksMenu';
import { STAMP_CATEGORIES } from '@/lib/smuflStamps';
import * as pdfjsLib from 'pdfjs-dist';
// Value-import (not side-effect) so Vite cannot tree-shake the worker setup.
import { PDF_WORKER_READY } from '@/lib/pdfWorker';
void PDF_WORKER_READY;

interface PDFViewerWithAnnotationsProps {
  pdfUrl: string | null;
  musicId?: string;
  musicTitle?: string;
  className?: string;
  startInAnnotationMode?: boolean;
  /** When true, toolbars are repositioned to avoid overlapping the parent mobile header */
  isInMobileViewer?: boolean;
  /** Optional extra toolbar actions (rendered inside the auto-hiding toolbar on mobile) */
  toolbarActions?: React.ReactNode;
  /** When true, suppresses the viewer's own top toolbar + bottom pagination
   *  pill so a parent shell (e.g. the Viewer module's tap-to-reveal chrome)
   *  can own those affordances and drive them via the ref. */
  chromeless?: boolean;
  /** Fires whenever the page index or page count changes. Used by the
   *  Viewer module's bottom seek bar to mirror the current location. */
  onPageChange?: (page: number, totalPages: number) => void;
}
export interface PDFViewerHandle {
  promptToSaveIfDirty: () => Promise<boolean>;
  toggleToolbar: () => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  openAudioCompanion: () => void;
  toggleAudioCompanion: () => void;
  togglePiano: () => void;
  isAudioCompanionOpen: () => boolean;
  isPianoOpen: () => boolean;
  enterAnnotationMode: () => void;
  /** Returns the current annotation tool state for a parent chrome shell
   *  that wants to render its own toolbar (see ViewerReader). */
  exitAnnotationMode: () => void;
  /** Renders a single PDF page to a small data URL for thumbnails. Returns
   *  null until the document is loaded. */
  renderThumbnail: (pageNum: number, scale?: number) => Promise<string | null>;
  /** Annotation control surface for an external chrome. */
  setAnnotationTool: (tool: 'select' | 'draw' | 'erase' | 'stamp') => void;
  setAnnotationColor: (color: string) => void;
  setAnnotationStamp: (stamp: string, font?: string) => void;
  setAlwaysOnPencil: (v: boolean) => void;
  getAlwaysOnPencil: () => boolean;
  /** Annotation layer controls — drive a layers panel in the parent shell. */
  getLayers: () => Array<{ id: string; name: string; color: string; is_visible: boolean }>;
  getCurrentLayerId: () => string | null;
  setCurrentLayerId: (id: string | null) => void;
  addLayer: (name: string, color?: string) => Promise<{ id: string } | null>;
  toggleLayer: (id: string, visible: boolean) => void;
  deleteLayerById: (id: string) => void;
  saveAnnotations: () => Promise<boolean>;
  undoAnnotation: () => void;
  clearAnnotations: () => void;
  getAnnotationState: () => {
    tool: 'select' | 'draw' | 'erase' | 'stamp';
    color: string;
    stamp: string;
    hasUnsaved: boolean;
    pathsCount: number;
  };
}

export const PDFViewerWithAnnotations = forwardRef<PDFViewerHandle, PDFViewerWithAnnotationsProps>(({
  pdfUrl,
  musicId,
  musicTitle,
  className = "",
  startInAnnotationMode = false,
  isInMobileViewer = false,
  toolbarActions,
  chromeless = false,
  onPageChange,
}: PDFViewerWithAnnotationsProps, ref) => {
  const { user } = useAuth();
  const { signedUrl, loading: urlLoading, error: urlError } = useSheetMusicUrl(pdfUrl);
  const {
    annotations,
    loading: annotationsLoading,
    saveAnnotation,
    fetchAnnotations
  } = useSheetMusicAnnotations(musicId);
  // Annotation layers: each annotation can belong to a layer (Fingerings,
  // Bowing, Conductor notes…). Hidden layers don't render. New strokes
  // are saved under `currentLayerId` if set.
  const { layers: annotationLayers, addLayer, toggleLayerVisible, deleteLayer } = useAnnotationLayers(musicId);
  const [currentLayerId, setCurrentLayerId] = useState<string | null>(null);
  const visibleLayerIds = useMemo(
    () => new Set(annotationLayers.filter((l) => l.is_visible).map((l) => l.id)),
    [annotationLayers],
  );
  const { audioData } = useSheetMusicAudio(musicId);
  const { tracks: audioTracks, defaultTrack: defaultAudioTrack } = useSheetMusicTracks(musicId);
  const { loadUrl, loadYouTube, loadAppleMusic, audioSource, stop: stopAudio, closeYouTube } = useAudioCompanion();
  
  // Initialize the default layout plugin
const scrollModePluginInstance = scrollModePlugin();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState<"select" | "draw" | "erase" | "stamp">("select");
  // Currently armed stamp glyph. Picking a stamp also sets activeTool=stamp;
  // the next click on the page deposits it. Italic dynamics + plain music
  // symbols cover the most-used marks without needing a SMuFL font on device.
  const [selectedStamp, setSelectedStamp] = useState<string>('𝑓');
  // Font family for stamps. Bravura is a SMuFL music font — used for the
  // expanded ~400 symbol palette. Italic serif stays for plain dynamics.
  const [selectedStampFont, setSelectedStampFont] = useState<string>('serif');
  // Always-on Apple Pencil: when true, pen input on the score surface
  // immediately enters annotation/draw mode without a manual toggle.
  // Persisted to localStorage so a Pencil user only flips it once.
  const [alwaysOnPencil, setAlwaysOnPencilState] = useState<boolean>(() => {
    try { return localStorage.getItem('gw-always-on-pencil') === '1'; } catch { return false; }
  });
  // Pencil hover preview — Apple Pencil 2/3 emits pointermove with no
  // buttons pressed when the stylus is within a few mm of the screen.
  // We render a small brush-size circle that tracks the hover so the
  // user knows where their next stroke will land before they touch down.
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; size: number } | null>(null);
  const setAlwaysOnPencil = useCallback((v: boolean) => {
    setAlwaysOnPencilState(v);
    try { localStorage.setItem('gw-always-on-pencil', v ? '1' : '0'); } catch {}
  }, []);
  const [brushSize, setBrushSize] = useState([3]);
  const [brushColor, setBrushColor] = useState("#ff0000");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paths, setPaths] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState<any>(null);
  const [hasAnnotations, setHasAnnotations] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [showAudioCompanion, setShowAudioCompanion] = useState(false);
  const [showPiano, setShowPiano] = useState(false);
  
  // Touch navigation state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number; time: number } | null>(null);

  // Auto-hide controls on mobile
  const [mobileControlsVisible, setMobileControlsVisible] = useState(false);
  const mobileControlsTimerRef = useRef<number | null>(null);

  const showMobileControls = useCallback(() => {
    setMobileControlsVisible(true);
    if (mobileControlsTimerRef.current) clearTimeout(mobileControlsTimerRef.current);
    mobileControlsTimerRef.current = window.setTimeout(() => {
      setMobileControlsVisible(false);
    }, 4000);
  }, []);

  const toggleMobileControls = useCallback(() => {
    if (mobileControlsVisible) {
      setMobileControlsVisible(false);
      if (mobileControlsTimerRef.current) clearTimeout(mobileControlsTimerRef.current);
    } else {
      showMobileControls();
    }
  }, [mobileControlsVisible, showMobileControls]);

  // Auto-hide controls after 3s on mobile viewer (effect placed after currentPage state below)

  const suppressClickUntilRef = useRef<number>(0);

  const [currentMarkedScoreId, setCurrentMarkedScoreId] = useState<string | null>(null);
  
  // Save prompt state and imperative handle
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const promptResolveRef = useRef<null | ((proceed: boolean) => void)>(null);

  const promptToSaveIfDirty = useCallback(async (): Promise<boolean> => {
    if (!hasAnnotations) return true;
    setShowSavePrompt(true);
    return await new Promise<boolean>((resolve) => {
      promptResolveRef.current = resolve;
    });
  }, [hasAnnotations]);
  
  // Imperative handle exposing the controls a parent shell (the Viewer
  // module) needs to drive the reader from its own chrome. Placed below
  // all the dependent callbacks (nextPage/prevPage/goToPage) — see the
  // useImperativeHandle call later in the body.
  
  // PDF-specific state
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  // Fit-to-width by default on touch/small screens (canvas CSS width = scale * 100%).
  // chromeless = the dedicated reader, which always wants the page filling the
  // viewport edge-to-edge — scaling above 1 makes the score overflow the iPad
  // width and forces horizontal scroll.
  const fitWidthScale = isInMobileViewer || chromeless || (typeof window !== 'undefined' && window.innerWidth < 768) ? 1 : 1.2;
  const [scale, setScale] = useState(fitWidthScale);
  // Fill-the-height default zoom for the dedicated reader (chromeless).
  // The canvas is sized width:scale*100%, so a scale that makes the page
  // as tall as the viewport also makes it wider than the viewport on
  // portrait screens — centered by mx-auto and pannable via the scroll
  // container. This is the forScore-style "fill the screen" the Viewer
  // reader wants instead of fit-to-width (which leaves a tall gap below a
  // short page). Pinch / zoom buttons set userZoomedRef so auto-fit stops
  // fighting the user until the next page turn; pageAspectRef caches the
  // rendered page's width/height (scale-invariant).
  const pageAspectRef = useRef<number | null>(null);
  const userZoomedRef = useRef(false);
  const [fitTick, setFitTick] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1); // Zoom level for annotation mode
  const [pageAnnotations, setPageAnnotations] = useState<Record<number, any[]>>({});
  const [useGoogle, setUseGoogle] = useState(false);

  // Show controls briefly on page change (not on initial mount)
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!isInMobileViewer) return;
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return; // Skip showing controls on first mount
    }
    showMobileControls();
    return () => {
      if (mobileControlsTimerRef.current) clearTimeout(mobileControlsTimerRef.current);
    };
  }, [isInMobileViewer, currentPage, showMobileControls]);

  // Page cache for instant page turns during performance
  const pageCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const preloadingRef = useRef<Set<string>>(new Set());
  const [googleProvider, setGoogleProvider] = useState<'gview' | 'viewerng'>('gview');
const timerRef = useRef<number | null>(null);
const [engine, setEngine] = useState<'google' | 'react'>('google');

  // Pinch-to-zoom state for annotation mode
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);
  // Focal point (container coords) to keep anchored while zooming
  const zoomFocalRef = useRef<{ x: number; y: number; prevZoom: number } | null>(null);

  // After the zoom transform commits, shift scroll so the focal point stays put
  useLayoutEffect(() => {
    const focal = zoomFocalRef.current;
    const container = containerRef.current;
    zoomFocalRef.current = null;
    if (!focal || !container || focal.prevZoom === zoomLevel) return;
    const ratio = zoomLevel / focal.prevZoom;
    container.scrollLeft = (container.scrollLeft + focal.x) * ratio - focal.x;
    container.scrollTop = (container.scrollTop + focal.y) * ratio - focal.y;
  }, [zoomLevel]);

  const goToPage = useCallback((page: number) => {
    const total = totalPages || (pdf?.numPages ?? 0) || 1;
    const clamped = Math.max(1, Math.min(page, total));
    if (clamped !== currentPage) {
      setCurrentPage(clamped);
    }
  }, [currentPage, totalPages, pdf]);

  const nextPage = useCallback(() => {
    if (isLoading) return;
    if (currentPage < (totalPages || (pdf?.numPages ?? 0) || 1)) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, pdf, isLoading, goToPage]);

  const prevPage = useCallback(() => {
    if (isLoading) return;
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, isLoading, goToPage]);

  // Bubble page changes up to a parent shell (Viewer module's bottom seek
  // bar reads these to render the "page X / N" indicator).
  useEffect(() => {
    if (onPageChange) onPageChange(currentPage, totalPages || (pdf?.numPages ?? 0) || 1);
  }, [currentPage, totalPages, pdf, onPageChange]);

  // Always-on Apple Pencil. When enabled, the first stylus contact on the
  // score surface flips us into annotation/draw mode so the very next
  // stroke is captured by the drawing canvas. We don't try to replay the
  // initial pointer — practically the first contact is "wake up" and the
  // user keeps drawing without lifting. Finger input still pages.
  useEffect(() => {
    if (!alwaysOnPencil) return;
    const container = containerRef.current;
    if (!container) return;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'pen') return;
      if (annotationMode) return;
      setError(null);
      setAnnotationMode(true);
      setActiveTool('draw');
    };
    container.addEventListener('pointerdown', onPointerDown);
    return () => container.removeEventListener('pointerdown', onPointerDown);
  }, [alwaysOnPencil, annotationMode]);

  // Apple Pencil hover indicator. We track pointermove events where the
  // pen is hovering (no buttons pressed) and stash the page-relative
  // coords + brush size into hoverPos. The DOM dot is rendered absolutely
  // inside the score surface.
  useEffect(() => {
    if (!annotationMode) { setHoverPos(null); return; }
    const container = containerRef.current;
    if (!container) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'pen') return;
      if (e.buttons !== 0) { setHoverPos(null); return; } // mid-stroke
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const size = activeTool === 'erase' ? brushSize[0] * 2 : brushSize[0];
      setHoverPos({ x, y, size });
    };
    const onLeave = () => setHoverPos(null);
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerleave', onLeave);
    container.addEventListener('pointerdown', onLeave);
    return () => {
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerleave', onLeave);
      container.removeEventListener('pointerdown', onLeave);
    };
  }, [annotationMode, brushSize, activeTool]);

  // Auto-enable always-on Pencil the first time we see a stylus on this
  // device. Marked in localStorage so the user only sees the courtesy
  // toast once. The pen contact itself still has to live through the
  // current page — but next stroke onward the user has the iPad-paper
  // experience without a manual settings detour.
  useEffect(() => {
    if (alwaysOnPencil) return;
    let seen = false;
    try { seen = localStorage.getItem('gw-pencil-detected') === '1'; } catch {}
    if (seen) return;
    const container = containerRef.current;
    if (!container) return;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'pen') return;
      try { localStorage.setItem('gw-pencil-detected', '1'); } catch {}
      setAlwaysOnPencil(true);
      toast.success('Apple Pencil detected — always-on annotation enabled.', { duration: 4500 });
    };
    container.addEventListener('pointerdown', onPointerDown, { once: true });
    return () => container.removeEventListener('pointerdown', onPointerDown);
  }, [alwaysOnPencil, setAlwaysOnPencil]);

  // Refs so the imperative handle can reach state-dependent callbacks
  // (renderPageToOffscreen, handleSave, handleUndo, handleClear) that are
  // declared further down the file. We avoid the TDZ trap by reading them
  // through .current at call time.
  const renderPageToOffscreenRef = useRef<((page: number, scale: number) => Promise<HTMLCanvasElement | null>) | null>(null);
  const handleSaveRef = useRef<(() => Promise<void>) | null>(null);
  const handleUndoRef = useRef<(() => void) | null>(null);
  const handleClearRef = useRef<(() => void) | null>(null);

  useImperativeHandle(ref, () => ({
    promptToSaveIfDirty,
    toggleToolbar: toggleMobileControls,
    nextPage,
    prevPage,
    goToPage,
    openAudioCompanion: () => setShowAudioCompanion(true),
    toggleAudioCompanion: () => setShowAudioCompanion((v) => !v),
    togglePiano: () => setShowPiano((v) => !v),
    isAudioCompanionOpen: () => showAudioCompanion,
    isPianoOpen: () => showPiano,
    enterAnnotationMode: () => { setError(null); setAnnotationMode(true); },
    exitAnnotationMode: () => setAnnotationMode(false),
    renderThumbnail: async (pageNum, scale = 0.25) => {
      const fn = renderPageToOffscreenRef.current;
      if (!fn) return null;
      const canvas = await fn(pageNum, scale);
      if (!canvas) return null;
      try { return canvas.toDataURL('image/png'); } catch { return null; }
    },
    setAnnotationTool: (tool) => setActiveTool(tool),
    setAnnotationColor: (color) => setBrushColor(color),
    setAnnotationStamp: (stamp, font) => {
      setSelectedStamp(stamp);
      if (font) setSelectedStampFont(font);
    },
    setAlwaysOnPencil,
    getAlwaysOnPencil: () => alwaysOnPencil,
    getLayers: () => annotationLayers.map((l) => ({ id: l.id, name: l.name, color: l.color, is_visible: l.is_visible })),
    getCurrentLayerId: () => currentLayerId,
    setCurrentLayerId: (id) => setCurrentLayerId(id),
    addLayer: async (name, color) => {
      try { const l = await addLayer.mutateAsync({ name, color }); return { id: l.id }; }
      catch { return null; }
    },
    toggleLayer: (id, visible) => toggleLayerVisible.mutate({ id, visible }),
    deleteLayerById: (id) => deleteLayer.mutate(id),
    saveAnnotations: async () => {
      const fn = handleSaveRef.current;
      if (!fn) return false;
      try { await fn(); return true; } catch { return false; }
    },
    undoAnnotation: () => handleUndoRef.current?.(),
    clearAnnotations: () => handleClearRef.current?.(),
    getAnnotationState: () => ({
      tool: activeTool,
      color: brushColor,
      stamp: selectedStamp,
      hasUnsaved: hasAnnotations,
      pathsCount: paths.length,
    }),
  }), [
    promptToSaveIfDirty, toggleMobileControls, nextPage, prevPage, goToPage,
    activeTool, brushColor, selectedStamp, hasAnnotations, paths.length,
    alwaysOnPencil, annotationLayers, currentLayerId, addLayer, toggleLayerVisible, deleteLayer,
  ]);

  // Zoom controls for annotation mode (anchored at viewport center)
  const setFocalToCenter = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      zoomFocalRef.current = {
        x: container.clientWidth / 2,
        y: container.clientHeight / 2,
        prevZoom: zoomLevel,
      };
    }
  }, [zoomLevel]);

  const handleZoomIn = useCallback(() => {
    setFocalToCenter();
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  }, [setFocalToCenter]);

  const handleZoomOut = useCallback(() => {
    setFocalToCenter();
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  }, [setFocalToCenter]);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  // Zoom controls for normal viewing mode (scale)
  const handleScaleZoomIn = useCallback(() => {
    userZoomedRef.current = true;
    setScale(prev => Math.min(prev + 0.2, 3));
  }, []);

  const handleScaleZoomOut = useCallback(() => {
    userZoomedRef.current = true;
    setScale(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  const handleScaleReset = useCallback(() => {
    // In the reader, "reset" means re-fill the height (recompute the fit);
    // elsewhere it returns to the fit-to-width baseline.
    if (chromeless) { userZoomedRef.current = false; setFitTick((t) => t + 1); return; }
    setScale(fitWidthScale);
  }, [chromeless, fitWidthScale]);

  // Desktop trackpad / mouse-wheel pinch. Browsers fire `wheel` events with
  // ctrlKey=true for pinch gestures on macOS trackpads and for Ctrl+wheel on
  // every desktop. We bind a non-passive native listener (React's onWheel is
  // passive by default, which would let the page zoom instead) and translate
  // deltaY into a smooth scale change.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return; // not a pinch — let normal scroll through
      e.preventDefault();
      // deltaY is negative when pinching apart (zoom in), positive when
      // pinching together (zoom out). Step proportional to wheel magnitude.
      const step = Math.exp(-e.deltaY / 200);
      setScale((prev) => Math.max(0.5, Math.min(3, prev * step)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Pinch-to-zoom handler for annotation mode
  const handleAnnotationPinchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      setInitialPinchDistance(distance);
      setInitialZoom(zoomLevel);
    }
  }, [zoomLevel]);

  const handleAnnotationPinchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scaleChange = distance / initialPinchDistance;
      const newZoom = Math.max(0.5, Math.min(3, initialZoom * scaleChange));
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        zoomFocalRef.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top,
          prevZoom: zoomLevel,
        };
      }
      setZoomLevel(newZoom);
    }
  }, [initialPinchDistance, initialZoom, zoomLevel]);

  const handleAnnotationPinchEnd = useCallback(() => {
    setInitialPinchDistance(null);
  }, []);

  // Touch navigation functions
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Allow multi-touch gestures (pinch zoom) to pass through
    if (e.touches.length > 1) return;
    
    // Don't handle navigation when actively drawing in annotation mode
    if (annotationMode && activeTool !== "select") return;
    
    // Don't track touch if it's on a button or interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
      return;
    }
    
    // Only handle if the touch is directly on the PDF canvas or navigation zone
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    setTouchEnd(null);
  }, [annotationMode, activeTool]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Allow multi-touch gestures (pinch zoom) to pass through
    if (e.touches.length > 1) return;
    
    if (!touchStart) return;
    
    const touch = e.touches[0];
    setTouchEnd({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
  }, [touchStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    // Don't handle navigation when actively drawing in annotation mode
    if (annotationMode && activeTool !== "select") return;

    // Don't prevent default if touching a button or interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }

    // Prevent synthetic click from firing after touch
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.changedTouches[0];
    const touchEndPos = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    
    const deltaX = touchEndPos.x - touchStart.x;
    const deltaY = touchEndPos.y - touchStart.y;
    const deltaTime = touchEndPos.time - touchStart.time;
    
    // Check for swipe (minimum distance and maximum time)
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;
    
    if (Math.abs(deltaX) > minSwipeDistance && deltaTime < maxSwipeTime && Math.abs(deltaY) < Math.abs(deltaX)) {
      if (deltaX > 0) {
        // Swipe right - previous page
        prevPage();
      } else {
        // Swipe left - next page
        nextPage();
      }
    } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      // Tap (no significant movement)
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const tapX = touchStart.x - containerRect.left;
        const tapZoneWidth = containerRect.width / 3;
        
        if (tapX < tapZoneWidth) {
          // Left tap zone - previous page
          prevPage();
        } else if (tapX > containerRect.width - tapZoneWidth) {
          // Right tap zone - next page
          nextPage();
        } else {
          // Middle zone - no action (use header button instead)
        }
      }
    }
    
    // Suppress the following click event triggered by touch
    suppressClickUntilRef.current = Date.now() + 500;
    
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, annotationMode, activeTool, prevPage, nextPage]);

  // Mouse click navigation for desktop
  const handleMouseClick = useCallback((e: React.MouseEvent) => {
    if (annotationMode && activeTool !== "select") return;

    // Ignore the synthetic click following a touch interaction (one-shot)
    if (Date.now() < suppressClickUntilRef.current) {
      suppressClickUntilRef.current = 0;
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (isLoading) return;
    
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      const clickX = e.clientX - containerRect.left;
      const tapZoneWidth = containerRect.width / 3;
      
      if (clickX < tapZoneWidth) {
        // Left click zone - previous page
        prevPage();
      } else if (clickX > containerRect.width - tapZoneWidth) {
        // Right click zone - next page
        nextPage();
      }
    }
  }, [annotationMode, activeTool, isLoading, prevPage, nextPage]);

  useEffect(() => {
    if (startInAnnotationMode && !annotationMode) {
      setAnnotationMode(true);
    }
  }, [startInAnnotationMode, annotationMode]);

  // Scroll-to-advance: when the user has scrolled to the bottom of the current
  // page and continues to scroll/swipe down, advance to the next page (and
  // reset scroll to top). Reverse for prev. Critical on iPad where users
  // naturally scroll down a tall score and expect continuation. Only fires
  // when annotation mode is off (in annotation mode scroll = panning canvas).
  useEffect(() => {
    if (annotationMode) return;
    const container = containerRef.current;
    if (!container) return;
    let lastFireAt = 0;
    const FIRE_COOLDOWN = 600;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 8) return;
      const now = Date.now();
      if (now - lastFireAt < FIRE_COOLDOWN) return;
      const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
      const atTop = container.scrollTop <= 1;
      if (e.deltaY > 0 && atBottom && currentPage < (totalPages || 1)) {
        e.preventDefault();
        lastFireAt = now;
        nextPage();
        requestAnimationFrame(() => { container.scrollTop = 0; });
      } else if (e.deltaY < 0 && atTop && currentPage > 1) {
        e.preventDefault();
        lastFireAt = now;
        prevPage();
        requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [annotationMode, currentPage, totalPages, nextPage, prevPage]);

  // Auto-load associated audio when PDF opens.
  //
  // Resolution order: the new gw_sheet_music_audio_tracks table's default
  // row, then the legacy gw_sheet_music.audio_url / apple_music_id
  // columns. Tracks rows backfill the legacy columns on insert so this
  // ordering is a transitional safety net; the tracks query is the
  // forward path.
  useEffect(() => {
    if (audioSource) return;

    // Tracks path: pick the default row (or the only row if there's just
    // one) and dispatch by its kind.
    const track = defaultAudioTrack;
    if (track) {
      if (track.kind === 'apple_music' && track.apple_music_id) {
        loadAppleMusic({
          id: track.apple_music_id,
          storefront: track.apple_music_storefront ?? 'us',
          title: track.apple_music_title ?? track.label ?? musicTitle ?? 'Apple Music',
          artworkUrl: track.apple_music_artwork_url ?? null,
        });
        setShowAudioCompanion(true);
        return;
      }
      if (track.audio_url) {
        const url = track.audio_url;
        if (url.includes('youtube.com') || url.includes('youtu.be')) loadYouTube(url);
        else loadUrl(url, track.audio_title || track.label || musicTitle || 'Audio');
        setShowAudioCompanion(true);
        return;
      }
    }

    // Legacy fallback for scores that haven't been re-saved through the
    // tracks-aware dialog yet.
    if (!audioData) return;
    if (audioData.apple_music_id) {
      loadAppleMusic({
        id: audioData.apple_music_id,
        storefront: audioData.apple_music_storefront ?? 'us',
        title: audioData.apple_music_title ?? audioData.audio_title ?? musicTitle ?? 'Apple Music',
        artworkUrl: audioData.apple_music_artwork_url ?? null,
      });
      setShowAudioCompanion(true);
      return;
    }
    if (audioData.audio_url) {
      const url = audioData.audio_url;
      if (url.includes('youtube.com') || url.includes('youtu.be')) loadYouTube(url);
      else loadUrl(url, audioData.audio_title || musicTitle || 'Audio');
      setShowAudioCompanion(true);
    }
  }, [audioData, defaultAudioTrack, audioSource, loadUrl, loadYouTube, loadAppleMusic, musicTitle]);

  // Toggle global annotation mode to hide/show the app header
  useEffect(() => {
    try {
      const styleId = 'annotation-mode-global-style';
      let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

      if (annotationMode) {
        document.body.classList.add('annotation-mode');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = styleId;
          styleEl.textContent = `
            /* Hide global headers/footers and allow full-bleed canvas */
            body.annotation-mode header, 
            body.annotation-mode .glass-nav,
            body.annotation-mode [data-global-header],
            body.annotation-mode [data-global-footer] {
              display: none !important;
            }
            body.annotation-mode { overflow: hidden; }
          `;
          document.head.appendChild(styleEl);
        }
      } else {
        document.body.classList.remove('annotation-mode');
        if (styleEl) {
          styleEl.remove();
        }
      }
      window.dispatchEvent(new CustomEvent('annotationModeChange', { detail: { active: annotationMode } }));
    } catch {}
    return () => {
      document.body.classList.remove('annotation-mode');
      const styleEl = document.getElementById('annotation-mode-global-style');
      if (styleEl) styleEl.remove();
    };
  }, [annotationMode]);

  // Cleanup audio when the component truly unmounts. The previous version
  // depended on [stopAudio, closeYouTube] — but `stopAudio` from the audio
  // context re-creates itself whenever `audioSource` changes. So this
  // cleanup was firing every time loadYouTube set audioSource='youtube',
  // calling stopAudio() (which resets audioSource to null), which then
  // re-triggered the auto-load effect to call loadYouTube again — an
  // infinite loop that hammered the iframe and made the stop / play
  // buttons blink. Capture latest refs and run cleanup ONCE on unmount.
  const stopAudioRef = useRef(stopAudio);
  const closeYouTubeRef = useRef(closeYouTube);
  useEffect(() => { stopAudioRef.current = stopAudio; }, [stopAudio]);
  useEffect(() => { closeYouTubeRef.current = closeYouTube; }, [closeYouTube]);
  useEffect(() => {
    return () => {
      stopAudioRef.current();
      closeYouTubeRef.current();
    };
  }, []);

  // Handle iframe load
  const handleIframeLoad = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    if (useGoogle && googleProvider === 'gview') {
      setGoogleProvider('viewerng');
      setIsLoading(true);
      return;
    }
    setIsLoading(false);
    setError('Failed to load PDF viewer');
  };
  // Initialize drawing canvas to match PDF canvas size
  useEffect(() => {
    if (!drawingCanvasRef.current || !canvasRef.current || !annotationMode) return;
    
    const drawingCanvas = drawingCanvasRef.current;
    const pdfCanvas = canvasRef.current;
    
    // Set drawing canvas size to match PDF canvas
    const matchCanvasSize = () => {
      drawingCanvas.width = pdfCanvas.width;
      drawingCanvas.height = pdfCanvas.height;
      redrawAnnotations();
    };
    
    matchCanvasSize();
    
    // Watch for PDF canvas size changes
    const observer = new ResizeObserver(matchCanvasSize);
    observer.observe(pdfCanvas);
    
    return () => observer.disconnect();
  }, [annotationMode, pdf]);

  useEffect(() => {
    // Legacy Google/React engine loader disabled in paginated mode
    // Loading state is now managed by the canvas render effect
  }, [signedUrl, annotationMode, engine]);

  const redrawAnnotations = (pathsToRedraw?: any[]) => {
    if (!drawingCanvasRef.current) return;
    
    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Use current paths or provided paths
    const annotationsToRedraw = pathsToRedraw || paths;
    
    annotationsToRedraw.forEach(path => {
      // Stamps render as a glyph centered on (x, y). Italic serif gives
      // dynamics (p / mf / ff) the conventional musical look.
      if (path.tool === 'stamp' && path.stamp) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = path.color;
        // Bravura is the SMuFL music font; serif is for italic dynamics.
        const font = path.font === 'bravura' ? 'Bravura' : 'serif';
        const style = font === 'Bravura' ? '' : 'italic 700 ';
        ctx.font = `${style}${path.size}px ${font === 'Bravura' ? '"Bravura"' : 'Georgia, "Times New Roman", serif'}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(path.stamp, path.x, path.y);
        return;
      }
      if (path.points && path.points.length > 1) {
        // Set compositing mode for eraser to actually erase pixels
        if (path.tool === 'erase') {
          ctx.globalCompositeOperation = 'destination-out';
        } else {
          ctx.globalCompositeOperation = 'source-over';
        }

        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);

        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }

        ctx.stroke();

        // Reset to default compositing
        ctx.globalCompositeOperation = 'source-over';
      }
    });
  };

  const getEventPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    
    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!annotationMode || activeTool === "select") return;

    e.preventDefault();
    const pos = getEventPos(e);

    // Stamps are one-shot: a single tap drops the glyph; no drag tracking.
    if (activeTool === 'stamp') {
      // Larger stamp on bigger pages — scale relative to the canvas height
      // so a stamp on a small thumbnail vs a full A4 looks proportional.
      const canvas = drawingCanvasRef.current;
      const baseSize = canvas ? Math.max(28, Math.round(canvas.height * 0.04)) : 36;
      const stampPath = {
        stamp: selectedStamp,
        font: selectedStampFont,
        x: pos.x,
        y: pos.y,
        color: brushColor,
        size: baseSize,
        tool: 'stamp' as const,
      };
      const newPaths = [...paths, stampPath];
      setPaths(newPaths);
      setHasAnnotations(true);
      redrawAnnotations(newPaths);
      return;
    }

    setIsDrawing(true);
    const newPath = {
      points: [pos],
      color: brushColor, // Always use brush color, erasing handled by compositing mode
      size: activeTool === "erase" ? brushSize[0] * 2 : brushSize[0],
      tool: activeTool
    };

    setCurrentPath(newPath);
  };

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentPath) return;
    
    e.preventDefault();
    const pos = getEventPos(e);
    const updatedPath = {
      ...currentPath,
      points: [...currentPath.points, pos]
    };
    
    setCurrentPath(updatedPath);
    redrawAnnotations([...paths, updatedPath]);
  };

  const handleEnd = () => {
    if (!isDrawing || !currentPath) return;
    
    setIsDrawing(false);
    const newPaths = [...paths, currentPath];
    setPaths(newPaths);
    setCurrentPath(null);
    setHasAnnotations(true);
  };

  const handleClear = () => {
    setPaths([]);
    setHasAnnotations(false);
    redrawAnnotations([]);
    toast.success("Annotations cleared!");
  };

  const handleUndo = () => {
    if (paths.length === 0) return;
    
    const newPaths = paths.slice(0, -1);
    setPaths(newPaths);
    redrawAnnotations(newPaths);
    setHasAnnotations(newPaths.length > 0);
  };

  const handleSave = async () => {
    if (!drawingCanvasRef.current || !user || !musicId) {
      toast.error("Cannot save - missing required information");
      return;
    }
    
    setIsSaving(true);
    try {
      // Convert paths to annotation data format
      const annotationData = {
        paths: paths,
        brushSize: brushSize[0],
        brushColor: brushColor,
        canvasWidth: drawingCanvasRef.current.width,
        canvasHeight: drawingCanvasRef.current.height
      };

      // Save annotation to database using the hook
      const positionData = {
        x: 0,
        y: 0,
        width: drawingCanvasRef.current.width,
        height: drawingCanvasRef.current.height,
      };

      const savedAnnotation = await saveAnnotation(
        musicId,
        currentPage,
        'drawing',
        annotationData,
        positionData,
        currentLayerId,
      );
      
      if (!savedAnnotation) {
        throw new Error('Failed to save annotation');
      }
      
      toast.success('Annotations saved successfully!');
      
      // Clear annotations after saving
      setPaths([]);
      setHasAnnotations(false);
      redrawAnnotations([]);
      
      // Refresh annotations from database
      if (musicId) {
        await fetchAnnotations(musicId, currentPage);
      }
    } catch (error: any) {
      console.error('Error saving annotations:', error);
      toast.error(`Failed to save annotations: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Publish the imperative refs once the underlying handlers are in scope.
  // (We declare these handlers after useImperativeHandle to avoid a TDZ
  // issue, then sync the refs here so the handle can dispatch to them.)
  useEffect(() => { handleSaveRef.current = handleSave; });
  useEffect(() => { handleUndoRef.current = handleUndo; });
  useEffect(() => { handleClearRef.current = handleClear; });

  // Load saved annotations when page changes
  useEffect(() => {
    if (musicId && annotationMode) {
      fetchAnnotations(musicId, currentPage);
    }
  }, [musicId, currentPage, annotationMode, fetchAnnotations]);

  // Render loaded annotations on canvas
  useEffect(() => {
    if (!annotations || annotations.length === 0 || !annotationMode) return;
    
    const pageAnnotations = annotations.filter(ann => ann.page_number === currentPage);
    if (pageAnnotations.length === 0) return;

    // Load and render saved annotations, honoring layer visibility.
    // An annotation row is rendered when (a) it has no layer (ungrouped),
    // or (b) its layer is currently toggled visible. We never delete on
    // hide — strokes return when the layer is re-enabled.
    const loadedPaths = pageAnnotations
      .filter(ann => ann.annotation_type === 'drawing')
      .filter(ann => !ann.annotation_layer_id || visibleLayerIds.has(ann.annotation_layer_id))
      .flatMap(ann => {
        const data = ann.annotation_data as any;
        return data?.paths || [];
      });

    if (loadedPaths.length > 0) {
      setPaths(loadedPaths);
      setHasAnnotations(true);
      redrawAnnotations(loadedPaths);
    }
  }, [annotations, currentPage, annotationMode]);

  // Load PDF document once.
  // iOS WKWebView (Capacitor) was getting stuck on the URL-driven primary
  // path — pdfjs internal Range requests against signed DO Spaces URLs hang
  // silently because the CORS preflight doesn't expose Content-Range. The
  // fix is to fetch the whole ArrayBuffer first on native, then hand pdfjs
  // a `data:` payload that needs no Range requests.
  useEffect(() => {
    if (!signedUrl) return;

    let cancelled = false;
    const abortController = new AbortController();

    const isNative = (() => {
      try {
        // @ts-ignore — Capacitor injects window.Capacitor on native
        return !!(window as any).Capacitor?.isNativePlatform?.();
      } catch { return false; }
    })();

    const loadPdfDoc = async () => {
      try {
        setIsLoading(true);
        console.log('[PDFViewer] loadPdfDoc start — signedUrl:', signedUrl, 'isNative:', isNative);

        const fetchAsArrayBuffer = async () => {
          console.log('[PDFViewer] fetchAsArrayBuffer start');
          const resp = await fetch(signedUrl, { signal: abortController.signal });
          if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
          const ab = await resp.arrayBuffer();
          console.log('[PDFViewer] fetchAsArrayBuffer ok — bytes:', ab.byteLength);
          return ab;
        };

        const buildOpts = (src: { url?: string; data?: ArrayBuffer }) => ({
          ...src,
          // Skip remote cMaps fetch on native — cdn.jsdelivr.net can be blocked
          // and the missing-cMaps warning is harmless for the music PDFs we render.
          ...(isNative ? {} : { cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/', cMapPacked: true }),
          // Force whole-file fetch on native so we never depend on Range
          // requests that DO Spaces signed URLs don't expose to WKWebView.
          ...(isNative ? { disableAutoFetch: true, disableStream: true, disableRange: true } : {}),
        });

        let doc;
        if (isNative) {
          const ab = await fetchAsArrayBuffer();
          console.log('[PDFViewer] getDocument(data) start');
          doc = await pdfjsLib.getDocument(buildOpts({ data: ab })).promise;
          console.log('[PDFViewer] getDocument(data) resolved — pages:', doc.numPages);
        } else {
          try {
            console.log('[PDFViewer] getDocument(url) start');
            doc = await pdfjsLib.getDocument(buildOpts({ url: signedUrl })).promise;
            console.log('[PDFViewer] getDocument(url) resolved — pages:', doc.numPages);
          } catch (primaryErr) {
            console.warn('[PDFViewer] getDocument(url) failed, falling back to ArrayBuffer', primaryErr);
            const ab = await fetchAsArrayBuffer();
            console.log('[PDFViewer] getDocument(data) start (fallback)');
            doc = await pdfjsLib.getDocument(buildOpts({ data: ab })).promise;
            console.log('[PDFViewer] getDocument(data) resolved (fallback) — pages:', doc.numPages);
          }
        }

        if (cancelled) return;
        setPdf(doc);
        setTotalPages(doc.numPages);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error('PDFViewerWithAnnotations: load failed', err);
        toast.error('Failed to load PDF');
        setError(`PDF load failed: ${msg.slice(0, 160)}`);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadPdfDoc();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [signedUrl]);

  // Helper: render a single page to an offscreen canvas (for caching)
  // Cap the page cache so long scores don't blow memory. A scaled canvas is
  // ~width*height*4 bytes (e.g. 1240x1750 at 1.5x ≈ 8.5 MB). 40 cached pages
  // was ~340 MB of canvas memory alone, on top of pdfjs's per-page buffers,
  // and crashed Chrome on long scores. 8 pages × ~8 MB ≈ 64 MB is plenty for
  // smooth turns of the current page + a couple of neighbors.
  const PAGE_CACHE_LIMIT = 8;

  const renderPageToOffscreen = useCallback(async (pageNum: number, renderScale: number): Promise<HTMLCanvasElement | null> => {
    if (!pdf || pageNum < 1 || pageNum > pdf.numPages) return null;
    // Hi-DPI: multiply the render scale by the device pixel ratio so a
    // Retina iPad gets a 2x backing buffer at the same CSS size. Cap at
    // 3x so 3x devices don't quintuple the memory footprint. Cache by
    // the FINAL scale so different DPRs don't collide.
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 3) : 1;
    const effectiveScale = renderScale * dpr;
    const cacheKey = `${pageNum}-${effectiveScale}`;
    if (pageCacheRef.current.has(cacheKey)) {
      // Re-insert to mark as most-recently-used (Map preserves insertion order).
      const canvas = pageCacheRef.current.get(cacheKey)!;
      pageCacheRef.current.delete(cacheKey);
      pageCacheRef.current.set(cacheKey, canvas);
      return canvas;
    }
    if (preloadingRef.current.has(cacheKey)) return null; // already loading
    preloadingRef.current.add(cacheKey);
    try {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: effectiveScale });
      const offscreen = document.createElement('canvas');
      offscreen.width = viewport.width;
      offscreen.height = viewport.height;
      const ctx = offscreen.getContext('2d', { alpha: false, desynchronized: true });
      if (!ctx) return null;
      await page.render({ canvasContext: ctx, viewport }).promise;
      pageCacheRef.current.set(cacheKey, offscreen);
      // LRU eviction. Oldest entries (front of Map) drop first.
      while (pageCacheRef.current.size > PAGE_CACHE_LIMIT) {
        const oldest = pageCacheRef.current.keys().next().value;
        if (oldest === undefined) break;
        const oldCanvas = pageCacheRef.current.get(oldest);
        pageCacheRef.current.delete(oldest);
        // Help GC by zeroing the canvas dimensions.
        if (oldCanvas) { oldCanvas.width = 0; oldCanvas.height = 0; }
      }
      return offscreen;
    } catch (err) {
      console.error(`Error pre-rendering page ${pageNum}:`, err);
      return null;
    } finally {
      preloadingRef.current.delete(cacheKey);
    }
  }, [pdf]);

  // Expose renderPageToOffscreen through the imperative handle's ref so the
  // thumbnail strip in the Viewer's chrome can request page previews.
  useEffect(() => { renderPageToOffscreenRef.current = renderPageToOffscreen; }, [renderPageToOffscreen]);

  // Clear cache when pdf or scale changes. Zero canvas dimensions so the
  // backing image data can be GC'd promptly instead of waiting on the Map
  // entry to be reaped.
  useEffect(() => {
    pageCacheRef.current.forEach((canvas) => { canvas.width = 0; canvas.height = 0; });
    pageCacheRef.current.clear();
    preloadingRef.current.clear();
  }, [pdf, scale]);

  // No bulk preload. Earlier code pre-rendered every page in the score on a
  // 300 ms timer, which combined with the 40-page cache blew Chrome's memory
  // limit on long PDFs. Neighbor pages are preloaded on demand by the page-
  // change effect below.

  // Render PDF page with caching — instant if pre-cached
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    let cancelled = false;

    const renderPage = async () => {
      const cacheKey = `${currentPage}-${scale}`;
      const cached = pageCacheRef.current.get(cacheKey);

      if (cached) {
        // Instant page turn from cache
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        if (!ctx) return;
        canvas.width = cached.width;
        canvas.height = cached.height;
        ctx.drawImage(cached, 0, 0);
      } else {
        // Cache miss — render directly then cache
        const offscreen = await renderPageToOffscreen(currentPage, scale);
        if (cancelled || !offscreen || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d', { alpha: false, desynchronized: true });
        if (!ctx) return;
        canvasRef.current.width = offscreen.width;
        canvasRef.current.height = offscreen.height;
        ctx.drawImage(offscreen, 0, 0);
      }

      // Cache this page's aspect ratio (scale-invariant) so the reader's
      // fill-height effect can size the page to the viewport. Bump fitTick
      // once when it first becomes known / changes so the effect re-runs.
      if (!cancelled && chromeless && canvasRef.current && canvasRef.current.height > 0) {
        const a = canvasRef.current.width / canvasRef.current.height;
        if (pageAspectRef.current !== a) { pageAspectRef.current = a; setFitTick((t) => t + 1); }
      }

      // Auto-trim PDF top whitespace in chromeless mode (Viewer reader).
      // Scan the rendered canvas for the first non-white row, then scroll
      // every scrollable ancestor so that row sits at most 100px from the
      // top edge. Scrolling JUST containerRef wasn't enough — the canvas
      // has multiple overflow:auto ancestors and the outer one was what
      // actually contained the slack, so the inner scrollTop had nothing
      // to do.
      if (!cancelled && chromeless) {
        // Defer one frame so layout settles after the canvas resize.
        requestAnimationFrame(() => {
          try {
            const cv = canvasRef.current;
            if (!cv) return;
            const ctx = cv.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;
            const sampleH = Math.min(cv.height, Math.floor(cv.height * 0.4));
            const stripW = Math.min(cv.width, 320);
            const stripX = Math.floor((cv.width - stripW) / 2);
            const { data } = ctx.getImageData(stripX, 0, stripW, sampleH);
            const NEAR_WHITE = 235;
            const DENSITY_THRESHOLD = 0.004;
            let firstContentRow = -1;
            for (let y = 0; y < sampleH; y++) {
              let dark = 0;
              const off = y * stripW * 4;
              for (let x = 0; x < stripW; x++) {
                const i = off + x * 4;
                if (data[i] < NEAR_WHITE && data[i + 1] < NEAR_WHITE && data[i + 2] < NEAR_WHITE) dark++;
              }
              if (dark / stripW > DENSITY_THRESHOLD) { firstContentRow = y; break; }
            }
            if (firstContentRow <= 0) return;

            const cvRect = cv.getBoundingClientRect();
            const displayScale = cvRect.width / cv.width;
            // Position of the first content row in viewport coordinates.
            const contentTopViewport = cvRect.top + firstContentRow * displayScale;

            const MAX_TOP_GAP = 50; // px

            // Walk every scrollable ancestor and scroll each until the
            // canvas's content row lands within MAX_TOP_GAP of its top.
            // We iterate top-down so the outer-most scrollable absorbs
            // the bulk of the gap first.
            const scrollables: HTMLElement[] = [];
            let node: HTMLElement | null = cv.parentElement;
            while (node) {
              const style = getComputedStyle(node);
              if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
                scrollables.push(node);
              }
              node = node.parentElement;
            }
            // Outer-most first.
            scrollables.reverse();
            for (const el of scrollables) {
              const elRect = el.getBoundingClientRect();
              const cur = cv.getBoundingClientRect();
              const currentGap = (cur.top + firstContentRow * displayScale) - elRect.top;
              if (currentGap <= MAX_TOP_GAP) break;
              const delta = currentGap - MAX_TOP_GAP;
              const maxScroll = el.scrollHeight - el.clientHeight - el.scrollTop;
              el.scrollTop += Math.min(delta, maxScroll);
            }
          } catch { /* tainted canvas / read failure — ignore */ }
        });
      }

      // Pre-load adjacent pages in the background for instant future turns.
      // Keep this small — preloading too many pages on long scores piles up
      // canvas memory until Chrome OOMs. 2 ahead + 1 behind covers typical
      // page-turn behavior without bloating the cache.
      if (!cancelled) {
        for (let i = 1; i <= 2; i++) {
          if (currentPage + i <= (totalPages || pdf.numPages)) {
            renderPageToOffscreen(currentPage + i, scale);
          }
        }
        if (currentPage - 1 >= 1) {
          renderPageToOffscreen(currentPage - 1, scale);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdf, currentPage, scale, annotationMode, renderPageToOffscreen, totalPages]);

  // Reader fill-height fit. Recompute on viewport resize (rotate / window
  // resize) and re-fit each new page — but stop once the user has pinched
  // or used the zoom buttons, until they turn the page.
  useEffect(() => {
    if (!chromeless) return;
    const onResize = () => setFitTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [chromeless]);

  useEffect(() => { if (chromeless) userZoomedRef.current = false; }, [currentPage, chromeless]);

  useLayoutEffect(() => {
    if (!chromeless || userZoomedRef.current) return;
    const container = containerRef.current;
    const aspect = pageAspectRef.current;
    if (!container || !aspect) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw <= 0 || ch <= 0) return;
    // canvas width = fill * cw  ⟹  canvas height = (fill*cw)/aspect = ch.
    const fill = (ch / cw) * aspect;
    const next = Math.max(1, Math.min(3, fill));
    setScale((s) => (Math.abs(s - next) > 0.01 ? next : s));
  }, [chromeless, fitTick, currentPage]);

  // Show loading while getting signed URL
  if (!pdfUrl) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <p className="text-muted-foreground">No PDF available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (urlLoading) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Preparing PDF...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (urlError || !signedUrl) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold text-destructive">Failed to Load PDF</h3>
              <p className="text-sm text-muted-foreground mt-1">{urlError || 'PDF unavailable'}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(pdfUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Try Direct Link
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !annotationMode) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold text-destructive">Failed to Load PDF</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => window.open(signedUrl || pdfUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
              <Button 
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                }} 
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const colors = ["#ff0000", "#000000", "#0000ff", "#008000", "#800080", "#ffa500"];

  return (
    <Card className={cn("w-full h-full flex flex-col border-0 rounded-none overflow-hidden", className)}>
      {/* Persistent audio companion bar — when the viewer is in chromeless
          mode (Viewer reader on iPad / desktop), the regular centered
          toolbar isn't rendered, so the audio companion would never show
          up. Surface it as a dedicated top bar that's visible whenever
          the user has opened audio. Pinned just under the score's own
          top chrome so a conductor always sees the transport. */}
      {/* Audio companion strip removed here — the chromeless host
          (ViewerReader) now mounts AudioCompanionControls inline in its
          title bar so the conductor sees title + transport on one row.
          Keeping this block here would double-render the controls. */}

      {/* Annotation Toolbar — suppressed when chromeless so the parent
          shell (e.g. ViewerReader) can render its own. */}
        {annotationMode && !chromeless && (
          <div className="flex flex-wrap items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-muted/50 rounded-t-lg border-b">
            {/* Save Button */}
            {hasAnnotations && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !musicId}
                className="h-6 px-1 text-xs sm:h-8 sm:px-2 sm:text-xs"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span>Save</span>
                )}
              </Button>
            )}

            {/* Tool Selection */}
            <div className="flex gap-0.5">
              <Button
                variant={activeTool === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("select")}
                className="h-6 w-6 p-0 sm:h-8 sm:w-8"
              >
                <MousePointer className="h-3 w-3" />
              </Button>
              <Button
                variant={activeTool === "draw" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("draw")}
                className="h-6 w-6 p-0 sm:h-8 sm:w-8"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant={activeTool === "erase" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("erase")}
                className="h-6 w-6 p-0 sm:h-8 sm:w-8"
              >
                <Eraser className="h-3 w-3" />
              </Button>
              {/* Stamp palette — pick a glyph, then tap the page to drop it.
                  Categories come from src/lib/smuflStamps.ts (Bravura). */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={activeTool === "stamp" ? "default" : "outline"}
                    size="sm"
                    className="h-6 w-auto px-1.5 sm:h-8 sm:px-2"
                    title="Stamp musical symbol"
                  >
                    <span
                      className="text-sm font-bold leading-none"
                      style={{ fontFamily: selectedStampFont === 'bravura' ? '"Bravura"' : 'Georgia, serif', fontStyle: selectedStampFont === 'bravura' ? 'normal' : 'italic' }}
                    >
                      {selectedStamp}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="p-2 max-h-96 overflow-y-auto w-[320px]">
                  {STAMP_CATEGORIES.map((cat) => (
                    <div key={cat.name} className="mb-2">
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground px-1 pb-1 sticky top-0 bg-popover">
                        {cat.name}
                      </div>
                      <div className="grid grid-cols-8 gap-0.5">
                        {cat.glyphs.map((g, i) => {
                          const selected = selectedStamp === g.glyph && selectedStampFont === g.font && activeTool === 'stamp';
                          return (
                            <button
                              key={`${g.glyph}-${i}`}
                              type="button"
                              onClick={() => { setSelectedStamp(g.glyph); setSelectedStampFont(g.font); setActiveTool('stamp'); }}
                              title={g.label}
                              className={cn(
                                'h-8 w-8 flex items-center justify-center rounded hover:bg-accent text-lg leading-none',
                                selected && 'bg-accent ring-1 ring-primary',
                              )}
                              style={{ fontFamily: g.font === 'bravura' ? '"Bravura"' : 'Georgia, serif', fontStyle: g.font === 'bravura' ? 'normal' : 'italic' }}
                            >
                              {g.glyph}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Color Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 w-6 p-0 sm:h-8 sm:w-8 rounded-full border-2"
                  style={{ backgroundColor: brushColor, borderColor: 'hsl(var(--border))' }}
                >
                  <span className="sr-only">Select color</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-auto p-2 bg-popover">
                <div className="grid grid-cols-3 gap-1.5">
                  {colors.map((color) => (
                    <Button
                      key={color}
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-full"
                      style={{ backgroundColor: color }}
                      onClick={() => setBrushColor(color)}
                    >
                      {brushColor === color && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </Button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Size - hidden on mobile, show on sm+ */}
            <div className="hidden sm:flex items-center gap-1 min-w-14 sm:min-w-16">
              <Slider
                value={brushSize}
                onValueChange={setBrushSize}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <Badge variant="outline" className="text-xs px-1 py-0">{brushSize[0]}</Badge>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-0.5 border-l pl-1 sm:pl-2 ml-0.5 sm:ml-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="h-6 w-6 p-0 sm:h-8 sm:w-8"
                title="Zoom out"
              >
                <ZoomOut className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetZoom}
                className="h-6 px-1 text-xs sm:h-8 sm:px-2 sm:text-xs"
                title="Reset zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="h-6 w-6 p-0 sm:h-8 sm:w-8"
                title="Zoom in"
              >
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>

            {/* Audio Companion in annotation mode - hidden on mobile */}
            <div className="hidden sm:flex items-center border-l pl-1.5 sm:pl-2 ml-1">
              {showAudioCompanion ? (
                <AudioCompanionControls onClose={() => setShowAudioCompanion(false)} musicId={musicId} />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAudioCompanion(true)}
                  className="h-7 px-1.5 sm:h-8 sm:px-2"
                  title="Listen along with audio"
                >
                  <Music className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="text-xs hidden sm:inline">Listen</span>
                </Button>
              )}
            </div>

            {/* Crop and Close buttons */}
            <div className="flex gap-0.5 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={paths.length === 0}
                className="h-6 w-6 p-0 sm:h-9 sm:w-9"
              >
                <Undo className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={paths.length === 0}
                className="h-6 w-6 p-0 sm:h-9 sm:w-9"
              >
                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              {annotations.length > 0 && musicTitle && (
                <AnnotationShareButton 
                  annotationIds={annotations.map(a => a.id)}
                  musicTitle={musicTitle}
                />
              )}
            </div>
          </div>
        )}

      {/* PDF Content - Full height, no padding */}
      <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
        <div 
          className="relative w-full flex-1 min-h-0 overflow-auto"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y pinch-zoom'
          } as React.CSSProperties}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}

          {/* Top toolbar — suppressed when the Viewer module's shell owns
              chrome (chromeless=true). Otherwise visible on desktop and
              non-mobile-viewer contexts. */}
          {!annotationMode && !isInMobileViewer && !chromeless && (
            <div
              // Full-width wrapper + flex justify-center. Previously this used
              // `left-1/2 -translate-x-1/2`, but when the audio companion's
              // currentTime/slider state updated, the pill's width changed by
              // sub-pixel amounts which moved the translate origin and made
              // the whole toolbar shake. With a non-transformed wrapper the
              // pill grows/shrinks symmetrically around the center.
              className="absolute inset-x-0 z-30 top-2 flex justify-center pointer-events-none"
              style={{ touchAction: 'none' } as React.CSSProperties}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <div className="pointer-events-auto flex items-center gap-1 bg-background/95 backdrop-blur-md border border-border shadow-lg rounded-full px-2 py-1">
                {/* Zoom Controls */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleScaleZoomOut}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleScaleZoomOut(); }}
                  disabled={scale <= 0.5}
                  className="h-9 w-9 lg:h-7 lg:w-7 p-0 touch-manipulation rounded-full"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-5 w-5 lg:h-3.5 lg:w-3.5" />
                </Button>
                <button
                  type="button"
                  onClick={handleScaleReset}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleScaleReset(); }}
                  className="text-xs font-medium tabular-nums min-w-[32px] text-center touch-manipulation"
                  aria-label="Fit to width"
                  title="Fit to width"
                >
                  {Math.round(scale * 100)}%
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleScaleZoomIn}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleScaleZoomIn(); }}
                  disabled={scale >= 3}
                  className="h-9 w-9 lg:h-7 lg:w-7 p-0 touch-manipulation rounded-full"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-5 w-5 lg:h-3.5 lg:w-3.5" />
                </Button>

                <div className="w-px h-4 bg-border mx-0.5" />
                
                {/* Audio Companion */}
                {showAudioCompanion ? (
                  <AudioCompanionControls onClose={() => setShowAudioCompanion(false)} musicId={musicId} />
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowAudioCompanion(true)}
                    onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setShowAudioCompanion(true); }}
                    aria-label="Listen along with audio"
                    className="h-9 w-9 lg:h-7 lg:w-7 p-0 touch-manipulation rounded-full"
                  >
                    <Music className="h-5 w-5 lg:h-3.5 lg:w-3.5" />
                  </Button>
                )}
                
                {/* Piano Button */}
                <Button
                  size="sm"
                  variant={showPiano ? "secondary" : "ghost"}
                  onClick={() => setShowPiano(!showPiano)}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setShowPiano(!showPiano); }}
                  aria-label={showPiano ? "Hide piano" : "Show piano"}
                  className={`h-7 w-7 p-0 touch-manipulation rounded-full ${showPiano ? 'bg-[var(--tint)] text-[var(--tint-contrast)]' : ''}`}
                >
                  <Piano className="h-5 w-5 lg:h-3.5 lg:w-3.5" />
                </Button>
                
                {/* Annotate Button */}
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => { setError(null); setAnnotationMode(true); }}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setError(null); setAnnotationMode(true); }}
                  aria-label="Enable annotations"
                  className="h-9 w-9 lg:h-7 lg:w-7 p-0 touch-manipulation rounded-full"
                >
                  <Palette className="h-5 w-5 lg:h-3.5 lg:w-3.5" />
                </Button>

                {/* Extra toolbar actions (e.g. Crop/Close on mobile) */}
                {toolbarActions && (
                  <>
                    <div className="w-px h-4 bg-border mx-0.5" />
                    {toolbarActions}
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* React PDF Viewer - Show when not in annotation mode */}
          {signedUrl && !annotationMode && (
            <div 
              className="w-full overflow-auto flex justify-center flex-1" 
              ref={containerRef}
              onTouchStart={(e) => {
                // Handle pinch-to-zoom start
                if (e.touches.length === 2) {
                  const dx = e.touches[0].clientX - e.touches[1].clientX;
                  const dy = e.touches[0].clientY - e.touches[1].clientY;
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  setInitialPinchDistance(distance);
                  setInitialZoom(scale);
                  return;
                }
                handleTouchStart(e);
              }}
              onTouchMove={(e) => {
                // Handle pinch-to-zoom
                if (e.touches.length === 2 && initialPinchDistance !== null) {
                  const dx = e.touches[0].clientX - e.touches[1].clientX;
                  const dy = e.touches[0].clientY - e.touches[1].clientY;
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  const scaleChange = distance / initialPinchDistance;
                  const newScale = Math.max(0.5, Math.min(3, initialZoom * scaleChange));
                  userZoomedRef.current = true;
                  setScale(newScale);
                  return;
                }
                handleTouchMove(e);
              }}
              onTouchEnd={(e) => {
                setInitialPinchDistance(null);
                handleTouchEnd(e);
              }}
              onClick={handleMouseClick}
              style={{ 
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-x pan-y pinch-zoom'
              } as React.CSSProperties}
            >
              <canvas
                ref={canvasRef}
                className="block bg-white transition-opacity duration-300 mx-auto"
                style={{ 
                  width: `${scale * 100}%`,
                  maxWidth: scale > 1 ? 'none' : '100%',
                  height: 'auto', 
                  opacity: isLoading ? 0.6 : 1
                }}
              />
            </div>
          )}

          {/* Annotation Mode: PDF + Overlay Canvas with Zoom */}
          {annotationMode && (
            <div 
              className="w-full overflow-auto flex-1" 
              style={{
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-x pan-y'
              } as React.CSSProperties}
              ref={containerRef}
              onTouchStart={handleAnnotationPinchStart}
              onTouchMove={handleAnnotationPinchMove}
              onTouchEnd={handleAnnotationPinchEnd}
            >
              {/* Apple Pencil hover preview. Pinned to the scroll container
                  so it tracks pointer coords regardless of zoom/scroll. */}
              {hoverPos && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute z-40 rounded-full border-2"
                  style={{
                    left: hoverPos.x - hoverPos.size / 2,
                    top: hoverPos.y - hoverPos.size / 2,
                    width: hoverPos.size,
                    height: hoverPos.size,
                    borderColor: brushColor,
                    backgroundColor: `${brushColor}22`,
                  }}
                />
              )}
              <div
                className="relative origin-top-left"
                style={{ 
                  transform: `scale(${zoomLevel})`,
                  width: `${100 / zoomLevel}%`,
                  minWidth: zoomLevel > 1 ? '100%' : undefined
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="w-full bg-white block transition-opacity duration-300"
                  style={{ height: 'auto', minHeight: '100%', opacity: isLoading ? 0.6 : 1 }}
                />
                <canvas
                  ref={drawingCanvasRef}
                  className={`absolute top-0 left-0 w-full h-full pointer-events-auto z-20 ${
                    activeTool !== "select" ? "cursor-crosshair touch-none" : "cursor-default"
                  }`}
                  onMouseDown={handleStart}
                  onMouseMove={handleMove}
                  onMouseUp={handleEnd}
                  onMouseLeave={() => setIsDrawing(false)}
                  onTouchStart={(e) => {
                    // Allow pinch-to-zoom when in select mode (2 fingers)
                    if (e.touches.length === 2) {
                      handleAnnotationPinchStart(e);
                      return;
                    }
                    if (activeTool !== "select") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleStart(e);
                    } else {
                      // In select mode, track touch for tap-to-navigate
                      handleTouchStart(e);
                    }
                  }}
                  onTouchMove={(e) => {
                    // Handle pinch-to-zoom
                    if (e.touches.length === 2) {
                      handleAnnotationPinchMove(e);
                      return;
                    }
                    if (activeTool !== "select" && isDrawing) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMove(e);
                    } else if (activeTool === "select") {
                      handleTouchMove(e);
                    }
                  }}
                  onTouchEnd={(e) => {
                    handleAnnotationPinchEnd();
                    if (activeTool !== "select") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEnd();
                    } else {
                      // In select mode, handle tap-to-navigate
                      handleTouchEnd(e);
                    }
                  }}
                  onTouchCancel={() => {
                    setIsDrawing(false);
                    handleAnnotationPinchEnd();
                  }}
                />
              </div>
            </div>
          )}

          {/* Touch/Click zones visual hint - only show when not in drawing mode */}
          {!annotationMode || activeTool === "select" ? (
            <>
              {/* Left tap zone */}
              <div className="absolute left-0 top-0 w-1/3 h-full z-10 flex items-center justify-start pl-4 opacity-0 hover:opacity-20 transition-opacity pointer-events-none">
                <div className="bg-primary/30 rounded-full p-2">
                  <ChevronLeft className="h-6 w-6 text-primary" />
                </div>
              </div>
              {/* Right tap zone */}
              <div className="absolute right-0 top-0 w-1/3 h-full z-10 flex items-center justify-end pr-4 opacity-0 hover:opacity-20 transition-opacity pointer-events-none">
                <div className="bg-primary/30 rounded-full p-2">
                  <ChevronRight className="h-6 w-6 text-primary" />
                </div>
              </div>
            </>
          ) : null}

          {/* Page navigation — bottom-right corner. Previously top-right,
              but it collided with the centered audio companion pill once
              the speed selector pushed that pill wider. Bottom-right keeps
              it well out of the top toolbar's growing footprint and reads
              like a normal page indicator. Hidden on mobile (mobile uses
              a dedicated bottom control bar). */}
          {signedUrl && totalPages > 1 && !isInMobileViewer && !chromeless && (
             <div
              className="absolute right-2 z-30 bottom-2"
              style={{ touchAction: 'none' } as React.CSSProperties}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-0.5 rounded-full border bg-background/95 backdrop-blur-md shadow-md px-1.5 py-0.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-full touch-manipulation" 
                  onClick={prevPage}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); prevPage(); }}
                  disabled={isLoading || currentPage <= 1}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs tabular-nums font-medium min-w-[36px] text-center">
                  {currentPage} / {totalPages || (pdf?.numPages ?? 0) || 1}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 rounded-full touch-manipulation" 
                  onClick={nextPage}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); nextPage(); }}
                  disabled={isLoading || currentPage >= (totalPages || (pdf?.numPages ?? 0) || 1)}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      {/* Mobile bottom control bar - always visible, not overlaying the PDF */}
      {isInMobileViewer && !annotationMode && (
        <div 
          className="flex-shrink-0 bg-background/95 backdrop-blur-sm border-t border-border px-3 py-2"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
        >
          <div className="flex items-center justify-between gap-2">
            {/* Left: Zoom controls */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleScaleZoomOut}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleScaleZoomOut(); }}
                disabled={scale <= 0.5}
                className="h-8 w-8 p-0 touch-manipulation rounded-full"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={handleScaleReset}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleScaleReset(); }}
                className="text-xs font-medium tabular-nums min-w-[32px] text-center touch-manipulation"
                aria-label="Fit to width"
                title="Fit to width"
              >
                {Math.round(scale * 100)}%
              </button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleScaleZoomIn}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleScaleZoomIn(); }}
                disabled={scale >= 3}
                className="h-8 w-8 p-0 touch-manipulation rounded-full"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            {/* Center: Page navigation */}
            {signedUrl && totalPages > 1 && (
              <div className="flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 rounded-full touch-manipulation" 
                  onClick={prevPage}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); prevPage(); }}
                  disabled={isLoading || currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs tabular-nums font-medium min-w-[40px] text-center">
                  {currentPage} / {totalPages || (pdf?.numPages ?? 0) || 1}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 rounded-full touch-manipulation" 
                  onClick={nextPage}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); nextPage(); }}
                  disabled={isLoading || currentPage >= (totalPages || (pdf?.numPages ?? 0) || 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Right: Tools */}
            <div className="flex items-center gap-1">
              {showAudioCompanion ? (
                <AudioCompanionControls onClose={() => setShowAudioCompanion(false)} musicId={musicId} />
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAudioCompanion(true)}
                  onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setShowAudioCompanion(true); }}
                  aria-label="Listen along"
                  className="h-8 w-8 p-0 touch-manipulation rounded-full"
                >
                  <Music className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                variant={showPiano ? "secondary" : "ghost"}
                onClick={() => setShowPiano(!showPiano)}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setShowPiano(!showPiano); }}
                aria-label={showPiano ? "Hide piano" : "Show piano"}
                className={`h-8 w-8 p-0 touch-manipulation rounded-full ${showPiano ? 'bg-[var(--tint)] text-[var(--tint-contrast)]' : ''}`}
              >
                <Piano className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="default"
                onClick={() => { setError(null); setAnnotationMode(true); }}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); setError(null); setAnnotationMode(true); }}
                aria-label="Enable annotations"
                className="h-8 w-8 p-0 touch-manipulation rounded-full"
              >
                <Palette className="h-4 w-4" />
              </Button>
              {musicId && (
                <BookmarksMenu
                  sheetMusicId={musicId}
                  currentPage={currentPage}
                  onJumpToPage={goToPage}
                />
              )}
              {/* Extra toolbar actions (e.g. Crop/Close) */}
              {toolbarActions}
            </div>
          </div>
        </div>
      )}

      {showSavePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="bg-background border rounded-md shadow-lg p-4 w-full max-w-sm">
            <h3 className="text-sm font-semibold mb-2">Save annotations?</h3>
            <p className="text-xs text-muted-foreground mb-3">You have unsaved annotations. Save before exiting?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowSavePrompt(false); promptResolveRef.current?.(false); }}>Cancel</Button>
              <Button variant="outline" size="sm" onClick={() => { setPaths([]); setHasAnnotations(false); setShowSavePrompt(false); promptResolveRef.current?.(true); }}>Discard</Button>
              <Button size="sm" onClick={async () => { await handleSave(); setShowSavePrompt(false); promptResolveRef.current?.(true); }}>Save</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Dockable Piano Overlay */}
      {showPiano && (
        <DockablePiano onClose={() => setShowPiano(false)} />
      )}
    </Card>
  );
});