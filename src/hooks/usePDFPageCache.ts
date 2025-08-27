import { useRef, useCallback, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

interface CachedPage {
  canvas: HTMLCanvasElement;
  scale: number;
  timestamp: number;
}

interface PDFPageCacheHook {
  getPage: (pageNum: number) => HTMLCanvasElement | null;
  preloadPage: (pageNum: number) => Promise<void>;
  preloadAdjacentPages: (currentPage: number) => Promise<void>;
  clearCache: () => void;
  cacheSize: number;
}

const MAX_CACHE_SIZE = 10; // Cache up to 10 pages
const PRELOAD_RANGE = 2; // Preload 2 pages ahead and behind

export const usePDFPageCache = (
  pdf: any | null,
  containerWidth: number,
  baseScale: number = 1.2
): PDFPageCacheHook => {
  const cacheRef = useRef<Map<number, CachedPage>>(new Map());
  const loadingPagesRef = useRef<Set<number>>(new Set());

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    loadingPagesRef.current.clear();
  }, []);

  const evictOldPages = useCallback(() => {
    if (cacheRef.current.size <= MAX_CACHE_SIZE) return;

    // Sort by timestamp and remove oldest pages
    const entries = Array.from(cacheRef.current.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp);
    
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    toRemove.forEach(([pageNum]) => {
      cacheRef.current.delete(pageNum);
    });
  }, []);

  const renderPageToCanvas = useCallback(async (pageNum: number): Promise<HTMLCanvasElement | null> => {
    if (!pdf || pageNum < 1 || pageNum > pdf.numPages) return null;

    try {
      const page = await pdf.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1 });
      
      // Calculate scale to fit container width
      const fitScale = containerWidth > 0 ? 
        Math.max(0.5, Math.min(3, containerWidth / baseViewport.width)) : 
        baseScale;
      
      const viewport = page.getViewport({ scale: fitScale });
      
      // Create offscreen canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;
      
      // Cache the rendered page
      const cachedPage: CachedPage = {
        canvas,
        scale: fitScale,
        timestamp: Date.now()
      };
      
      cacheRef.current.set(pageNum, cachedPage);
      evictOldPages();
      
      return canvas;
    } catch (error) {
      console.error(`Error rendering page ${pageNum}:`, error);
      return null;
    }
  }, [pdf, containerWidth, baseScale, evictOldPages]);

  const preloadPage = useCallback(async (pageNum: number): Promise<void> => {
    if (!pdf || pageNum < 1 || pageNum > pdf.numPages) return;
    if (cacheRef.current.has(pageNum)) return;
    if (loadingPagesRef.current.has(pageNum)) return;

    loadingPagesRef.current.add(pageNum);
    
    try {
      await renderPageToCanvas(pageNum);
    } finally {
      loadingPagesRef.current.delete(pageNum);
    }
  }, [pdf, renderPageToCanvas]);

  const getPage = useCallback((pageNum: number): HTMLCanvasElement | null => {
    const cached = cacheRef.current.get(pageNum);
    if (cached) {
      // Update timestamp for LRU
      cached.timestamp = Date.now();
      return cached.canvas;
    }
    return null;
  }, []);

  // Preload adjacent pages automatically
  const preloadAdjacentPages = useCallback(async (currentPage: number) => {
    if (!pdf) return;

    const pagesToPreload: number[] = [];
    
    // Preload next pages
    for (let i = 1; i <= PRELOAD_RANGE; i++) {
      const nextPage = currentPage + i;
      if (nextPage <= pdf.numPages) {
        pagesToPreload.push(nextPage);
      }
    }
    
    // Preload previous pages
    for (let i = 1; i <= PRELOAD_RANGE; i++) {
      const prevPage = currentPage - i;
      if (prevPage >= 1) {
        pagesToPreload.push(prevPage);
      }
    }

    // Preload in parallel
    const preloadPromises = pagesToPreload.map(pageNum => preloadPage(pageNum));
    await Promise.allSettled(preloadPromises);
  }, [pdf, preloadPage]);

  // Effect to clear cache when PDF changes
  useEffect(() => {
    clearCache();
  }, [pdf, clearCache]);

  return {
    getPage,
    preloadPage,
    preloadAdjacentPages,
    clearCache,
    cacheSize: cacheRef.current.size
  };
};