import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Scissors,
  RotateCcw,
  RotateCw,
  Loader2,
  Download,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Grid3X3,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { toast } from "sonner";
import { loadPDF, renderPageToCanvas, cropCanvas, rotateCanvas, PDFPageImage } from "@/utils/pdfToImages";
import { applyCropToPDF, downloadPDF, PageCropSettings } from "@/utils/pdfCropApply";
import { detectDocumentEdges } from "@/utils/documentProcessor";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import * as pdfjsLib from 'pdfjs-dist';

interface CropSettings {
  top: number;
  bottom: number;
  left: number;
  right: number;
  rotation: number;
}

interface PDFCropEditorProps {
  pdfUrl: string;
  title?: string;
  onSave?: (blob: Blob) => Promise<void>;
  onClose?: () => void;
}

export const PDFCropEditor = ({
  pdfUrl,
  title = "PDF Document",
  onSave,
  onClose,
}: PDFCropEditorProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageImage, setPageImage] = useState<PDFPageImage | null>(null);
  const [croppedPreview, setCroppedPreview] = useState<HTMLCanvasElement | null>(null);
  
  const [cropSettings, setCropSettings] = useState<Record<number, CropSettings>>({});
  const [applyToAll, setApplyToAll] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const getCurrentCropSettings = useCallback((): CropSettings => {
    return cropSettings[currentPage] || {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      rotation: 0,
    };
  }, [cropSettings, currentPage]);

  // Load PDF
  useEffect(() => {
    const loadPDFDocument = async () => {
      setIsLoading(true);
      try {
        const pdfDoc = await loadPDF(pdfUrl);
        setPdf(pdfDoc);
        setTotalPages(pdfDoc.numPages);
        
        // Initialize crop settings for all pages
        const initialSettings: Record<number, CropSettings> = {};
        for (let i = 1; i <= pdfDoc.numPages; i++) {
          initialSettings[i] = { top: 0, bottom: 0, left: 0, right: 0, rotation: 0 };
        }
        setCropSettings(initialSettings);
      } catch (error) {
        console.error("Error loading PDF:", error);
        toast.error("Failed to load PDF");
      } finally {
        setIsLoading(false);
      }
    };

    loadPDFDocument();
  }, [pdfUrl]);

  // Render current page
  useEffect(() => {
    const renderPage = async () => {
      if (!pdf) return;
      
      const page = await renderPageToCanvas(pdf, currentPage, 1.5);
      if (page) {
        setPageImage(page);
      }
    };

    renderPage();
  }, [pdf, currentPage]);

  // Update preview when crop settings change
  useEffect(() => {
    if (!pageImage) return;

    const settings = getCurrentCropSettings();
    
    // Apply rotation first
    let canvas = pageImage.canvas;
    if (settings.rotation !== 0) {
      canvas = rotateCanvas(canvas, settings.rotation);
    }
    
    // Then apply crop
    const cropped = cropCanvas(canvas, settings);
    setCroppedPreview(cropped);
  }, [pageImage, cropSettings, currentPage, getCurrentCropSettings]);

  // Draw to visible canvas
  useEffect(() => {
    const canvas = showPreview ? previewCanvasRef.current : canvasRef.current;
    const sourceCanvas = showPreview ? croppedPreview : pageImage?.canvas;
    
    if (!canvas || !sourceCanvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = sourceCanvas.width * zoom;
    canvas.height = sourceCanvas.height * zoom;
    
    ctx.scale(zoom, zoom);
    ctx.drawImage(sourceCanvas, 0, 0);
    
    // Draw grid overlay if enabled
    if (showGrid && !showPreview) {
      drawGridOverlay(ctx, sourceCanvas.width, sourceCanvas.height);
    }
    
    // Draw crop overlay if not in preview mode
    if (!showPreview && pageImage) {
      drawCropOverlay(ctx, pageImage.width, pageImage.height, getCurrentCropSettings());
    }
  }, [pageImage, croppedPreview, showPreview, showGrid, zoom, getCurrentCropSettings]);

  const drawGridOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    for (let i = 1; i < 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Draw horizontal lines
    for (let i = 1; i < 10; i++) {
      const y = (height / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  };

  const drawCropOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number, settings: CropSettings) => {
    const cropTop = (settings.top / 100) * height;
    const cropBottom = (settings.bottom / 100) * height;
    const cropLeft = (settings.left / 100) * width;
    const cropRight = (settings.right / 100) * width;

    // Draw dimmed overlay for cropped areas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    
    // Top area
    ctx.fillRect(0, 0, width, cropTop);
    // Bottom area
    ctx.fillRect(0, height - cropBottom, width, cropBottom);
    // Left area
    ctx.fillRect(0, cropTop, cropLeft, height - cropTop - cropBottom);
    // Right area
    ctx.fillRect(width - cropRight, cropTop, cropRight, height - cropTop - cropBottom);

    // Draw crop border
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      cropLeft,
      cropTop,
      width - cropLeft - cropRight,
      height - cropTop - cropBottom
    );
  };

  const updateCropSetting = (key: keyof CropSettings, value: number) => {
    if (applyToAll) {
      // Apply to all pages
      const newSettings = { ...cropSettings };
      for (let i = 1; i <= totalPages; i++) {
        newSettings[i] = { ...newSettings[i], [key]: value };
      }
      setCropSettings(newSettings);
    } else {
      // Apply to current page only
      setCropSettings(prev => ({
        ...prev,
        [currentPage]: { ...prev[currentPage], [key]: value },
      }));
    }
  };

  const handleAutoDetect = async () => {
    if (!pageImage) return;

    toast.info("Detecting document edges...");
    
    try {
      const corners = detectDocumentEdges(pageImage.canvas);
      if (corners) {
        // Convert corners to crop percentages
        const width = pageImage.width;
        const height = pageImage.height;
        
        const top = (Math.min(corners.topLeft.y, corners.topRight.y) / height) * 100;
        const bottom = ((height - Math.max(corners.bottomLeft.y, corners.bottomRight.y)) / height) * 100;
        const left = (Math.min(corners.topLeft.x, corners.bottomLeft.x) / width) * 100;
        const right = ((width - Math.max(corners.topRight.x, corners.bottomRight.x)) / width) * 100;

        updateCropSetting('top', Math.max(0, Math.round(top)));
        updateCropSetting('bottom', Math.max(0, Math.round(bottom)));
        updateCropSetting('left', Math.max(0, Math.round(left)));
        updateCropSetting('right', Math.max(0, Math.round(right)));

        toast.success("Edge detection applied!");
      } else {
        toast.info("Could not detect clear document edges");
      }
    } catch (error) {
      console.error("Auto detect error:", error);
      toast.error("Failed to detect edges");
    }
  };

  const handleAIAnalyze = async () => {
    if (!pageImage) return;

    toast.info("Analyzing with AI...");
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-pdf-for-cropping', {
        body: {
          pdfImages: [pageImage.dataUrl],
        }
      });

      if (error) throw error;

      const recommendation = data?.cropRecommendations?.[0]?.crop;
      if (recommendation) {
        updateCropSetting('top', recommendation.top || 0);
        updateCropSetting('bottom', recommendation.bottom || 0);
        updateCropSetting('left', recommendation.left || 0);
        updateCropSetting('right', recommendation.right || 0);

        toast.success(`AI analysis complete! Confidence: ${recommendation.confidence}%`);
      } else {
        toast.info("AI could not determine crop recommendations");
      }
    } catch (error) {
      console.error("AI analyze error:", error);
      toast.error("Failed to analyze with AI");
    }
  };

  const handleReset = () => {
    if (applyToAll) {
      const newSettings: Record<number, CropSettings> = {};
      for (let i = 1; i <= totalPages; i++) {
        newSettings[i] = { top: 0, bottom: 0, left: 0, right: 0, rotation: 0 };
      }
      setCropSettings(newSettings);
    } else {
      setCropSettings(prev => ({
        ...prev,
        [currentPage]: { top: 0, bottom: 0, left: 0, right: 0, rotation: 0 },
      }));
    }
    toast.info("Settings reset");
  };

  const handleApplyAndSave = async () => {
    if (!pdfUrl) return;

    setIsSaving(true);
    try {
      // Convert crop settings to array format
      const settingsArray: PageCropSettings[] = Object.entries(cropSettings).map(([page, settings]) => ({
        page: parseInt(page),
        ...settings,
      }));

      const result = await applyCropToPDF(pdfUrl, settingsArray, {
        onProgress: (current, total) => {
          console.log(`Processing page ${current}/${total}`);
        },
      });

      if (onSave) {
        await onSave(result.blob);
        toast.success("PDF saved successfully!");
      } else {
        // Download if no save handler
        downloadPDF(result.blob, `${title.replace(/\s+/g, '_')}_cropped.pdf`);
        toast.success("PDF downloaded!");
      }
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save PDF");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!pdfUrl) return;

    setIsSaving(true);
    try {
      const settingsArray: PageCropSettings[] = Object.entries(cropSettings).map(([page, settings]) => ({
        page: parseInt(page),
        ...settings,
      }));

      const result = await applyCropToPDF(pdfUrl, settingsArray);
      downloadPDF(result.blob, `${title.replace(/\s+/g, '_')}_cropped.pdf`);
      toast.success("PDF downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download PDF");
    } finally {
      setIsSaving(false);
    }
  };

  const settings = getCurrentCropSettings();

  if (isLoading) {
    return (
      <Card className="w-full max-w-6xl mx-auto">
        <CardContent className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading PDF...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scissors className="h-5 w-5" />
            PDF Crop & Straighten Editor
          </CardTitle>
          <Badge variant="outline">{title}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Preview Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Page Navigation */}
            <div className="flex items-center justify-between bg-secondary/30 rounded-lg p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* View Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={showPreview ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                {showPreview ? "Preview" : "Edit"}
              </Button>
              
              <Button
                variant={showGrid ? "default" : "outline"}
                size="sm"
                onClick={() => setShowGrid(!showGrid)}
                disabled={showPreview}
              >
                <Grid3X3 className="h-4 w-4 mr-1" />
                Grid
              </Button>
              
              <div className="flex items-center gap-1 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(z => Math.min(2, z + 0.25))}
                  disabled={zoom >= 2}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Canvas Display */}
            <ScrollArea className="h-[500px] border rounded-lg bg-muted/20">
              <div className="flex items-center justify-center p-4 min-h-[500px]">
                <canvas
                  ref={showPreview ? previewCanvasRef : canvasRef}
                  className="max-w-full shadow-lg"
                  style={{ maxHeight: '100%' }}
                />
              </div>
            </ScrollArea>
          </div>

          {/* Controls Panel */}
          <div className="space-y-6">
            <Tabs defaultValue="crop" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="crop" className="flex-1">Crop</TabsTrigger>
                <TabsTrigger value="rotate" className="flex-1">Rotate</TabsTrigger>
              </TabsList>

              <TabsContent value="crop" className="space-y-4 mt-4">
                {/* Crop Sliders */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Top</Label>
                      <span className="text-sm text-muted-foreground">{settings.top}%</span>
                    </div>
                    <Slider
                      value={[settings.top]}
                      min={0}
                      max={50}
                      step={1}
                      onValueChange={([v]) => updateCropSetting('top', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Bottom</Label>
                      <span className="text-sm text-muted-foreground">{settings.bottom}%</span>
                    </div>
                    <Slider
                      value={[settings.bottom]}
                      min={0}
                      max={50}
                      step={1}
                      onValueChange={([v]) => updateCropSetting('bottom', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Left</Label>
                      <span className="text-sm text-muted-foreground">{settings.left}%</span>
                    </div>
                    <Slider
                      value={[settings.left]}
                      min={0}
                      max={50}
                      step={1}
                      onValueChange={([v]) => updateCropSetting('left', v)}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label>Right</Label>
                      <span className="text-sm text-muted-foreground">{settings.right}%</span>
                    </div>
                    <Slider
                      value={[settings.right]}
                      min={0}
                      max={50}
                      step={1}
                      onValueChange={([v]) => updateCropSetting('right', v)}
                    />
                  </div>
                </div>

                {/* Auto Actions */}
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleAutoDetect}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Auto Detect Edges
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleAIAnalyze}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    AI Analyze
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="rotate" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Rotation</Label>
                    <span className="text-sm text-muted-foreground">{settings.rotation}°</span>
                  </div>
                  <Slider
                    value={[settings.rotation]}
                    min={-15}
                    max={15}
                    step={0.5}
                    onValueChange={([v]) => updateCropSetting('rotation', v)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => updateCropSetting('rotation', settings.rotation - 90)}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    -90°
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => updateCropSetting('rotation', settings.rotation + 90)}
                  >
                    <RotateCw className="h-4 w-4 mr-1" />
                    +90°
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Apply to All Toggle */}
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <Label htmlFor="apply-all" className="text-sm">Apply to all pages</Label>
              <Switch
                id="apply-all"
                checked={applyToAll}
                onCheckedChange={setApplyToAll}
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleReset}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={handleDownload}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download Cropped PDF
              </Button>

              {onSave && (
                <Button
                  className="w-full"
                  onClick={handleApplyAndSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Apply & Save
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
