import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, FabricImage } from "fabric";
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
  Move,
  MousePointer
} from "lucide-react";
import { toast } from "sonner";

interface AnnotationCanvasProps {
  backgroundImageUrl?: string;
  initialAnnotations?: string; // JSON string of canvas state
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
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<"select" | "draw" | "erase">("draw");
  const [brushSize, setBrushSize] = useState([3]);
  const [brushColor, setBrushColor] = useState("#ff0000");
  const [isLoading, setIsLoading] = useState(false);
  const [canvasHistory, setCanvasHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Canvas dimensions
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 1000;

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      backgroundColor: "#ffffff",
      selection: activeTool === "select",
    });

    // Configure drawing brush
    canvas.freeDrawingBrush.color = brushColor;
    canvas.freeDrawingBrush.width = brushSize[0];

    setFabricCanvas(canvas);

    // Load background image if provided
    if (backgroundImageUrl) {
      loadBackgroundImage(canvas, backgroundImageUrl);
    }

    // Load initial annotations if provided
    if (initialAnnotations) {
      try {
        canvas.loadFromJSON(initialAnnotations);
      } catch (error) {
        console.error('Error loading initial annotations:', error);
      }
    }

    // Save initial state to history
    saveToHistory(canvas);

    // Listen for canvas changes
    canvas.on('path:created', () => {
      saveToHistory(canvas);
      onAnnotationChange?.(true);
    });

    canvas.on('object:added', () => {
      onAnnotationChange?.(true);
    });

    canvas.on('object:removed', () => {
      const hasObjects = canvas.getObjects().filter(obj => obj.type !== 'image').length > 0;
      onAnnotationChange?.(hasObjects);
    });

    return () => {
      canvas.dispose();
    };
  }, []);

  const loadBackgroundImage = async (canvas: FabricCanvas, imageUrl: string) => {
    try {
      const img = await FabricImage.fromURL(imageUrl);
      
      // Scale image to fit canvas while maintaining aspect ratio
      const scaleX = CANVAS_WIDTH / img.width!;
      const scaleY = CANVAS_HEIGHT / img.height!;
      const scale = Math.min(scaleX, scaleY);
      
      img.scale(scale);
      img.set({
        left: (CANVAS_WIDTH - img.width! * scale) / 2,
        top: (CANVAS_HEIGHT - img.height! * scale) / 2,
        selectable: false,
        evented: false,
        excludeFromExport: false
      });
      
      canvas.add(img);
      canvas.sendObjectToBack(img);
      canvas.renderAll();
    } catch (error) {
      console.error('Error loading background image:', error);
      toast.error('Failed to load sheet music image');
    }
  };

  const saveToHistory = useCallback((canvas: FabricCanvas) => {
    const state = JSON.stringify(canvas.toJSON());
    setCanvasHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  useEffect(() => {
    if (!fabricCanvas) return;

    // Update drawing mode and brush settings
    fabricCanvas.isDrawingMode = activeTool === "draw";
    fabricCanvas.selection = activeTool === "select";
    
    if (fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = brushColor;
      fabricCanvas.freeDrawingBrush.width = brushSize[0];
    }

    // Configure eraser mode
    if (activeTool === "erase") {
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.freeDrawingBrush.color = "#ffffff";
      fabricCanvas.freeDrawingBrush.width = brushSize[0] * 2;
    }
  }, [activeTool, brushSize, brushColor, fabricCanvas]);

  const handleToolClick = (tool: typeof activeTool) => {
    setActiveTool(tool);
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    
    // Keep background image, remove annotations only
    const objects = fabricCanvas.getObjects();
    const backgroundImage = objects.find(obj => obj.type === 'image');
    
    fabricCanvas.clear();
    
    if (backgroundImage) {
      fabricCanvas.add(backgroundImage);
      fabricCanvas.sendObjectToBack(backgroundImage);
    }
    
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    saveToHistory(fabricCanvas);
    onAnnotationChange?.(false);
    toast.success("Annotations cleared!");
  };

  const handleUndo = () => {
    if (!fabricCanvas || historyIndex <= 0) return;
    
    const previousState = canvasHistory[historyIndex - 1];
    fabricCanvas.loadFromJSON(previousState).then(() => {
      fabricCanvas.renderAll();
      setHistoryIndex(prev => prev - 1);
    });
  };

  const handleRedo = () => {
    if (!fabricCanvas || historyIndex >= canvasHistory.length - 1) return;
    
    const nextState = canvasHistory[historyIndex + 1];
    fabricCanvas.loadFromJSON(nextState).then(() => {
      fabricCanvas.renderAll();
      setHistoryIndex(prev => prev + 1);
    });
  };

  const handleSave = async () => {
    if (!fabricCanvas) return;
    
    setIsLoading(true);
    try {
      // Get canvas data as JSON
      const canvasData = JSON.stringify(fabricCanvas.toJSON());
      
      // Export as image
      const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 0.9,
        multiplier: 2 // Higher resolution
      });
      
      // Convert to blob
      const response = await fetch(dataURL);
      const blob = await response.blob();
      
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
    if (!fabricCanvas) return;
    
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 0.9,
      multiplier: 2
    });
    
    const link = document.createElement('a');
    link.download = `marked-score-${Date.now()}.png`;
    link.href = dataURL;
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
                onClick={() => handleToolClick("select")}
              >
                <MousePointer className="h-4 w-4" />
                Select
              </Button>
              <Button
                variant={activeTool === "draw" ? "default" : "outline"}
                size="sm"
                onClick={() => handleToolClick("draw")}
              >
                <Pencil className="h-4 w-4" />
                Draw
              </Button>
              <Button
                variant={activeTool === "erase" ? "default" : "outline"}
                size="sm"
                onClick={() => handleToolClick("erase")}
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
                  className="w-8 h-8 p-0 rounded-full"
                  style={{ backgroundColor: color }}
                  onClick={() => setBrushColor(color)}
                >
                  {brushColor === color && (
                    <div className="w-3 h-3 bg-white rounded-full" />
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

            {/* History Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
              >
                <Undo className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex >= canvasHistory.length - 1}
              >
                <Redo className="h-4 w-4" />
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
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
                <Save className="h-4 w-4" />
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas */}
      <Card>
        <CardContent className="p-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
            <canvas 
              ref={canvasRef} 
              className="max-w-full"
              style={{ display: 'block' }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
