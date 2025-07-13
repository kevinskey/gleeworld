import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Canvas as FabricCanvas, PencilBrush } from 'fabric';
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
  Music 
} from 'lucide-react';
import { useSheetMusic } from '@/hooks/useSheetMusic';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface SheetMusicPDFViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SheetMusicPDFViewer: React.FC<SheetMusicPDFViewerProps> = ({
  isOpen,
  onClose,
}) => {
  const { sheetMusic, loading } = useSheetMusic();
  const [selectedPDF, setSelectedPDF] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Initialize Fabric.js canvas for annotations
  useEffect(() => {
    if (canvasRef.current && isOpen && selectedPDF) {
      const canvas = new FabricCanvas(canvasRef.current, {
        isDrawingMode: false,
        width: 800,
        height: 1000,
        backgroundColor: 'transparent',
      });

      const brush = new PencilBrush(canvas);
      brush.color = '#ff0000';
      brush.width = 2;
      canvas.freeDrawingBrush = brush;

      setFabricCanvas(canvas);

      return () => {
        canvas.dispose();
      };
    }
  }, [isOpen, selectedPDF]);

  // Update canvas drawing mode
  useEffect(() => {
    if (fabricCanvas) {
      fabricCanvas.isDrawingMode = isAnnotating;
      fabricCanvas.renderAll();
    }
  }, [isAnnotating, fabricCanvas]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    toast.success(`PDF loaded successfully (${numPages} pages)`);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
    toast.error('Failed to load PDF');
  }, []);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages));
  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const handlePDFSelect = (pdfUrl: string) => {
    setSelectedPDF(pdfUrl);
    setCurrentPage(1);
    setScale(1.2);
    setRotation(0);
  };

  const handleToggleAnnotations = () => {
    setIsAnnotating(!isAnnotating);
    if (!isAnnotating) {
      toast.info('Annotation mode enabled - draw on the sheet music');
    } else {
      toast.info('Annotation mode disabled');
    }
  };

  const handleClearAnnotations = () => {
    if (fabricCanvas) {
      fabricCanvas.clear();
      toast.success('Annotations cleared');
    }
  };

  const handleDownload = () => {
    if (selectedPDF) {
      const link = document.createElement('a');
      link.href = selectedPDF;
      link.download = 'sheet-music.pdf';
      link.click();
      toast.success('Download started');
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span>Sheet Music Viewer</span>
            <div className="flex items-center gap-2">
              {/* PDF Selection */}
              <Select onValueChange={handlePDFSelect}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select sheet music..." />
                </SelectTrigger>
                <SelectContent>
                  {loading ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : sheetMusic.length === 0 ? (
                    <SelectItem value="none" disabled>No sheet music available</SelectItem>
                  ) : (
                    sheetMusic.map((sheet) => (
                      <SelectItem key={sheet.id} value={sheet.pdf_url || ''}>
                        {sheet.title} - {sheet.composer}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </DialogTitle>
        </DialogHeader>

        {selectedPDF && (
          <>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handlePrevPage} disabled={currentPage <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2">
                  {currentPage} / {numPages}
                </span>
                <Button size="sm" variant="outline" onClick={handleNextPage} disabled={currentPage >= numPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">{Math.round(scale * 100)}%</span>
                <Button size="sm" variant="outline" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={handleRotate}>
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant={isAnnotating ? "default" : "outline"} 
                  onClick={handleToggleAnnotations}
                >
                  <Pen className="h-4 w-4" />
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
                <Button size="sm" variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
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
                  {showAnnotations && (
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