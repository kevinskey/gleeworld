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
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';

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

  console.log('PDFViewerWithAnnotations: Props received:', { pdfUrl, musicTitle });
  console.log('PDFViewerWithAnnotations: URL processing result:', { signedUrl, urlLoading, urlError });
  console.log('PDFViewerWithAnnotations: Component state:', { isLoading, error, annotationMode, hasAnnotations });
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
  const [pageAnnotations, setPageAnnotations] = useState<Record<number, any[]>>({});
  const [useGoogle, setUseGoogle] = useState(false);
  const [googleProvider, setGoogleProvider] = useState<'gview' | 'viewerng'>('gview');
const timerRef = useRef<number | null>(null);
const [engine, setEngine] = useState<'google' | 'react'>('google');

  // Page navigation helpers (annotation mode)
  const goToPage = useCallback((page: number) => {
    const total = totalPages || (pdf?.numPages ?? 0) || 1;
    const clamped = Math.max(1, Math.min(page, total));
    console.log('PDFViewerWithAnnotations: goToPage called', { page, clamped, currentPage, totalPages });
    if (clamped !== currentPage) {
      console.log('PDFViewerWithAnnotations: Setting page to', clamped);
      setCurrentPage(clamped);
    } else {
      console.log('PDFViewerWithAnnotations: Page unchanged, staying at', currentPage);
    }
  }, [currentPage, totalPages, pdf]);

  const nextPage = useCallback(() => {
    console.log('PDFViewerWithAnnotations: nextPage called', { currentPage, totalPages });
    if (isLoading) return;
    if (currentPage < (totalPages || (pdf?.numPages ?? 0) || 1)) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, pdf, isLoading, goToPage]);

  const prevPage = useCallback(() => {
    console.log('PDFViewerWithAnnotations: prevPage called', { currentPage, totalPages });
    if (isLoading) return;
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, isLoading, goToPage]);

  // Touch navigation functions
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (annotationMode && activeTool !== "select") return; // Don't interfere with drawing
    
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    setTouchEnd(null);
  }, [annotationMode, activeTool]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
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
    if (annotationMode && activeTool !== "select") return;

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
    console.log('PDFViewerWithAnnotations: Google Docs viewer loaded successfully');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    console.error('PDFViewerWithAnnotations: Google viewer failed to load', { provider: googleProvider });
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

  useEffect(() => {
    if (!signedUrl) return;

    let cancelled = false;

    const waitForCanvas = async () => {
      // Wait until the canvas ref is mounted before attempting to render
      let attempts = 0;
      while (!cancelled && !canvasRef.current && attempts < 20) {
        await new Promise((r) => requestAnimationFrame(r));
        attempts++;
      }
      return !!canvasRef.current && !cancelled;
    };

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        console.log('PDFViewerWithAnnotations: Loading PDF for viewing:', signedUrl);

        // Ensure canvas exists
        const ready = await waitForCanvas();
        if (!ready) {
          console.error('PDFViewerWithAnnotations: Canvas not ready after waiting');
          return;
        }

        let doc;
        try {
          // Try loading by URL first
          console.log('PDFViewerWithAnnotations: Attempting to load PDF from URL');
          doc = await pdfjsLib.getDocument({ 
            url: signedUrl,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
            cMapPacked: true
          }).promise;
          console.log('PDFViewerWithAnnotations: PDF loaded successfully, pages:', doc.numPages);
        } catch (primaryErr) {
          console.warn('PDFViewerWithAnnotations: Primary PDF load failed, retrying with ArrayBuffer', primaryErr);
          const resp = await fetch(signedUrl);
          if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
          const ab = await resp.arrayBuffer();
          doc = await pdfjsLib.getDocument({ 
            data: ab,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
            cMapPacked: true
          }).promise;
          console.log('PDFViewerWithAnnotations: PDF loaded with ArrayBuffer method, pages:', doc.numPages);
        }

        if (cancelled) return;
        setPdf(doc);
        setTotalPages(doc.numPages);

        // Render current page
        console.log('PDFViewerWithAnnotations: Rendering page', currentPage);
        const page = await doc.getPage(currentPage);
        const canvas = canvasRef.current;
        if (!canvas) {
          console.error('PDFViewerWithAnnotations: Canvas ref lost during render');
          return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('PDFViewerWithAnnotations: Could not get canvas context');
          return;
        }

        // Render at full scale to show complete score length
        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth = containerRef.current?.clientWidth || baseViewport.width;
        
        // Use a scale that maintains readability while showing full height
        const fitScale = Math.max(0.8, Math.min(2.0, containerWidth / baseViewport.width));
        const viewport = page.getViewport({ scale: fitScale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        console.log('PDFViewerWithAnnotations: Canvas dimensions set:', { width: canvas.width, height: canvas.height, scale: fitScale });

        const renderContext = { canvasContext: ctx, viewport } as const;
        await page.render(renderContext).promise;
        setScale(fitScale);
        console.log('PDFViewerWithAnnotations: PDF page rendered successfully');
        setError(null);
      } catch (err) {
        console.error('PDFViewerWithAnnotations: Error loading PDF:', err);
        toast.error('Failed to load PDF');
        setError('Failed to load PDF');
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [signedUrl, currentPage, annotationMode]);

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
            {/* Annotation Toggle */}
            <Button
              variant={annotationMode ? "default" : "outline"}
              size="sm"
              onClick={async () => {
                setError(null);
                setIsLoading(true);
                const canExit = await promptToSaveIfDirty();
                if (canExit) {
                  setAnnotationMode(false);
                } else {
                  setIsLoading(false);
                }
              }}
              className="h-7 px-1.5 text-xs sm:h-8 sm:px-2"
            >
              <Palette className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-0.5 sm:mr-1" />
              <span className="hidden sm:inline text-xs">Exit</span>
            </Button>

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
              {hasAnnotations && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !musicId}
                  className="h-8 px-2 sm:h-9 sm:px-3"
                >
                  {isSaving ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3 sm:h-4 sm:w-4" />
                  )}
                  <span className="ml-1 text-xs sm:text-sm">Save</span>
                </Button>
              )}
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
          style={{ maxHeight: 'calc(100vh - 12rem)' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleMouseClick}
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
            <div className="absolute top-3 left-3 z-20">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { 
                  setError(null); 
                  setAnnotationMode(true); 
                }}
                aria-label="Enable annotations"
                title="Annotate"
              >
                <Palette className="h-4 w-4 mr-2" />
                Annotate
              </Button>
            </div>
          )}
          
          {/* React PDF Viewer - Show when not in annotation mode */}
          {signedUrl && !annotationMode && (
            <div className="w-full" ref={containerRef}>
              <canvas
                ref={canvasRef}
                className="w-full max-w-full block bg-white transition-opacity duration-300"
                style={{ height: 'auto', minHeight: '100%', width: '100%', maxWidth: '100%', opacity: isLoading ? 0.6 : 1 }}
              />
            </div>
          )}

          {/* Annotation Mode: PDF + Overlay Canvas */}
          {annotationMode && (
            <div className="w-full overflow-y-auto" style={{ maxHeight: 'calc(100vh - 18rem)' }} ref={containerRef}>
            <div className="relative w-full">
                <canvas
                  ref={canvasRef}
                  className="w-full bg-white block transition-opacity duration-300"
                  style={{ height: 'auto', minHeight: '100%', opacity: isLoading ? 0.6 : 1 }}
                />
                  <canvas
                    ref={drawingCanvasRef}
                    className={`absolute top-0 left-0 w-full h-full pointer-events-auto z-20 ${
                      activeTool !== "select" ? "cursor-crosshair" : "cursor-default"
                    }`}
                    onMouseDown={handleStart}
                    onMouseMove={handleMove}
                    onMouseUp={handleEnd}
                    onMouseLeave={() => setIsDrawing(false)}
                    onTouchStart={handleStart}
                    onTouchMove={handleMove}
                    onTouchEnd={handleEnd}
                    onTouchCancel={() => setIsDrawing(false)}
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