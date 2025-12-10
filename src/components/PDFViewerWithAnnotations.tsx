import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
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
  Share2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSheetMusicUrl } from '@/hooks/useSheetMusicUrl';
import { useSheetMusicAnnotations } from '@/hooks/useSheetMusicAnnotations';
import { cn } from '@/lib/utils';
import { AnnotationShareButton } from '@/components/music-library/AnnotationShareButton';
import * as pdfjsLib from 'pdfjs-dist';
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.mjs?worker';

// Configure PDF.js worker locally (Vite + ESM)
pdfjsLib.GlobalWorkerOptions.workerPort = new PdfJsWorker();

interface PDFViewerWithAnnotationsProps {
  pdfUrl: string | null;
  musicId?: string;
  musicTitle?: string;
  className?: string;
  startInAnnotationMode?: boolean;
}
interface PDFViewerHandle {
  promptToSaveIfDirty: () => Promise<boolean>;
}

export const PDFViewerWithAnnotations = forwardRef<PDFViewerHandle, PDFViewerWithAnnotationsProps>(({ 
  pdfUrl, 
  musicId, 
  musicTitle,
  className = "",
  startInAnnotationMode = false,
}: PDFViewerWithAnnotationsProps, ref) => {
  const { user } = useAuth();
  const { signedUrl, loading: urlLoading, error: urlError } = useSheetMusicUrl(pdfUrl);
  const { 
    annotations, 
    loading: annotationsLoading, 
    saveAnnotation, 
    fetchAnnotations 
  } = useSheetMusicAnnotations(musicId);
  
  // Initialize the default layout plugin
const scrollModePluginInstance = scrollModePlugin();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState<"select" | "draw" | "erase">("select");
  const [brushSize, setBrushSize] = useState([3]);
  const [brushColor, setBrushColor] = useState("#ff0000");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paths, setPaths] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState<any>(null);
  const [hasAnnotations, setHasAnnotations] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);
  
  // Touch navigation state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number; time: number } | null>(null);

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
  
  useImperativeHandle(ref, () => ({
    promptToSaveIfDirty,
  }));
  
  // PDF-specific state
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [zoomLevel, setZoomLevel] = useState(1); // Zoom level for annotation mode
  const [pageAnnotations, setPageAnnotations] = useState<Record<number, any[]>>({});
  const [useGoogle, setUseGoogle] = useState(false);
  const [googleProvider, setGoogleProvider] = useState<'gview' | 'viewerng'>('gview');
const timerRef = useRef<number | null>(null);
const [engine, setEngine] = useState<'google' | 'react'>('google');

  // Pinch-to-zoom state for annotation mode
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);

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

  // Zoom controls for annotation mode
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  // Zoom controls for normal viewing mode (scale)
  const handleScaleZoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.2, 3));
  }, []);

  const handleScaleZoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.2, 0.5));
  }, []);

  const handleScaleReset = useCallback(() => {
    setScale(1.2);
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
      setZoomLevel(newZoom);
    }
  }, [initialPinchDistance, initialZoom]);

  const handleAnnotationPinchEnd = useCallback(() => {
    setInitialPinchDistance(null);
  }, []);

  // Touch navigation functions
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Allow multi-touch gestures (pinch zoom) to pass through
    if (e.touches.length > 1) return;
    
    // Don't handle navigation when in annotation mode or on scrollable areas
    if (annotationMode) return;
    
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
  }, [annotationMode]);

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
    // Don't handle navigation when in annotation mode
    if (annotationMode) return;

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
        }
        // Middle zone does nothing to avoid accidental navigation
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

    // Ignore the synthetic click following a touch interaction
    if (Date.now() < suppressClickUntilRef.current) {
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
    setIsDrawing(true);
    const pos = getEventPos(e);
    
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
        positionData
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

    // Load and render saved annotations
    const loadedPaths = pageAnnotations
      .filter(ann => ann.annotation_type === 'drawing')
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

  // Load PDF document once
  useEffect(() => {
    if (!signedUrl) return;

    let cancelled = false;

    const loadPdfDoc = async () => {
      try {
        setIsLoading(true);

        let doc;
        try {
          doc = await pdfjsLib.getDocument({ 
            url: signedUrl,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
            cMapPacked: true,
            disableAutoFetch: false,
            disableStream: false
          }).promise;
        } catch (primaryErr) {
          const resp = await fetch(signedUrl);
          if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
          const ab = await resp.arrayBuffer();
          doc = await pdfjsLib.getDocument({ 
            data: ab,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
            cMapPacked: true
          }).promise;
        }

        if (cancelled) return;
        setPdf(doc);
        setTotalPages(doc.numPages);
        setError(null);
      } catch (err) {
        toast.error('Failed to load PDF');
        setError('Failed to load PDF');
      } finally {
        setIsLoading(false);
      }
    };

    loadPdfDoc();

    return () => {
      cancelled = true;
    };
  }, [signedUrl]);

  // Render PDF page when pdf, currentPage, or scale changes
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    let cancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage);
        const canvas = canvasRef.current;
        if (!canvas || cancelled) return;
        
        const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        if (!ctx) return;

        // Use the current scale state for rendering
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch (err) {
        console.error('Error rendering page:', err);
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [pdf, currentPage, scale, annotationMode]);

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
    <Card className={cn("w-full", className)}>
      {/* Annotation Toolbar */}
        {annotationMode && (
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 sm:gap-2 sm:p-2 bg-muted/50 rounded-t-lg border-b">
            {/* Save Button */}
            {hasAnnotations && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !musicId}
                className="h-7 px-1.5 text-xs sm:h-8 sm:px-2"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" />
                ) : (
                  <span className="text-xs">Save</span>
                )}
              </Button>
            )}

            {/* Tool Selection */}
            <div className="flex gap-0.5 sm:gap-1">
              <Button
                variant={activeTool === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("select")}
                className="h-7 w-7 p-0 sm:h-8 sm:w-8"
              >
                <MousePointer className="h-3 w-3" />
              </Button>
              <Button
                variant={activeTool === "draw" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("draw")}
                className="h-7 w-7 p-0 sm:h-8 sm:w-8"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant={activeTool === "erase" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("erase")}
                className="h-7 w-7 p-0 sm:h-8 sm:w-8"
              >
                <Eraser className="h-3 w-3" />
              </Button>
            </div>

            {/* Color Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 sm:h-8 sm:w-8 rounded-full border-2"
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
                      className="h-8 w-8 p-0 rounded-full"
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

            {/* Size */}
            <div className="flex items-center gap-1 min-w-14 sm:min-w-16">
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
            <div className="flex items-center gap-0.5 sm:gap-1 border-l pl-1.5 sm:pl-2 ml-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                title="Zoom out"
              >
                <ZoomOut className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetZoom}
                className="h-7 px-1.5 text-xs sm:h-8 sm:px-2"
                title="Reset zoom"
              >
                {Math.round(zoomLevel * 100)}%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                className="h-7 w-7 p-0 sm:h-8 sm:w-8"
                title="Zoom in"
              >
                <ZoomIn className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-0.5 sm:gap-1 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={paths.length === 0}
                className="h-8 w-8 p-0 sm:h-9 sm:w-9"
              >
                <Undo className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={paths.length === 0}
                className="h-8 w-8 p-0 sm:h-9 sm:w-9"
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

      {/* PDF Content */}
      <CardContent className="p-0">
        <div 
          className="relative w-full overflow-y-auto overflow-x-hidden"
          style={{ 
            maxHeight: 'calc(100vh - 12rem)',
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

          {!annotationMode && (
            <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-card/95 backdrop-blur border border-border rounded-lg p-1 shadow-lg">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleScaleZoomOut}
                  disabled={scale <= 0.5}
                  className="h-8 w-8 p-0"
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleScaleReset}
                  className="h-8 px-2 text-xs font-medium"
                  title="Reset zoom"
                >
                  {Math.round(scale * 100)}%
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleScaleZoomIn}
                  disabled={scale >= 3}
                  className="h-8 w-8 p-0"
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Annotate Button */}
              <Button
                size="sm"
                variant="default"
                onClick={() => { 
                  setError(null); 
                  setAnnotationMode(true); 
                }}
                aria-label="Enable annotations"
                title="Click to enable drawing and annotations"
                className="shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground md:text-base text-xs md:h-10 h-8 md:px-4 px-2"
              >
                <Palette className="md:h-5 md:w-5 h-3 w-3 mr-1 md:mr-2" />
                <span className="font-semibold">Annotate</span>
              </Button>
            </div>
          )}
          
          {/* React PDF Viewer - Show when not in annotation mode */}
          {signedUrl && !annotationMode && (
            <div 
              className="w-full" 
              ref={containerRef}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onClick={handleMouseClick}
            >
              <canvas
                ref={canvasRef}
                className="w-full max-w-full block bg-white transition-opacity duration-300"
                style={{ height: 'auto', minHeight: '100%', width: '100%', maxWidth: '100%', opacity: isLoading ? 0.6 : 1 }}
              />
            </div>
          )}

          {/* Annotation Mode: PDF + Overlay Canvas with Zoom */}
          {annotationMode && (
            <div 
              className="w-full overflow-auto" 
              style={{ 
                maxHeight: 'calc(100vh - 18rem)', 
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-x pan-y'
              } as React.CSSProperties} 
              ref={containerRef}
              onTouchStart={handleAnnotationPinchStart}
              onTouchMove={handleAnnotationPinchMove}
              onTouchEnd={handleAnnotationPinchEnd}
            >
              <div 
                className="relative origin-top-left transition-transform duration-100"
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
                    }
                  }}
                  onTouchEnd={(e) => {
                    handleAnnotationPinchEnd();
                    if (activeTool !== "select") {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEnd();
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

          {signedUrl && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30">
              <div className="flex items-center gap-2 rounded-md border bg-background/80 backdrop-blur px-2 py-1">
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={prevPage} disabled={isLoading || currentPage <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs sm:text-sm tabular-nums">
                  {currentPage} / {totalPages || (pdf?.numPages ?? 0) || 1}
                </span>
                <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={nextPage} disabled={isLoading || currentPage >= (totalPages || (pdf?.numPages ?? 0) || 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      {annotationMode && (
        <div className="text-xs text-muted-foreground text-center p-2 bg-muted/20">
          {hasAnnotations ? "Annotations ready to save" : "Draw on the PDF to add annotations"}
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
    </Card>
  );
});