import React, { useState, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw,
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Disable PDF.js worker entirely to avoid loading issues
pdfjs.GlobalWorkerOptions.workerSrc = '';

// Import CSS for react-pdf
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface PDFViewerProps {
  pdfUrl: string;
  className?: string;
  initialScale?: number;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfUrl,
  className,
  initialScale = 1.0
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(initialScale);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // PDF loading handlers
  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully with', numPages, 'pages');
    setNumPages(numPages);
    setIsLoading(false);
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: any) => {
    console.error('PDF Load Error:', error);
    setIsLoading(false);
    setError(error.message || 'Failed to load PDF');
  }, []);

  // Navigation handlers
  const goToPrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, numPages));
  }, [numPages]);

  // Zoom handlers
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1.0);
  }, []);

  // Rotation handler
  const rotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Download handler
  const downloadPDF = useCallback(async () => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [pdfUrl]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '=':
          case '+':
            e.preventDefault();
            zoomIn();
            break;
          case '-':
            e.preventDefault();
            zoomOut();
            break;
          case '0':
            e.preventDefault();
            resetZoom();
            break;
        }
      } else {
        switch (e.key) {
          case 'ArrowLeft':
            goToPrevPage();
            break;
          case 'ArrowRight':
            goToNextPage();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [zoomIn, zoomOut, resetZoom, goToPrevPage, goToNextPage]);

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
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-4xl mx-auto", className)}>
      {/* Controls Header */}
      <div className="border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Page Navigation */}
          <div className="flex items-center space-x-2">
            <Button
              onClick={goToPrevPage}
              disabled={currentPage <= 1 || isLoading}
              variant="outline"
              size="sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            
            <div className="flex items-center space-x-2 text-sm">
              <span>Page</span>
              <input
                type="number"
                min={1}
                max={numPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value, 10);
                  if (page >= 1 && page <= numPages) {
                    setCurrentPage(page);
                  }
                }}
                className="w-16 px-2 py-1 text-center border rounded"
                disabled={isLoading}
              />
              <span>of {numPages}</span>
            </div>
            
            <Button
              onClick={goToNextPage}
              disabled={currentPage >= numPages || isLoading}
              variant="outline"
              size="sm"
            >
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Zoom and Controls */}
          <div className="flex items-center space-x-2">
            <Button onClick={zoomOut} disabled={isLoading} variant="outline" size="sm">
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <Button 
              onClick={resetZoom} 
              disabled={isLoading}
              variant="outline" 
              size="sm"
              className="min-w-[80px]"
            >
              {Math.round(scale * 100)}%
            </Button>
            
            <Button onClick={zoomIn} disabled={isLoading} variant="outline" size="sm">
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Button onClick={rotate} disabled={isLoading} variant="outline" size="sm">
              <RotateCw className="h-4 w-4" />
            </Button>
            
            <Button onClick={downloadPDF} disabled={isLoading} variant="outline" size="sm">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Download</span>
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Content */}
      <CardContent className="p-4">
        <div className="relative min-h-[600px] flex items-center justify-center">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}

          <div 
            className="overflow-auto max-w-full"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center'
            }}
          >
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              className="flex justify-center"
              loading={
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-lg border rounded-lg max-w-full"
                width={Math.min(window.innerWidth - 64, 800)}
              />
            </Document>
          </div>
        </div>

        {/* Mobile-friendly page navigation */}
        <div className="flex items-center justify-center space-x-4 mt-4 sm:hidden">
          <Button
            onClick={goToPrevPage}
            disabled={currentPage <= 1 || isLoading}
            variant="outline"
            size="sm"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <span className="text-sm font-medium">
            {currentPage} / {numPages}
          </span>
          
          <Button
            onClick={goToNextPage}
            disabled={currentPage >= numPages || isLoading}
            variant="outline"
            size="sm"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFViewer;