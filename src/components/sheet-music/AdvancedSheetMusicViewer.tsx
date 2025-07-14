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
  Settings,
  Plus,
  List,
  Trash2,
  Users,
  Search,
  Bookmark,
  MoreHorizontal,
  Home,
  Save,
  Share,
  Menu
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useSheetMusic } from '@/hooks/useSheetMusic';
import { useSheetMusicAnnotations } from '@/hooks/useSheetMusicAnnotations';
import { useSheetMusicAnalytics } from '@/hooks/useSheetMusicAnalytics';
import { useSetlists } from '@/hooks/useSetlists';
import { CreateSetlistDialog } from '@/components/setlists/CreateSetlistDialog';
import { useIsMobile } from '@/hooks/use-mobile';

// Set up PDF.js worker with CDN fallback and error handling
try {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
} catch (error) {
  console.warn('Failed to set PDF.js worker, falling back to default', error);
}

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
  const { setlists, loading: setlistsLoading, createSetlist, addItemToSetlist, removeItemFromSetlist } = useSetlists();
  const isMobile = useIsMobile();
  
  const [selectedSheetMusicId, setSelectedSheetMusicId] = useState<string>(initialSheetMusicId || '');
  const selectedSheetMusic = allSheetMusic.find(sm => sm.id === selectedSheetMusicId) || allSheetMusic[0];
  const selectedPDF = selectedSheetMusic?.pdf_url || null;
  const [useFallbackViewer, setUseFallbackViewer] = useState<boolean>(false);
  
  // Auto-select first PDF if none selected and sheet music is available
  useEffect(() => {
    if (!selectedSheetMusicId && allSheetMusic.length > 0 && !loading) {
      const firstSheetMusic = allSheetMusic[0];
      setSelectedSheetMusicId(firstSheetMusic.id);
      setAudioUrl(firstSheetMusic.audio_preview_url || null);
    }
  }, [allSheetMusic, loading, selectedSheetMusicId]);
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
  
  // Setlist states
  const [showSetlistPanel, setShowSetlistPanel] = useState<boolean>(false);
  const [showCreateSetlistDialog, setShowCreateSetlistDialog] = useState<boolean>(false);
  const [selectedSetlistForAdding, setSelectedSetlistForAdding] = useState<string>('');
  
  // Menu states
  const [showQuickMenu, setShowQuickMenu] = useState<boolean>(true);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const { annotations, fetchAnnotations, saveAnnotation, clearPageAnnotations } = useSheetMusicAnnotations();
  
  

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
    console.log('PDF loaded successfully:', { numPages, selectedPDF });
    setNumPages(numPages);
    setCurrentPage(1);
    
    if (selectedSheetMusicId) {
      logView(selectedSheetMusicId, 1);
      toast.success(`PDF loaded successfully (${numPages} pages)`);
    }
  }, [selectedSheetMusicId, logView, selectedPDF]);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error, 'PDF URL:', selectedPDF);
    toast.error('Failed to load PDF with react-pdf, falling back to iframe');
    setUseFallbackViewer(true);
  }, [selectedPDF]);

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
    console.log('Selecting sheet music:', { sheetMusicId, sheetMusic, pdfUrl: sheetMusic?.pdf_url });
    if (sheetMusic?.pdf_url) {
      setSelectedSheetMusicId(sheetMusicId);
      setAudioUrl(sheetMusic.audio_preview_url || null);
      setCurrentPage(1);
      setScale(1.2);
      setRotation(0);
      setUseFallbackViewer(false); // Reset fallback state for new PDF
      console.log('PDF URL set to:', sheetMusic.pdf_url);
    } else {
      console.warn('No PDF URL found for sheet music:', sheetMusic);
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

  // Setlist functions
  const handleAddToSetlist = async () => {
    if (!selectedSetlistForAdding || !selectedSheetMusicId) return;
    
    const setlist = setlists.find(s => s.id === selectedSetlistForAdding);
    if (!setlist) return;
    
    const nextPosition = Math.max(0, ...(setlist.items?.map(item => item.order_position) || [0])) + 1;
    await addItemToSetlist(selectedSetlistForAdding, selectedSheetMusicId, nextPosition);
    setSelectedSetlistForAdding('');
    toast.success('Added to setlist');
  };

  const handleSelectFromSetlist = (setlistId: string, sheetMusicId: string) => {
    const sheetMusic = allSheetMusic.find(sm => sm.id === sheetMusicId);
    if (sheetMusic?.pdf_url) {
      handleSheetMusicSelect(sheetMusicId);
      setShowSetlistPanel(false);
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
      <DialogContent className={`${isMobile ? 'max-w-[100vw] h-[100vh] p-0 m-0 border-0 rounded-none' : 'max-w-7xl h-[95vh]'} flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : ''}`}>
        {!performanceMode && !isMobile && (
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Advanced Sheet Music Viewer</DialogTitle>
          </DialogHeader>
        )}

        {/* Mobile Compact Toolbar */}
        {!performanceMode && isMobile && (
          <div className="bg-background border-b p-2 flex-shrink-0">
            {/* Top Row - Essential Controls */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={handlePrevPage} disabled={currentPage <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-medium px-2 min-w-[3rem] text-center">
                  {currentPage}/{numPages}
                </span>
                <Button size="sm" variant="outline" onClick={handleNextPage} disabled={currentPage >= numPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={() => setIsDarkMode(!isDarkMode)}>
                  {isDarkMode ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant="outline" onClick={onClose}>
                  <Home className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Bottom Row - Tool Carousel */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 overflow-x-auto max-w-[60%]">
                <Button
                  size="sm"
                  variant={selectedTool === 'pen' ? 'default' : 'outline'}
                  onClick={() => handleToolSelect('pen')}
                >
                  <Pen className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={selectedTool === 'highlighter' ? 'default' : 'outline'}
                  onClick={() => handleToolSelect('highlighter')}
                >
                  <Highlighter className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant={selectedTool === 'eraser' ? 'default' : 'outline'}
                  onClick={() => handleToolSelect('eraser')}
                >
                  <Eraser className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" onClick={handleZoomOut}>
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <span className="text-xs px-1 min-w-[2.5rem] text-center">{Math.round(scale * 100)}%</span>
                <Button size="sm" variant="outline" onClick={handleZoomIn}>
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Desktop Full Toolbar */}
        {!performanceMode && !isMobile && (
          <div className="flex items-center justify-between p-4 border-b flex-shrink-0 flex-wrap gap-2">
            {/* Navigation Controls */}
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

            {/* Annotation Tools */}
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={selectedTool === 'pen' ? 'default' : 'outline'}
                onClick={() => handleToolSelect('pen')}
              >
                <Pen className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTool === 'highlighter' ? 'default' : 'outline'}
                onClick={() => handleToolSelect('highlighter')}
              >
                <Highlighter className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTool === 'text' ? 'default' : 'outline'}
                onClick={() => handleToolSelect('text')}
              >
                <Type className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTool === 'circle' ? 'default' : 'outline'}
                onClick={() => handleToolSelect('circle')}
              >
                <CircleIcon className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant={selectedTool === 'rectangle' ? 'default' : 'outline'}
                onClick={() => handleToolSelect('rectangle')}
              >
                <Square className="h-4 w-4" />
              </Button>
              <input
                type="color"
                value={annotationColor}
                onChange={(e) => setAnnotationColor(e.target.value)}
                className="w-8 h-8 rounded border cursor-pointer"
                title="Annotation Color"
              />
            </div>

            {/* Action Controls */}
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleSaveAnnotations}>
                <Save className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={handleClearAnnotations}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant={showSetlistPanel ? "default" : "outline"}
                onClick={() => setShowSetlistPanel(!showSetlistPanel)}
              >
                <List className="h-4 w-4" />
              </Button>
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

        {/* Main Content Area with Sidebar */}
        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar - PDF List (Hidden on Mobile) */}
          {!performanceMode && !isMobile && (
            <div className="w-80 border-r flex flex-col bg-gray-50 dark:bg-gray-800">
              <div className="p-4 border-b">
                <h3 className="text-sm font-semibold mb-2">Sheet Music Library</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search sheet music..."
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-gray-500">Loading...</div>
                  </div>
                ) : allSheetMusic.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-gray-500">No sheet music available</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {allSheetMusic.map((sheet) => (
                      <button
                        key={sheet.id}
                        onClick={() => handleSheetMusicSelect(sheet.id)}
                        className={`w-full text-left p-3 rounded-md text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
                          selectedSheetMusicId === sheet.id 
                            ? 'bg-blue-100 dark:bg-blue-900 border border-blue-200 dark:border-blue-700' 
                            : 'border border-transparent'
                        }`}
                      >
                        <div className="font-medium truncate">{sheet.title}</div>
                        <div className="text-gray-500 text-xs mt-1 truncate">
                          {sheet.composer} • {sheet.voice_parts?.join(', ')}
                        </div>
                        {sheet.difficulty_level && (
                          <div className="text-xs mt-1">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              sheet.difficulty_level === 'beginner' ? 'bg-green-100 text-green-800' :
                              sheet.difficulty_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {sheet.difficulty_level}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main PDF Viewer Area */}
          <div className="flex-1 flex flex-col">
            {selectedPDF && (
              <>
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
                       <Button size="sm" variant="outline" onClick={() => setShowAnnotations(!showAnnotations)}>
                         {showAnnotations ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                       </Button>
                     </div>
                     
                     {/* Add to Setlist Controls */}
                     {selectedSheetMusicId && (
                       <>
                         <Separator orientation="vertical" />
                         <div className="flex items-center gap-2">
                           <Select value={selectedSetlistForAdding} onValueChange={setSelectedSetlistForAdding}>
                             <SelectTrigger className="w-48">
                               <SelectValue placeholder="Add to setlist..." />
                             </SelectTrigger>
                             <SelectContent>
                               {setlists.length === 0 ? (
                                 <SelectItem value="none" disabled>No setlists available</SelectItem>
                               ) : (
                                 setlists.map((setlist) => (
                                   <SelectItem key={setlist.id} value={setlist.id}>
                                     {setlist.name}
                                   </SelectItem>
                                 ))
                               )}
                             </SelectContent>
                           </Select>
                           <Button 
                             size="sm" 
                             variant="outline" 
                             onClick={handleAddToSetlist}
                             disabled={!selectedSetlistForAdding}
                           >
                             <Plus className="h-4 w-4" />
                           </Button>
                           <Button 
                             size="sm" 
                             variant="outline" 
                             onClick={() => setShowCreateSetlistDialog(true)}
                           >
                             New Setlist
                           </Button>
                         </div>
                       </>
                     )}
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

                {/* PDF Viewer and Setlist Panel Layout */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Setlist Panel */}
                  {showSetlistPanel && (
                    <div className="w-80 border-r bg-gray-50 dark:bg-gray-800 p-4 overflow-auto">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">My Setlists</h3>
                          <Button 
                            size="sm" 
                            onClick={() => setShowCreateSetlistDialog(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        {setlistsLoading ? (
                          <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                            <p className="text-sm text-gray-600">Loading setlists...</p>
                          </div>
                        ) : setlists.length === 0 ? (
                          <div className="text-center py-8">
                            <Music className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                            <p className="text-sm text-gray-600 mb-4">No setlists yet</p>
                            <Button 
                              size="sm" 
                              onClick={() => setShowCreateSetlistDialog(true)}
                            >
                              Create First Setlist
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {setlists.map((setlist) => (
                              <div key={setlist.id} className="bg-white dark:bg-gray-700 rounded-lg p-3 border">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium truncate">{setlist.name}</h4>
                                  <div className="flex items-center gap-1">
                                    {setlist.is_public && (
                                      <Users className="h-3 w-3 text-gray-500" />
                                    )}
                                    <span className="text-xs text-gray-500">
                                      {setlist.items?.length || 0} pieces
                                    </span>
                                  </div>
                                </div>
                                {setlist.description && (
                                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                                    {setlist.description}
                                  </p>
                                )}
                                
                                {/* Setlist Items */}
                                {setlist.items && setlist.items.length > 0 && (
                                  <div className="space-y-1">
                                    {setlist.items
                                      .sort((a, b) => a.order_position - b.order_position)
                                      .slice(0, 3)
                                      .map((item) => (
                                        <button
                                          key={item.id}
                                          onClick={() => handleSelectFromSetlist(setlist.id, item.sheet_music_id)}
                                          className="w-full text-left p-2 bg-gray-50 dark:bg-gray-600 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                                        >
                                          <div className="font-medium truncate">
                                            {item.sheet_music?.title}
                                          </div>
                                          {item.sheet_music?.composer && (
                                            <div className="text-gray-500 truncate">
                                              {item.sheet_music.composer}
                                            </div>
                                          )}
                                        </button>
                                      ))
                                    }
                                    {setlist.items.length > 3 && (
                                      <div className="text-xs text-gray-500 text-center py-1">
                                        +{setlist.items.length - 3} more pieces
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PDF Viewer */}
                  <div className={`flex-1 relative overflow-auto ${isMobile ? 'p-0' : 'p-4'} ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className={`${isMobile ? 'w-full h-full' : 'flex justify-center'}`}>
                      <div 
                        ref={pageRef}
                        className={`relative ${isMobile ? 'w-full h-full' : 'shadow-lg'}`}
                        style={{ transform: `rotate(${rotation}deg)` }}
                      >
                        {useFallbackViewer ? (
                          // Fallback iframe viewer when react-pdf fails
                          <div className={`w-full ${isMobile ? 'h-[calc(100vh-120px)]' : 'h-[800px]'} border rounded-lg overflow-hidden`}>
                            <iframe
                              src={`${selectedPDF}#toolbar=1&navpanes=0&scrollbar=1&zoom=page-fit`}
                              className="w-full h-full"
                              title="Sheet Music PDF"
                              onLoad={() => {
                                console.log('Fallback iframe loaded successfully:', selectedPDF);
                                toast.success('PDF loaded using fallback viewer');
                                setNumPages(1); // Set a default since we can't get real page count
                              }}
                              onError={() => {
                                console.error('Fallback iframe also failed:', selectedPDF);
                                toast.error('Failed to load PDF even with fallback viewer');
                              }}
                            />
                          </div>
                        ) : (
                          // React-PDF viewer (default)
                          <>
                            <Document
                              file={selectedPDF}
                              onLoadSuccess={onDocumentLoadSuccess}
                              onLoadError={onDocumentLoadError}
                              loading={<div className="p-8 text-center">Loading PDF...</div>}
                            >
                              <Page
                                pageNumber={currentPage}
                                scale={isMobile ? scale * 1.5 : scale}
                                width={isMobile ? window.innerWidth : undefined}
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
                          </>
                        )}
                      </div>
                    </div>

                    {/* forScore-style Quick Menu */}
                    {showQuickMenu && (
                      <div 
                        className={`absolute left-4 right-4 z-50 ${
                          menuPosition === 'top' ? 'top-4' : 'bottom-4'
                        }`}
                      >
                        <div className={`bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2 ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            {/* Navigation Section */}
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handlePrevPage}
                                disabled={currentPage <= 1}
                                className="h-10 w-10 p-0"
                              >
                                <ChevronLeft className="h-5 w-5" />
                              </Button>
                              <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-medium min-w-[4rem] text-center">
                                {currentPage} / {numPages}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleNextPage}
                                disabled={currentPage >= numPages}
                                className="h-10 w-10 p-0"
                              >
                                <ChevronRight className="h-5 w-5" />
                              </Button>
                            </div>

                            {/* Zoom Controls */}
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setScale(Math.max(scale - 0.2, 0.5))}
                                className="h-10 w-10 p-0"
                              >
                                <ZoomOut className="h-4 w-4" />
                              </Button>
                              <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium min-w-[3rem] text-center">
                                {Math.round(scale * 100)}%
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setScale(Math.min(scale + 0.2, 3.0))}
                                className="h-10 w-10 p-0"
                              >
                                <ZoomIn className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Annotation Tools */}
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant={selectedTool === 'pen' ? 'default' : 'ghost'}
                                onClick={() => handleToolSelect('pen')}
                                className="h-10 w-10 p-0"
                              >
                                <Pen className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={selectedTool === 'highlighter' ? 'default' : 'ghost'}
                                onClick={() => handleToolSelect('highlighter')}
                                className="h-10 w-10 p-0"
                              >
                                <Highlighter className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant={selectedTool === 'text' ? 'default' : 'ghost'}
                                onClick={() => handleToolSelect('text')}
                                className="h-10 w-10 p-0"
                              >
                                <Type className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowSetlistPanel(!showSetlistPanel)}
                                className="h-10 w-10 p-0"
                              >
                                <List className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsDarkMode(!isDarkMode)}
                                className="h-10 w-10 p-0"
                              >
                                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowQuickMenu(false)}
                                className="h-10 w-10 p-0 opacity-60 hover:opacity-100"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Menu Toggle Button (when menu is hidden) */}
                    {!showQuickMenu && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowQuickMenu(true)}
                        className="absolute bottom-4 right-4 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm"
                      >
                        <Menu className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            {!selectedPDF && (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Music className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Loading sheet music...</p>
                  <p className="text-sm">Please wait while we load your music library</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Setlist Dialog */}
        <CreateSetlistDialog
          isOpen={showCreateSetlistDialog}
          onClose={() => setShowCreateSetlistDialog(false)}
        />
      </DialogContent>
    </Dialog>
  );
};