import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Pencil, 
  Eraser, 
  Save, 
  Trash2, 
  Undo,
  MousePointer,
  Loader2,
  Palette
} from "lucide-react";
import { toast } from "sonner";
import * as pdfjsLib from 'pdfjs-dist';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PDFViewerWithAnnotationsProps {
  pdfUrl: string;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState<"select" | "draw" | "erase">("select");
  const [brushSize, setBrushSize] = useState([3]);
  const [brushColor, setBrushColor] = useState("#ff0000");
  const [isLoading, setIsLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [paths, setPaths] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState<any>(null);
  const [hasAnnotations, setHasAnnotations] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 1000;

  // Load PDF
  useEffect(() => {
    if (!canvasRef.current || !pdfUrl) return;

    const loadPDF = async () => {
      setPdfLoading(true);
      try {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(CANVAS_WIDTH / viewport.width, CANVAS_HEIGHT / viewport.height);
        const scaledViewport = page.getViewport({ scale });
        
        const renderContext = {
          canvasContext: ctx,
          viewport: scaledViewport
        };
        
        await page.render(renderContext).promise;
      } catch (error) {
        console.error('Error loading PDF:', error);
        toast.error('Failed to load PDF');
      } finally {
        setPdfLoading(false);
      }
    };

    loadPDF();
  }, [pdfUrl]);

  // Initialize drawing canvas
  useEffect(() => {
    if (!drawingCanvasRef.current) return;
    
    const canvas = drawingCanvasRef.current;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
  }, []);

  const redrawAnnotations = (pathsToRedraw = paths) => {
    if (!drawingCanvasRef.current) return;
    
    const canvas = drawingCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    pathsToRedraw.forEach(path => {
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
    if (!canvasRef.current || !drawingCanvasRef.current || !user || !musicId) {
      toast.error("Cannot save - missing required information");
      return;
    }
    
    setIsLoading(true);
    try {
      // Create composite canvas
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = CANVAS_WIDTH;
      compositeCanvas.height = CANVAS_HEIGHT;
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
          voice_part: 'Annotated',
          file_url: publicUrl,
          description: `Annotated ${musicTitle || 'Score'}`,
          canvas_data: JSON.stringify(paths)
        });
      
      if (dbError) throw dbError;
      
      toast.success("Annotated score saved successfully!");
      setHasAnnotations(false);
      setPaths([]);
      redrawAnnotations([]);
      setAnnotationMode(false);
    } catch (error) {
      console.error('Error saving annotated score:', error);
      toast.error("Failed to save annotated score");
    } finally {
      setIsLoading(false);
    }
  };

  const colors = ["#ff0000", "#000000", "#0000ff", "#008000", "#800080", "#ffa500"];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Annotation Toolbar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <Button
          variant={annotationMode ? "default" : "outline"}
          size="sm"
          onClick={() => setAnnotationMode(!annotationMode)}
        >
          <Palette className="h-4 w-4 mr-2" />
          {annotationMode ? "Exit Annotations" : "Annotate"}
        </Button>

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
                  disabled={isLoading || !musicId}
                >
                  {isLoading ? (
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

      {/* PDF Canvas */}
      <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        {pdfLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <Loader2 className="h-8 w-8 animate-spin mr-2" />
            <span>Loading PDF...</span>
          </div>
        )}
        
        {/* Background PDF canvas */}
        <canvas 
          ref={canvasRef}
          className="absolute inset-0 w-full h-auto"
          style={{ 
            maxWidth: '100%',
            height: 'auto',
            display: 'block'
          }}
        />
        
        {/* Drawing canvas for annotations */}
        <canvas 
          ref={drawingCanvasRef}
          className={`relative w-full h-auto ${
            annotationMode && activeTool !== "select" ? "cursor-crosshair" : "cursor-default"
          }`}
          style={{ 
            maxWidth: '100%',
            height: 'auto',
            display: 'block'
          }}
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
      
      {annotationMode && (
        <div className="text-xs text-muted-foreground text-center">
          {hasAnnotations ? "Annotations ready to save" : "Draw on the PDF to add annotations"}
        </div>
      )}
    </div>
  );
};