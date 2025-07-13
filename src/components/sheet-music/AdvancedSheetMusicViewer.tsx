import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Canvas as FabricCanvas, PencilBrush, Circle, Rect, Textbox } from 'fabric';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Pen, 
  Eraser, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  EyeOff,
  Music,
  Highlighter,
  Type,
  Circle as CircleIcon,
  Square,
  Palette,
  Moon,
  Sun,
  Play,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useSheetMusic } from '@/hooks/useSheetMusic';
import { useSheetMusicAnnotations } from '@/hooks/useSheetMusicAnnotations';
import { useSheetMusicAnalytics } from '@/hooks/useSheetMusicAnalytics';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

interface AdvancedSheetMusicViewerProps {
  isOpen: boolean;
  onClose: () => void;
  sheetMusicId?: string;
  setlistId?: string;
  performanceMode?: boolean;
}

type AnnotationTool = 'pen' | 'highlighter' | 'text' | 'circle' | 'rectangle' | 'eraser';

export const AdvancedSheetMusicViewer: React.FC<AdvancedSheetMusicViewerProps> = ({
  isOpen,
  onClose,
  sheetMusicId: initialSheetMusicId,
  setlistId,
  performanceMode = false,
}) => {
  const { sheetMusic: allSheetMusic, loading } = useSheetMusic();
  const { logView, logDownload } = useSheetMusicAnalytics();
  
  const [selectedSheetMusicId, setSelectedSheetMusicId] = useState<string>(initialSheetMusicId || '');
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.7);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  // Annotation states
  const [selectedTool, setSelectedTool] = useState<AnnotationTool>('pen');
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [annotationColor, setAnnotationColor] = useState<string>('#ff0000');
  const [brushSize, setBrushSize] = useState<number>(2);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const { annotations, fetchAnnotations, saveAnnotation, clearPageAnnotations } = useSheetMusicAnnotations();
  
  const selectedSheetMusic = allSheetMusic.find(sm => sm.id === selectedSheetMusicId);

  // Initialize Fabric.js canvas for annotations
  useEffect(() => {
    if (canvasRef.current && isOpen && selectedPDF && !performanceMode) {
      const canvas = new FabricCanvas(canvasRef.current, {
        isDrawingMode: false,
        width: 800,
        height: 1000,
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
  }, [isOpen, selectedPDF, performanceMode]);

  // Update canvas properties
  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = isAnnotating && selectedTool === 'pen';
      
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = annotationColor;
        fabricCanvas.freeDrawingBrush.width = brushSize;
      }
      
      fabricCanvas.renderAll();
    }
  }, [isAnnotating, selectedTool, annotationColor, brushSize, fabricCanvas]);

  // Fetch annotations when page or sheet music changes
  useEffect(() => {
    if (selectedSheetMusicId && currentPage > 0) {
      fetchAnnotations(selectedSheetMusicId, currentPage);
    }
  }, [selectedSheetMusicId, currentPage, fetchAnnotations]);

  // Load annotations onto canvas
  useEffect(() => {
    if (fabricCanvas && annotations.length > 0) {
      fabricCanvas.clear();
      
      annotations.forEach(annotation => {
        if (annotation.page_number === currentPage) {
          // Reconstruct fabric objects from saved data
          const objectData = annotation.annotation_data;
          if (objectData.type === 'path') {
            // Drawing path
            fabricCanvas.loadFromJSON({ objects: [objectData] }, () => {
              fabricCanvas.renderAll();
            });
          }
          // Add other annotation types as needed
        }
      });
    }
  }, [fabricCanvas, annotations, currentPage]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    
    if (selectedSheetMusicId) {
      logView(selectedSheetMusicId, 1);
      toast.success(`PDF loaded successfully (${numPages} pages)`);
    }
  }, [selectedSheetMusicId, logView]);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
    toast.error('Failed to load PDF');
  }, []);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
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

  const handleSheetMusicSelect = (sheetMusicId: string) => {
    const sheetMusic = allSheetMusic.find(sm => sm.id === sheetMusicId);
    if (sheetMusic?.pdf_url) {
      setSelectedSheetMusicId(sheetMusicId);
      setSelectedPDF(sheetMusic.pdf_url);
      setAudioUrl(sheetMusic.audio_preview_url || null);
      setCurrentPage(1);
      setScale(1.2);
      setRotation(0);
    }
  };

  const handleToolSelect = (tool: AnnotationTool) => {
    setSelectedTool(tool);
    setIsAnnotating(tool !== 'eraser');
    
    if (tool === 'highlighter') {
      setAnnotationColor('#ffff0080'); // Semi-transparent yellow
      setBrushSize(20);
    } else if (tool === 'pen') {
      setAnnotationColor('#ff0000');
      setBrushSize(2);
    }
  };

  const handleAddTextAnnotation = () => {
    if (fabricCanvas) {
      const text = new Textbox('Add text...', {
        left: 100,
        top: 100,
        fill: annotationColor,
        fontSize: 16,
        fontFamily: 'Arial',
        editable: true,
      });
      
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      text.enterEditing();
    }
  };

  const handleAddShape = (shape: 'circle' | 'rectangle') => {
    if (fabricCanvas) {
      let shapeObject;
      
      if (shape === 'circle') {
        shapeObject = new Circle({
          radius: 30,
          left: 100,
          top: 100,
          fill: 'transparent',
          stroke: annotationColor,
          strokeWidth: 2,
        });
      } else {
        shapeObject = new Rect({
          width: 60,
          height: 40,
          left: 100,
          top: 100,
          fill: 'transparent',
          stroke: annotationColor,
          strokeWidth: 2,
        });
      }
      
      fabricCanvas.add(shapeObject);
      fabricCanvas.setActiveObject(shapeObject);
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

  const handleClearAnnotations = () => {
    if (fabricCanvas && selectedSheetMusicId) {
      fabricCanvas.clear();
      clearPageAnnotations(selectedSheetMusicId, currentPage);
    }
  };

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Update audio volume when controls change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          handlePrevPage();
          break;
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          handleNextPage();
          break;
        case 'f':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleFullscreen();
          }
          break;
        case 'p':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            window.print();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, handleNextPage, handlePrevPage]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-7xl h-[95vh] flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : ''}`}>
        {!performanceMode && (
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between">
              <span>Advanced Sheet Music Viewer</span>
              <div className="flex items-center gap-2">
                <Select onValueChange={handleSheetMusicSelect} value={selectedSheetMusicId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select sheet music..." />
                  </SelectTrigger>
                  <SelectContent>
                    {loading ? (
                      <SelectItem value="loading" disabled>Loading...</SelectItem>
                    ) : allSheetMusic.length === 0 ? (
                      <SelectItem value="none" disabled>No sheet music available</SelectItem>
                    ) : (
                      allSheetMusic.map((sheet) => (
                        <SelectItem key={sheet.id} value={sheet.id}>
                          {sheet.title} - {sheet.composer}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </DialogTitle>
          </DialogHeader>
        )}

        {selectedPDF && (
          <>
            {/* Main Toolbar */}
            {!performanceMode && (
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0 flex-wrap gap-2">
                {/* Navigation */}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handlePrevPage} disabled={currentPage <= 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium px-2 whitespace-nowrap">
                    {currentPage} / {numPages}
                  </span>
                  <Button size="sm" variant="outline" onClick={handleNextPage} disabled={currentPage >= numPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                {/* View Controls */}
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2 whitespace-nowrap">{Math.round(scale * 100)}%</span>
                  <Button size="sm" variant="outline" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleRotate}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>

                {/* Mode Controls */}
                <div className="flex items-center gap-2">
                  <Button 
                    size="sm" 
                    variant={isDarkMode ? "default" : "outline"} 
                    onClick={() => setIsDarkMode(!isDarkMode)}
                  >
                    {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={toggleFullscreen}>
                    {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDownload}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Annotation Toolbar */}
            {!performanceMode && (
              <div className="flex items-center gap-2 p-2 border-b bg-gray-50 dark:bg-gray-800 flex-wrap">
                <div className="flex items-center gap-1">
                  <Button 
                    size="sm" 
                    variant={selectedTool === 'pen' ? "default" : "outline"}
                    onClick={() => handleToolSelect('pen')}
                  >
                    <Pen className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant={selectedTool === 'highlighter' ? "default" : "outline"}
                    onClick={() => handleToolSelect('highlighter')}
                  >
                    <Highlighter className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant={selectedTool === 'text' ? "default" : "outline"}
                    onClick={() => { setSelectedTool('text'); handleAddTextAnnotation(); }}
                  >
                    <Type className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant={selectedTool === 'circle' ? "default" : "outline"}
                    onClick={() => { setSelectedTool('circle'); handleAddShape('circle'); }}
                  >
                    <CircleIcon className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant={selectedTool === 'rectangle' ? "default" : "outline"}
                    onClick={() => { setSelectedTool('rectangle'); handleAddShape('rectangle'); }}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </div>
                
                <Separator orientation="vertical" />
                
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={annotationColor}
                    onChange={(e) => setAnnotationColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs">Size:</span>
                    <Slider
                      value={[brushSize]}
                      onValueChange={(value) => setBrushSize(value[0])}
                      min={1}
                      max={20}
                      step={1}
                      className="w-16"
                    />
                  </div>
                </div>
                
                <Separator orientation="vertical" />
                
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" onClick={handleSaveAnnotations}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleClearAnnotations}>
                    <Eraser className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowAnnotations(!showAnnotations)}
                  >
                    {showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Audio Controls */}
            {audioUrl && (
              <div className="flex items-center gap-2 p-2 border-b bg-blue-50 dark:bg-blue-900/20">
                <Button size="sm" variant="outline" onClick={toggleAudio}>
                  <Play className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[volume]}
                  onValueChange={(value) => setVolume(value[0])}
                  min={0}
                  max={1}
                  step={0.1}
                  className="w-24"
                />
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onLoadedData={() => {
                    if (audioRef.current) {
                      audioRef.current.volume = isMuted ? 0 : volume;
                    }
                  }}
                />
              </div>
            )}

            {/* PDF Viewer */}
            <div className={`flex-1 overflow-auto p-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className="flex justify-center">
                <div 
                  ref={pageRef}
                  className="relative shadow-lg"
                  style={{ transform: `rotate(${rotation}deg)` }}
                >
                  <Document
                    file={selectedPDF}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={<div className="p-8 text-center">Loading PDF...</div>}
                  >
                    <Page
                      pageNumber={currentPage}
                      scale={scale}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>
                  
                  {/* Annotation Canvas Overlay */}
                  {!performanceMode && showAnnotations && (
                    <canvas
                      ref={canvasRef}
                      className="absolute top-0 left-0 pointer-events-auto"
                      style={{
                        opacity: isAnnotating ? 1 : 0.8,
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {!selectedPDF && (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Music className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select sheet music to view</p>
              <p className="text-sm">Choose from the dropdown above to get started</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};