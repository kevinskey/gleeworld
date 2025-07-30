import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Pencil, 
  Eraser, 
  Download, 
  Save, 
  Trash2, 
  Undo, 
  Redo,
  MousePointer,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface AnnotationCanvasProps {
  backgroundImageUrl?: string;
  initialAnnotations?: string;
  onSave: (canvasData: string, imageBlob: Blob) => Promise<void>;
  onAnnotationChange?: (hasAnnotations: boolean) => void;
}

export const AnnotationCanvas = ({ 
  backgroundImageUrl, 
  initialAnnotations,
  onSave,
  onAnnotationChange 
}: AnnotationCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTool, setActiveTool] = useState<"select" | "draw" | "erase">("draw");
  const [brushSize, setBrushSize] = useState([3]);
  const [brushColor, setBrushColor] = useState("#ff0000");
  const [isLoading, setIsLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [paths, setPaths] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState<any>(null);
  const [hasAnnotations, setHasAnnotations] = useState(false);

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 1000;

  // Initialize canvas and load PDF/image
  useEffect(() => {
    console.log('AnnotationCanvas: Effect triggered', { backgroundImageUrl });
    
    if (!canvasRef.current || !drawingCanvasRef.current) {
      console.log('AnnotationCanvas: Canvas refs not ready');
      return;
    }

    const canvas = canvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    drawingCanvas.width = CANVAS_WIDTH;
    drawingCanvas.height = CANVAS_HEIGHT;

    console.log('AnnotationCanvas: Canvas dimensions set to', CANVAS_WIDTH, 'x', CANVAS_HEIGHT);

    if (backgroundImageUrl) {
      console.log('AnnotationCanvas: Loading background:', backgroundImageUrl);
      loadBackground();
    } else {
      console.log('AnnotationCanvas: No background URL provided');
    }

    // Load initial annotations
    if (initialAnnotations) {
      console.log('AnnotationCanvas: Loading initial annotations');
      try {
        const savedPaths = JSON.parse(initialAnnotations);
        setPaths(savedPaths);
        redrawAnnotations(savedPaths);
      } catch (error) {
        console.error('Error loading initial annotations:', error);
      }
    }
  }, [backgroundImageUrl]);

  const loadBackground = async () => {
    console.log('loadBackground called with URL:', backgroundImageUrl);
    
    if (!backgroundImageUrl || !canvasRef.current) {
      console.log('loadBackground: No URL or canvas ref');
      return;
    }

    setPdfLoading(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('loadBackground: No canvas context');
      return;
    }

    try {
      console.log('loadBackground: Processing URL:', backgroundImageUrl);
      
      if (backgroundImageUrl.toLowerCase().includes('.pdf')) {
        console.log('loadBackground: Detected PDF file, loading with PDF.js');
        // Load PDF and convert first page to image
        const pdf = await pdfjsLib.getDocument(backgroundImageUrl).promise;
        console.log('loadBackground: PDF loaded successfully');
        
        const page = await pdf.getPage(1);
        console.log('loadBackground: First page retrieved');
        
        const viewport = page.getViewport({ scale: 1 });
        const scale = Math.min(CANVAS_WIDTH / viewport.width, CANVAS_HEIGHT / viewport.height);
        const scaledViewport = page.getViewport({ scale });
        
        console.log('loadBackground: Rendering PDF page with scale:', scale);
        
        const renderContext = {
          canvasContext: ctx,
          viewport: scaledViewport
        };
        
        await page.render(renderContext).promise;
        console.log('PDF rendered successfully to canvas');
      } else {
        console.log('loadBackground: Detected image file, loading as image');
        // Load regular image
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          console.log('loadBackground: Image loaded, dimensions:', img.width, 'x', img.height);
          const scale = Math.min(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
          const width = img.width * scale;
          const height = img.height * scale;
          const x = (CANVAS_WIDTH - width) / 2;
          const y = (CANVAS_HEIGHT - height) / 2;
          
          ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.drawImage(img, x, y, width, height);
          console.log('Image rendered successfully to canvas');
        };
        img.onerror = (error) => {
          console.error('loadBackground: Image failed to load:', error);
        };
        img.src = backgroundImageUrl;
      }
    } catch (error) {
      console.error('Error loading background:', error);
      console.error('Background URL was:', backgroundImageUrl);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast.error(`Failed to load background: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPdfLoading(false);
    }
  };

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
      // Touch event (including Apple Pencil)
      const touch = e.touches[0] || e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTool === "select") return;
    
    e.preventDefault(); // Prevent scrolling on touch
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
    
    e.preventDefault(); // Prevent scrolling on touch
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
    onAnnotationChange?.(true);
  };

  const handleClear = () => {
    setPaths([]);
    setHasAnnotations(false);
    redrawAnnotations([]);
    onAnnotationChange?.(false);
    toast.success("Annotations cleared!");
  };

  const handleUndo = () => {
    if (paths.length === 0) return;
    
    const newPaths = paths.slice(0, -1);
    setPaths(newPaths);
    redrawAnnotations(newPaths);
    setHasAnnotations(newPaths.length > 0);
    onAnnotationChange?.(newPaths.length > 0);
  };

  const handleSave = async () => {
    if (!canvasRef.current || !drawingCanvasRef.current) return;
    
    setIsLoading(true);
    try {
      // Create a composite canvas
      const compositeCanvas = document.createElement('canvas');
      compositeCanvas.width = CANVAS_WIDTH;
      compositeCanvas.height = CANVAS_HEIGHT;
      const compositeCtx = compositeCanvas.getContext('2d');
      
      if (!compositeCtx) throw new Error('Could not get composite canvas context');
      
      // Draw background (PDF/image)
      compositeCtx.drawImage(canvasRef.current, 0, 0);
      
      // Draw annotations on top
      compositeCtx.drawImage(drawingCanvasRef.current, 0, 0);
      
      // Convert to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        compositeCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create blob'));
        }, 'image/png', 0.9);
      });
      
      // Save annotations data as JSON
      const canvasData = JSON.stringify(paths);
      
      await onSave(canvasData, blob);
      toast.success("Marked score saved successfully!");
    } catch (error) {
      console.error('Error saving marked score:', error);
      toast.error("Failed to save marked score");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current || !drawingCanvasRef.current) return;
    
    // Create composite canvas
    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = CANVAS_WIDTH;
    compositeCanvas.height = CANVAS_HEIGHT;
    const compositeCtx = compositeCanvas.getContext('2d');
    
    if (!compositeCtx) return;
    
    // Draw background and annotations
    compositeCtx.drawImage(canvasRef.current, 0, 0);
    compositeCtx.drawImage(drawingCanvasRef.current, 0, 0);
    
    // Download
    const link = document.createElement('a');
    link.download = `marked-score-${Date.now()}.png`;
    link.href = compositeCanvas.toDataURL('image/png');
    link.click();
    
    toast.success("Image downloaded!");
  };

  const colors = [
    "#ff0000", // Red
    "#000000", // Black
    "#0000ff", // Blue
    "#008000", // Green
    "#800080", // Purple
    "#ffa500", // Orange
    "#ffff00", // Yellow
  ];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Tool Selection */}
            <div className="flex gap-2">
              <Button
                variant={activeTool === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("select")}
              >
                <MousePointer className="h-4 w-4" />
                Select
              </Button>
              <Button
                variant={activeTool === "draw" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("draw")}
              >
                <Pencil className="h-4 w-4" />
                Draw
              </Button>
              <Button
                variant={activeTool === "erase" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool("erase")}
              >
                <Eraser className="h-4 w-4" />
                Erase
              </Button>
            </div>

            {/* Color Picker */}
            <div className="flex gap-1">
              {colors.map((color) => (
                <Button
                  key={color}
                  variant="outline"
                  size="sm"
                  className="w-8 h-8 p-0 rounded-full border-2"
                  style={{ backgroundColor: color }}
                  onClick={() => setBrushColor(color)}
                >
                  {brushColor === color && (
                    <div className="w-3 h-3 bg-white rounded-full border border-gray-400" />
                  )}
                </Button>
              ))}
            </div>

            {/* Brush Size */}
            <div className="flex items-center gap-2 min-w-32">
              <span className="text-sm">Size:</span>
              <Slider
                value={brushSize}
                onValueChange={setBrushSize}
                min={1}
                max={20}
                step={1}
                className="flex-1"
              />
              <Badge variant="outline">{brushSize[0]}</Badge>
            </div>

            {/* Actions */}
            <div className="flex gap-2 ml-auto">
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
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas */}
      <Card>
        <CardContent className="p-4">
          {pdfLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading sheet music...</span>
            </div>
          )}
          
          <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
            {/* Background canvas (PDF/image) */}
            <canvas 
              ref={canvasRef}
              className="absolute inset-0 w-full h-auto"
              style={{ 
                maxWidth: '100%',
                height: 'auto',
                display: 'block'
              }}
            />
            
            {/* Drawing canvas (annotations) */}
            <canvas 
              ref={drawingCanvasRef}
              className="relative w-full h-auto cursor-crosshair"
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
          
          <div className="mt-2 text-xs text-gray-500 text-center">
            {backgroundImageUrl ? (
              backgroundImageUrl.includes('.pdf') ? 
                'PDF loaded - Use drawing tools to annotate' : 
                'Image loaded - Use drawing tools to annotate'
            ) : (
              'No background loaded - Use drawing tools on blank canvas'
            )}
            {hasAnnotations && (
              <span className="ml-2 text-green-600">• Has annotations</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};