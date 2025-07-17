import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Settings,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Pen,
  Highlighter,
  Type,
  Eraser,
  Circle,
  Square,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Home,
  Menu,
  Maximize,
  MoreVertical
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { useSheetMusic } from '@/hooks/useSheetMusic';
import { useSheetMusicAnnotations } from '@/hooks/useSheetMusicAnnotations';
import { useSheetMusicAnalytics } from '@/hooks/useSheetMusicAnalytics';
import { Canvas as FabricCanvas, PencilBrush, Circle as FabricCircle, Rect, Textbox } from 'fabric';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Database } from '@/integrations/supabase/types';

// Set up PDF.js worker
// Worker configuration will be set inside the component when needed

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];
type AnnotationTool = 'pen' | 'highlighter' | 'text' | 'circle' | 'rectangle' | 'eraser';

interface MobileSheetMusicViewerProps {
  isOpen: boolean;
  onClose: () => void;
  sheetMusicId?: string;
  performanceMode?: boolean;
}

export const MobileSheetMusicViewer: React.FC<MobileSheetMusicViewerProps> = ({
  isOpen,
  onClose,
  sheetMusicId: initialSheetMusicId,
  performanceMode = false,
}) => {
  const { sheetMusic: allSheetMusic, loading } = useSheetMusic();
  const { logView, logDownload } = useSheetMusicAnalytics();
  const { annotations, fetchAnnotations, saveAnnotation, clearPageAnnotations } = useSheetMusicAnnotations();
  
  const [selectedSheetMusicId, setSelectedSheetMusicId] = useState<string>(initialSheetMusicId || '');
  const selectedSheetMusic = allSheetMusic.find(sm => sm.id === selectedSheetMusicId) || allSheetMusic[0];
  const selectedPDF = selectedSheetMusic?.pdf_url || null;
  
  // PDF states
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  
  // UI states
  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showAnnotationTools, setShowAnnotationTools] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  
  // Audio states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.7);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  // Annotation states
  const [selectedTool, setSelectedTool] = useState<AnnotationTool>('pen');
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [annotationColor, setAnnotationColor] = useState<string>('#ff0000');
  const [brushSize, setBrushSize] = useState<number>(3);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  
  // Touch states
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [lastTap, setLastTap] = useState<number>(0);
  const [touchStartY, setTouchStartY] = useState<number>(0);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-hide toolbar after inactivity
  useEffect(() => {
    if (!showToolbar) return;
    
    const timer = setTimeout(() => {
      if (!showSettings && !showAnnotationTools) {
        setShowToolbar(false);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [showToolbar, showSettings, showAnnotationTools]);
  
  // Initialize sheet music
  useEffect(() => {
    if (!selectedSheetMusicId && allSheetMusic.length > 0 && !loading) {
      const firstSheetMusic = allSheetMusic[0];
      setSelectedSheetMusicId(firstSheetMusic.id);
    }
  }, [allSheetMusic, loading, selectedSheetMusicId]);
  
  // Initialize Fabric.js canvas for annotations
  useEffect(() => {
    if (canvasRef.current && isOpen && selectedPDF && !performanceMode) {
      const canvas = new FabricCanvas(canvasRef.current, {
        isDrawingMode: false,
        width: window.innerWidth,
        height: window.innerHeight - 120,
        backgroundColor: 'transparent',
      });

      const brush = new PencilBrush(canvas);
      brush.color = annotationColor;
      brush.width = brushSize;
      canvas.freeDrawingBrush = brush;

      setFabricCanvas(canvas);

      return () => {
        canvas.dispose();
      };
    }
  }, [isOpen, selectedPDF, performanceMode, annotationColor, brushSize]);
  
  // Handle touch interactions
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStartTime(Date.now());
    setTouchStartY(touch.clientY);
    
    // Show toolbar on touch
    setShowToolbar(true);
    
    // Handle double tap
    const now = Date.now();
    if (now - lastTap < 300) {
      handleDoubleTap();
    }
    setLastTap(now);
  };
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchDuration = Date.now() - touchStartTime;
    
    // Long press detection
    if (touchDuration > 500) {
      setShowAnnotationTools(true);
    }
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isAnnotating) return;
    
    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartY;
    
    // Prevent scrolling when annotating
    if (Math.abs(deltaY) > 10) {
      e.preventDefault();
    }
  };
  
  const handleDoubleTap = () => {
    if (scale === 1.0) {
      setScale(1.5);
    } else {
      setScale(1.0);
    }
  };
  
  const handleSwipeGesture = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      handleNextPage();
    } else {
      handlePrevPage();
    }
  };
  
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    
    if (selectedSheetMusicId) {
      logView(selectedSheetMusicId, 1);
    }
  }, [selectedSheetMusicId, logView]);
  
  const handleNextPage = useCallback(() => {
    const newPage = Math.min(currentPage + 1, numPages);
    setCurrentPage(newPage);
    if (selectedSheetMusicId) {
      logView(selectedSheetMusicId, newPage);
    }
  }, [currentPage, numPages, selectedSheetMusicId, logView]);
  
  const handlePrevPage = useCallback(() => {
    const newPage = Math.max(currentPage - 1, 1);
    setCurrentPage(newPage);
    if (selectedSheetMusicId) {
      logView(selectedSheetMusicId, newPage);
    }
  }, [currentPage, selectedSheetMusicId, logView]);
  
  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
  const handleDownload = () => {
    if (selectedPDF && selectedSheetMusicId) {
      const link = document.createElement('a');
      link.href = selectedPDF;
      link.download = `${selectedSheetMusic?.title || 'sheet-music'}.pdf`;
      link.click();
      logDownload(selectedSheetMusicId);
      toast.success('Download started');
    }
  };
  
  const handleToolSelect = (tool: AnnotationTool) => {
    setSelectedTool(tool);
    setIsAnnotating(tool !== 'eraser');
    
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = tool === 'pen' || tool === 'highlighter';
      
      if (tool === 'highlighter') {
        setAnnotationColor('#ffff0080');
        setBrushSize(20);
      } else if (tool === 'pen') {
        setAnnotationColor('#ff0000');
        setBrushSize(3);
      }
    }
  };
  
  const handleSaveAnnotations = async () => {
    if (fabricCanvas && selectedSheetMusicId) {
      const objects = fabricCanvas.getObjects();
      
      for (const obj of objects) {
        await saveAnnotation(
          selectedSheetMusicId,
          currentPage,
          'drawing',
          obj.toObject(),
          {
            x: obj.left || 0,
            y: obj.top || 0,
            width: obj.width,
            height: obj.height,
          }
        );
      }
      
      toast.success('Annotations saved');
    }
  };
  
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col overflow-hidden">
      {/* Hidden Audio Element */}
      {selectedSheetMusic?.audio_preview_url && (
        <audio
          ref={audioRef}
          src={selectedSheetMusic.audio_preview_url}
          onEnded={() => setIsPlaying(false)}
        />
      )}
      
      {/* Top Toolbar */}
      <div className={`absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-b p-2 z-10 transition-transform duration-300 ${
        showToolbar ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium truncate max-w-[120px]">
              {selectedSheetMusic?.title}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={handlePrevPage} disabled={currentPage <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs px-2 min-w-[3rem] text-center">
              {currentPage}/{numPages}
            </span>
            <Button size="sm" variant="ghost" onClick={handleNextPage} disabled={currentPage >= numPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-1">
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-80">
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Zoom Controls */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Zoom</label>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={handleZoomOut}>
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Slider
                        value={[scale]}
                        onValueChange={(value) => setScale(value[0])}
                        max={3}
                        min={0.5}
                        step={0.1}
                        className="flex-1"
                      />
                      <Button size="sm" variant="outline" onClick={handleZoomIn}>
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground text-center">
                      {Math.round(scale * 100)}%
                    </div>
                  </div>
                  
                  {/* Rotation */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rotation</label>
                    <Button variant="outline" onClick={handleRotate} className="w-full">
                      <RotateCw className="h-4 w-4 mr-2" />
                      Rotate ({rotation}°)
                    </Button>
                  </div>
                  
                  {/* Display Options */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Display</label>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Dark Mode</span>
                      <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Show Annotations</span>
                      <Switch checked={showAnnotations} onCheckedChange={setShowAnnotations} />
                    </div>
                  </div>
                  
                  {/* Audio Controls */}
                  {selectedSheetMusic?.audio_preview_url && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Audio</label>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          if (audioRef.current) {
                            if (isPlaying) {
                              audioRef.current.pause();
                              setIsPlaying(false);
                            } else {
                              audioRef.current.play();
                              setIsPlaying(true);
                            }
                          }
                        }}>
                          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsMuted(!isMuted)}>
                          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <Slider
                          value={[volume]}
                          onValueChange={(value) => setVolume(value[0])}
                          max={1}
                          min={0}
                          step={0.1}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="space-y-2">
                    <Button variant="outline" onClick={handleDownload} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                    <Button variant="outline" onClick={toggleFullscreen} className="w-full">
                      <Maximize className="h-4 w-4 mr-2" />
                      {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      
      {/* Annotation Toolbar */}
      {!performanceMode && (
        <Dialog open={showAnnotationTools} onOpenChange={setShowAnnotationTools}>
          <DialogTrigger asChild>
            <Button 
              className="fixed bottom-20 right-4 z-20 rounded-full h-12 w-12 shadow-lg"
              onClick={() => setShowAnnotationTools(true)}
            >
              <Pen className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="h-80">
            <DialogHeader>
              <DialogTitle>Annotation Tools</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Tool Selection */}
              <div className="grid grid-cols-5 gap-2">
                {[
                  { tool: 'pen' as AnnotationTool, icon: Pen },
                  { tool: 'highlighter' as AnnotationTool, icon: Highlighter },
                  { tool: 'text' as AnnotationTool, icon: Type },
                  { tool: 'circle' as AnnotationTool, icon: Circle },
                  { tool: 'rectangle' as AnnotationTool, icon: Square },
                ].map(({ tool, icon: Icon }) => (
                  <Button
                    key={tool}
                    variant={selectedTool === tool ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToolSelect(tool)}
                    className="aspect-square"
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
              
              {/* Brush Size */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Brush Size</label>
                <Slider
                  value={[brushSize]}
                  onValueChange={(value) => setBrushSize(value[0])}
                  max={20}
                  min={1}
                  step={1}
                />
              </div>
              
              {/* Color Picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <div className="flex gap-2">
                  {['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map(color => (
                    <Button
                      key={color}
                      variant="outline"
                      size="sm"
                      className="w-8 h-8 p-0"
                      style={{ backgroundColor: color }}
                      onClick={() => setAnnotationColor(color)}
                    />
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSaveAnnotations} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => {
                  if (fabricCanvas) {
                    fabricCanvas.clear();
                    clearPageAnnotations(selectedSheetMusicId, currentPage);
                  }
                }} className="flex-1">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Main Content */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        <div 
          ref={pdfContainerRef}
          className={`w-full h-full flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
        >
          {selectedPDF && (
            <Document
              file={selectedPDF}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error('PDF load error:', error);
                toast.error('Failed to load PDF');
              }}
              className="relative"
            >
              <div className="relative">
                <Page
                  pageNumber={currentPage}
                  scale={scale}
                  rotate={rotation}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className="shadow-lg mx-auto"
                />
                
                {/* Annotation Canvas Overlay */}
                {!performanceMode && showAnnotations && (
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 pointer-events-auto"
                    style={{
                      width: '100%',
                      height: '100%',
                      transform: `scale(${scale}) rotate(${rotation}deg)`,
                      transformOrigin: 'center',
                    }}
                  />
                )}
              </div>
            </Document>
          )}
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <div className={`absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t p-2 z-10 transition-transform duration-300 ${
        showToolbar ? 'translate-y-0' : 'translate-y-full'
      }`}>
        <div className="flex items-center justify-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRotate}>
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};