import { useEffect, useRef, useState, useCallback } from "react";
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
  ZoomOut
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useSheetMusicUrl } from '@/hooks/useSheetMusicUrl';
import { cn } from '@/lib/utils';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFViewerWithAnnotationsProps {
  pdfUrl: string | null;
  musicId?: string;
  musicTitle?: string;
  className?: string;
}

export const PDFViewerWithAnnotations = ({ 
  pdfUrl, 
  musicId, 
  musicTitle,
  className = "" 
}: PDFViewerWithAnnotationsProps) => {
  const { user } = useAuth();
  const { signedUrl, loading: urlLoading, error: urlError } = useSheetMusicUrl(pdfUrl);
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
  
  // PDF-specific state
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [pageAnnotations, setPageAnnotations] = useState<Record<number, any[]>>({});

  // Load PDF
  useEffect(() => {
    console.log('PDFViewerWithAnnotations: Effect triggered', { signedUrl, urlLoading, urlError });
    
    if (!signedUrl) {
      console.log('PDFViewerWithAnnotations: No signed URL available');
      return;
    }

    const loadPDF = async () => {
      console.log('PDFViewerWithAnnotations: Starting PDF load from:', signedUrl);
      setIsLoading(true);
      try {
        const loadedPdf = await pdfjsLib.getDocument(signedUrl).promise;
        console.log('PDFViewerWithAnnotations: PDF loaded successfully:', loadedPdf.numPages, 'pages');
        setPdf(loadedPdf);
        setTotalPages(loadedPdf.numPages);
        setCurrentPage(1);
      } catch (error) {
        console.error('PDFViewerWithAnnotations: Error loading PDF:', error);
        console.error('PDFViewerWithAnnotations: Failed URL was:', signedUrl);
        console.error('PDFViewerWithAnnotations: Error details:', JSON.stringify(error, null, 2));
        setError(`Failed to load PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();
  }, [signedUrl]);

  // Render current page
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const page = await pdf.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Update drawing canvas to match
        if (drawingCanvasRef.current) {
          drawingCanvasRef.current.width = viewport.width;
          drawingCanvasRef.current.height = viewport.height;
        }

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };

        await page.render(renderContext).promise;
        
        // Redraw annotations for current page
        redrawAnnotations();
        
        console.log(`Rendered page ${currentPage} at scale ${scale}`);
      } catch (error) {
        console.error('Error rendering page:', error);
      }
    };

    renderPage();
  }, [pdf, currentPage, scale]);

  const handleLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Failed to load PDF. The file might be corrupted or inaccessible.');
  };

  const redrawAnnotations = (pathsToRedraw?: any[]) => {
    if (!drawingCanvasRef.current) return;
    
    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Use page-specific annotations or current paths
    const annotationsToRedraw = pathsToRedraw || pageAnnotations[currentPage] || [];
    
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
    
    // Add to page-specific annotations
    const newPageAnnotations = { ...pageAnnotations };
    if (!newPageAnnotations[currentPage]) {
      newPageAnnotations[currentPage] = [];
    }
    newPageAnnotations[currentPage].push(currentPath);
    setPageAnnotations(newPageAnnotations);
    
    setCurrentPath(null);
    setHasAnnotations(true);
  };

  const handleClear = () => {
    const newPageAnnotations = { ...pageAnnotations };
    newPageAnnotations[currentPage] = [];
    setPageAnnotations(newPageAnnotations);
    
    // Check if any pages still have annotations
    const stillHasAnnotations = Object.values(newPageAnnotations).some(annotations => annotations.length > 0);
    setHasAnnotations(stillHasAnnotations);
    
    redrawAnnotations([]);
    toast.success("Page annotations cleared!");
  };

  const handleUndo = () => {
    const currentPagePaths = pageAnnotations[currentPage] || [];
    if (currentPagePaths.length === 0) return;
    
    const newPageAnnotations = { ...pageAnnotations };
    newPageAnnotations[currentPage] = currentPagePaths.slice(0, -1);
    setPageAnnotations(newPageAnnotations);
    
    redrawAnnotations(newPageAnnotations[currentPage]);
    
    // Check if any pages still have annotations
    const stillHasAnnotations = Object.values(newPageAnnotations).some(annotations => annotations.length > 0);
    setHasAnnotations(stillHasAnnotations);
  };

  const handleSave = async () => {
    if (!canvasRef.current || !drawingCanvasRef.current || !user || !musicId) {
      toast.error("Cannot save - missing required information");
      return;
    }
    
    setIsSaving(true);
    try {
      // Create composite canvas
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = canvasRef.current.width;
      compositeCanvas.height = canvasRef.current.height;
      const compositeCtx = compositeCanvas.getContext('2d');
      
      if (!compositeCtx) throw new Error('Could not create composite canvas');
      
      // Draw background PDF and annotations
      compositeCtx.drawImage(canvasRef.current, 0, 0);
      compositeCtx.drawImage(drawingCanvasRef.current, 0, 0);
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        compositeCanvas.toBlob((blob) => {
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
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('marked-scores')
        .getPublicUrl(filePath);
      
      // Save to database
      const { error: dbError } = await supabase
        .from('gw_marked_scores')
        .insert({
          music_id: musicId,
          uploader_id: user.id,
          voice_part: `Page ${currentPage}`,
          file_url: publicUrl,
          description: `Annotated ${musicTitle || 'Score'} - Page ${currentPage}`,
          canvas_data: JSON.stringify(pageAnnotations)
        });
      
      if (dbError) throw dbError;
      
      toast.success("Annotated score saved successfully!");
      
      // Clear current page annotations after saving
      const newPageAnnotations = { ...pageAnnotations };
      newPageAnnotations[currentPage] = [];
      setPageAnnotations(newPageAnnotations);
      
      // Check if any pages still have annotations
      const stillHasAnnotations = Object.values(newPageAnnotations).some(annotations => annotations.length > 0);
      setHasAnnotations(stillHasAnnotations);
      
      redrawAnnotations([]);
      setAnnotationMode(false);
    } catch (error) {
      console.error('Error saving annotated score:', error);
      toast.error("Failed to save annotated score");
    } finally {
      setIsSaving(false);
    }
  };

  // Navigation functions
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.2, 3));
  };

  const handleZoomOut = () => {
    setScale(Math.max(scale - 0.2, 0.5));
  };

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

  if (error) {
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
    <Card className={cn("w-full max-w-6xl mx-auto", className)}>
      {/* Navigation and Annotation Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-t-lg border-b">
        {/* PDF Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium px-2">
            {currentPage} / {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 border-l pl-2 ml-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs px-2">{Math.round(scale * 100)}%</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 3}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Annotation Toggle */}
        <div className="border-l pl-2 ml-2">
          <Button
            variant={annotationMode ? "default" : "outline"}
            size="sm"
            onClick={() => setAnnotationMode(!annotationMode)}
          >
            <Palette className="h-4 w-4 mr-2" />
            {annotationMode ? "Exit Annotations" : "Annotate"}
          </Button>
        </div>

        {annotationMode && (
          <>
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
                disabled={(pageAnnotations[currentPage] || []).length === 0}
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={(pageAnnotations[currentPage] || []).length === 0}
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
            </div>
          </>
        )}
      </div>

      {/* PDF Content */}
      <CardContent className="p-4">
        <div className="relative w-full overflow-auto bg-gray-100 rounded border">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}
          
          <div className="flex justify-center p-4">
            <div className="relative bg-white shadow-lg">
              {/* PDF Canvas */}
              <canvas 
                ref={canvasRef}
                className="block"
              />
              
              {/* Drawing overlay canvas */}
              {annotationMode && (
                <canvas 
                  ref={drawingCanvasRef}
                  className={`absolute inset-0 ${
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
              )}
            </div>
          </div>
        </div>
      </CardContent>
      
      {annotationMode && (
        <div className="text-xs text-muted-foreground text-center p-2 bg-muted/20">
          {(pageAnnotations[currentPage] || []).length > 0 ? "Page annotations ready to save" : "Draw on the PDF to add annotations"}
        </div>
      )}
    </Card>
  );
};