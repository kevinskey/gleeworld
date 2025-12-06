import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSheetMusicUrl } from '@/hooks/useSheetMusicUrl';
import { usePDFPageCache } from '@/hooks/usePDFPageCache';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface FastPDFViewerProps {
  pdfUrl: string | null;
  className?: string;
  onPageChange?: (page: number, total: number) => void;
}

export const FastPDFViewer: React.FC<FastPDFViewerProps> = ({
  pdfUrl,
  className,
  onPageChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  
  const { signedUrl, loading: urlLoading, error: urlError } = useSheetMusicUrl(pdfUrl);
  const { getPage, preloadPage, clearCache, preloadAdjacentPages } = usePDFPageCache(
    pdf, 
    containerWidth > 0 ? containerWidth : 800, 
    0.9 // Reduced scale for maximum speed during performance
  );

  // Touch navigation state
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null);

  // Measure container width
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Load PDF document
  useEffect(() => {
    if (!signedUrl) return;

    let cancelled = false;

    const loadPdf = async () => {
      try {
        setIsLoading(true);
        setError(null);
        clearCache();

        const doc = await pdfjsLib.getDocument({ 
          url: signedUrl,
          withCredentials: false,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.31/cmaps/',
          cMapPacked: true,
          disableAutoFetch: false,
          disableStream: false
        }).promise;
        if (doc) {
          if (cancelled) return;
          setPdf(doc);
          setTotalPages(doc.numPages);
          setCurrentPage(1);
        } else {
          // Fallback: Fetch as ArrayBuffer
          const resp = await fetch(signedUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/pdf,*/*' },
            mode: 'cors'
          });
          
          if (!resp.ok) {
            throw new Error(`Fetch failed: ${resp.status}`);
          }
          
          const ab = await resp.arrayBuffer();
          if (ab.byteLength === 0) {
            throw new Error('PDF file is empty');
          }
          
          const fallbackDoc = await pdfjsLib.getDocument({ 
            data: ab,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.3.31/cmaps/',
            cMapPacked: true
          }).promise;

          if (cancelled) return;
          setPdf(fallbackDoc);
          setTotalPages(fallbackDoc.numPages);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError('Failed to load PDF document');
      } finally {
        setIsLoading(false);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [signedUrl, clearCache]);

  // Render current page and preload adjacent pages
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;

    const renderCurrentPage = async () => {
      // Try to get page from cache first
      const cachedCanvas = getPage(currentPage);
      
      if (cachedCanvas) {
        // Instantly display cached page with no loading state
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && canvasRef.current) {
          canvasRef.current.width = cachedCanvas.width;
          canvasRef.current.height = cachedCanvas.height;
          ctx.drawImage(cachedCanvas, 0, 0);
          setIsLoading(false);
        }
        // Preload adjacent pages immediately in background
        preloadAdjacentPages(currentPage);
      } else {
        // Show loading only for uncached pages
        setIsLoading(true);
        
        // Aggressively preload current and adjacent pages for instant turns
        const preloadPromises = [
          preloadPage(currentPage),
          ...Array.from({length: 10}, (_, i) => preloadPage(currentPage + i + 1)),
          ...Array.from({length: 10}, (_, i) => preloadPage(currentPage - i - 1))
        ];
        
        // Wait only for current page, let others continue in background
        await preloadPage(currentPage);
        const newCachedCanvas = getPage(currentPage);
        
        if (newCachedCanvas && canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = newCachedCanvas.width;
            canvasRef.current.height = newCachedCanvas.height;
            ctx.drawImage(newCachedCanvas, 0, 0);
          }
        }
        setIsLoading(false);
      }
      
      // Notify parent of page change
      onPageChange?.(currentPage, totalPages);
    };

    renderCurrentPage();
  }, [pdf, currentPage, getPage, preloadPage, preloadAdjacentPages, onPageChange, totalPages]);

  // Page navigation
  const goToPage = useCallback((page: number) => {
    const clamped = Math.max(1, Math.min(page, totalPages));
    if (clamped !== currentPage) {
      setCurrentPage(clamped);
    }
  }, [currentPage, totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  // Touch navigation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;
    const deltaTime = Date.now() - touchStart.time;
    
    // Check for swipe (minimum distance and maximum time)
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;
    
    if (Math.abs(deltaX) > minSwipeDistance && deltaTime < maxSwipeTime && Math.abs(deltaY) < Math.abs(deltaX)) {
      e.preventDefault();
      if (deltaX > 0) {
        prevPage(); // Swipe right - previous page
      } else {
        nextPage(); // Swipe left - next page
      }
    } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      // Tap navigation
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const tapX = touchStart.x - containerRect.left;
        const tapZoneWidth = containerRect.width / 3;
        
        if (tapX < tapZoneWidth) {
          prevPage(); // Left tap zone
        } else if (tapX > containerRect.width - tapZoneWidth) {
          nextPage(); // Right tap zone
        }
      }
    }
    
    setTouchStart(null);
  }, [touchStart, prevPage, nextPage]);

  // Mouse click navigation
  const handleMouseClick = useCallback((e: React.MouseEvent) => {
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      const clickX = e.clientX - containerRect.left;
      const tapZoneWidth = containerRect.width / 3;
      
      if (clickX < tapZoneWidth) {
        prevPage();
      } else if (clickX > containerRect.width - tapZoneWidth) {
        nextPage();
      }
    }
  }, [prevPage, nextPage]);

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

  return (
    <Card className={cn("w-full max-w-7xl mx-auto", className)}>
      <CardContent className="p-0">
        <div 
          ref={containerRef}
          className="relative w-full h-[calc(100dvh-10rem)] min-h-[60vh] md:h-[calc(100dvh-9rem)] lg:h-[calc(100dvh-8rem)] overflow-y-auto overflow-x-hidden touch-pan-y"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}
          
          <canvas
            ref={canvasRef}
            className="w-full h-auto block mx-auto border"
            style={{ 
              maxHeight: '100%', 
              objectFit: 'contain',
              background: 'white',
              minHeight: '400px',
              border: '1px solid #ddd',
              opacity: isLoading ? 0.5 : 1,
              willChange: 'contents', // Hint to browser for GPU acceleration
              imageRendering: 'crisp-edges' // Faster rendering
            }}
          />

          {/* Touch/Click zones visual hint */}
          <>
            {/* Left tap zone */}
            <div className="absolute left-0 top-0 w-1/3 h-full z-10 flex items-center justify-start pl-4 opacity-0 hover:opacity-20 transition-opacity pointer-events-none">
              <div className="bg-primary/30 rounded-full p-2">
                <ChevronLeft className="h-6 w-6 text-primary" />
              </div>
            </div>
            {/* Right tap zone */}
            <div className="absolute right-0 top-0 w-1/3 h-full z-10 flex items-center justify-end pr-4 opacity-0 hover:opacity-20 transition-opacity pointer-events-none">
              <div className="bg-primary/30 rounded-full p-2">
                <ChevronRight className="h-6 w-6 text-primary" />
              </div>
            </div>
          </>

          {/* Page navigation controls */}
          {totalPages > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
              <div className="flex items-center gap-2 rounded-md border bg-background/90 backdrop-blur px-3 py-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={prevPage} 
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium tabular-nums min-w-[60px] text-center">
                  {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={nextPage} 
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FastPDFViewer;