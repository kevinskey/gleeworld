import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { Viewer, Worker, ScrollMode } from '@react-pdf-viewer/core';

import '@react-pdf-viewer/core/lib/styles/index.css';

import { scrollModePlugin } from '@react-pdf-viewer/scroll-mode';

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { cn } from '@/lib/utils';
import { AnnotationSharingDialog } from '@/components/marked-scores/AnnotationSharingDialog';
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
  
  // Initialize the default layout plugin
const scrollModePluginInstance = scrollModePlugin();
  
  console.log('PDFViewerWithAnnotations: Props received:', { pdfUrl, musicTitle });
  console.log('PDFViewerWithAnnotations: URL processing result:', { signedUrl, urlLoading, urlError });
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
    if (clamped !== currentPage) setCurrentPage(clamped);
  }, [currentPage, totalPages, pdf]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

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
      color: activeTool === "erase" ? "#ffffff" : brushColor,
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
      // Convert drawing canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        drawingCanvasRef.current?.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png', 0.9);
      });
      
      // Upload to storage
      const fileName = `${Date.now()}_${user.id}_${musicId}.png`;
      const filePath = `marked-scores/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('marked-scores')
        .upload(filePath, blob);
      if (uploadError) {
        console.error('Storage upload failed:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message || uploadError.name || 'Unknown error'}`);
      }

      // Generate a signed URL (bucket is private by design)
      let signedUrl: string | null = null;
      const { data: signedData, error: signError } = await supabase.storage
        .from('marked-scores')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year
      if (signError) {
        console.warn('Creating signed URL failed, falling back to public URL (bucket must be public to work):', signError);
        const { data: pub } = supabase.storage.from('marked-scores').getPublicUrl(filePath);
        signedUrl = pub.publicUrl;
      } else {
        signedUrl = signedData?.signedUrl || null;
      }

      if (!signedUrl) {
        throw new Error('Could not generate a URL for the saved annotation image');
      }
      
      // Save to database
      const { data, error: dbError } = await supabase
        .from('gw_marked_scores')
        .insert({
          music_id: musicId,
          uploader_id: user.id,
          voice_part: 'Annotated',
          file_url: signedUrl,
          description: `Annotated ${musicTitle || 'Score'}`,
          canvas_data: JSON.stringify(paths),
          is_shareable: true
        })
        .select()
        .maybeSingle();
      
      if (dbError) {
        console.error('DB insert failed:', dbError);
        throw new Error(dbError.message || 'Failed to save metadata');
      }
      
      // Store the marked score ID for sharing
      if (data) {
        setCurrentMarkedScoreId((data as any).id);
      }
      
      toast.success('Annotated score saved successfully!');
      
      // Clear annotations after saving
      setPaths([]);
      setHasAnnotations(false);
      redrawAnnotations([]);
      setAnnotationMode(false);
    } catch (error: any) {
      console.error('Error saving annotated score:', error);
      toast.error(`Failed to save annotated score: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

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
        console.log('Loading PDF for viewing/annotation:', signedUrl);

        // Ensure canvas exists
        const ready = await waitForCanvas();
        if (!ready) return;

        let doc;
        try {
          // Try loading by URL first
          doc = await pdfjsLib.getDocument({ url: signedUrl }).promise;
        } catch (primaryErr) {
          console.warn('Primary PDF load failed, retrying with ArrayBuffer', primaryErr);
          const resp = await fetch(signedUrl);
          if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
          const ab = await resp.arrayBuffer();
          doc = await pdfjsLib.getDocument({ data: ab }).promise;
        }

        if (cancelled) return;
        setPdf(doc);
        setTotalPages(doc.numPages);

        // Render current page
        const page = await doc.getPage(currentPage);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fit page to container width
        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth = containerRef.current?.clientWidth || baseViewport.width;
        const fitScale = Math.max(0.1, containerWidth / baseViewport.width);
        const viewport = page.getViewport({ scale: fitScale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderContext = { canvasContext: ctx, viewport } as const;
        await page.render(renderContext).promise;
        setScale(fitScale);
        console.log('PDF page rendered successfully');
        setError(null);
      } catch (err) {
        console.error('Error loading PDF:', err);
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
  }, [signedUrl, currentPage, scale, annotationMode]);

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
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-t-lg border-b">
            {/* Annotation Toggle */}
            <Button
              variant={annotationMode ? "default" : "outline"}
              size="sm"
              onClick={async () => {
                setError(null);
                setIsLoading(true);
                // If exiting annotation mode, prompt to save if there are unsaved annotations
                const canExit = await promptToSaveIfDirty();
                if (canExit) {
                  setAnnotationMode(false);
                } else {
                  setIsLoading(false);
                }
              }}
            >
              <Palette className="h-4 w-4 mr-2" />
              {annotationMode ? "Exit Annotations" : "Annotate"}
            </Button>

            {/* Tool Selection */}
            <div className="flex gap-1">
              <Button
                variant={activeTool === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("select")}
              >
                <MousePointer className="h-4 w-4" />
              </Button>
              <Button
                variant={activeTool === "draw" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("draw")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant={activeTool === "erase" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("erase")}
              >
                <Eraser className="h-4 w-4" />
              </Button>
            </div>

            {/* Colors */}
            <div className="flex gap-1">
              {colors.map((color) => (
                <Button
                  key={color}
                  variant="outline"
                  size="sm"
                  className="w-6 h-6 p-0 rounded-full"
                  style={{ backgroundColor: color }}
                  onClick={() => setBrushColor(color)}
                >
                  {brushColor === color && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </Button>
              ))}
            </div>

            {/* Size */}
            <div className="flex items-center gap-2 min-w-20">
              <Slider
                value={brushSize}
                onValueChange={setBrushSize}
                min={1}
                max={10}
                step={1}
                className="flex-1"
              />
              <Badge variant="outline">{brushSize[0]}</Badge>
            </div>

            {/* Actions */}
            <div className="flex gap-1 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={paths.length === 0}
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={paths.length === 0}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              {hasAnnotations && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || !musicId}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
              )}
              {currentMarkedScoreId && musicTitle && (
                <AnnotationSharingDialog 
                  markedScoreId={currentMarkedScoreId} 
                  musicTitle={musicTitle}
                >
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </AnnotationSharingDialog>
              )}
            </div>
          </div>
        )}

      {/* PDF Content */}
      <CardContent className="p-0">
        <div className="relative w-full h-[calc(100dvh-10rem)] min-h-[70vh] md:h-[calc(100dvh-9rem)] lg:h-[calc(100dvh-8rem)]">
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
                onClick={() => { setError(null); setIsLoading(true); setAnnotationMode(true); }}
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
            <div className="w-full h-full" ref={containerRef}>
              <canvas
                ref={canvasRef}
                className="w-full h-auto block bg-white"
              />
            </div>
          )}

          {/* Annotation Mode: PDF + Overlay Canvas */}
          {annotationMode && (
            <div className="w-full h-full overflow-auto" ref={containerRef}>
              <div className="relative w-full h-full">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-auto bg-white block"
                  />
                  <canvas
                    ref={drawingCanvasRef}
                    className={`absolute inset-0 w-full h-full pointer-events-auto z-20 ${
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