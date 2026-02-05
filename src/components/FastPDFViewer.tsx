import React, { useEffect, useRef, useState, useCallback } from 'react';
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
      <div className={cn("w-full flex items-center justify-center p-8", className)}>
        <p className="text-muted-foreground">No PDF available</p>
      </div>
    );
  }

  if (urlLoading) {
    return (
      <div className={cn("w-full flex flex-col items-center justify-center p-8 space-y-2", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Preparing PDF...</p>
      </div>
    );
  }

  if (urlError || !signedUrl) {
    return (
      <div className={cn("w-full flex flex-col items-center justify-center text-center p-8 space-y-4", className)}>
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div>
          <h3 className="text-lg font-semibold text-destructive">Failed to Load PDF</h3>
          <p className="text-sm text-muted-foreground mt-1">{urlError || 'PDF unavailable'}</p>
        </div>
        <Button variant="outline" onClick={() => window.open(pdfUrl, '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Try Direct Link
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("w-full flex flex-col items-center justify-center text-center p-8 space-y-4", className)}>
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div>
          <h3 className="text-lg font-semibold text-destructive">Failed to Load PDF</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(signedUrl || pdfUrl, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button onClick={() => { setError(null); setIsLoading(true); }} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full", className)}>
      <div 
        ref={containerRef}
        className="relative w-full h-full overflow-auto touch-pan-y"
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
          className="block mx-auto"
          style={{ 
            width: '100%',
            maxWidth: '100%',
            height: 'auto',
            background: 'white',
            opacity: isLoading ? 0.5 : 1,
            willChange: 'contents',
            imageRendering: 'crisp-edges'
          }}
        />

        {/* Page navigation - top right, out of the way */}
        {totalPages > 1 && (
          <div className="absolute top-2 right-2 z-20">
            <div className="flex items-center gap-1 rounded-full border bg-background/95 backdrop-blur-md px-2 py-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full" 
                onClick={prevPage} 
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-[10px] font-medium tabular-nums min-w-[40px] text-center">
                {currentPage} / {totalPages}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 rounded-full" 
                onClick={nextPage} 
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FastPDFViewer;