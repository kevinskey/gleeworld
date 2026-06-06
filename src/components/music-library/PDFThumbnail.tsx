import React, { useEffect, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useSheetMusicUrl } from '@/hooks/useSheetMusicUrl';

// One-time worker config (idempotent — same as FastPDFViewer).
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

interface PDFThumbnailProps {
  pdfUrl: string;
  alt: string;
  className?: string;
  title?: string;
}

/**
 * Renders page 1 of a sheet music PDF as a canvas thumbnail. Lazy-loads
 * when the card scrolls into view to keep large libraries snappy.
 */
export const PDFThumbnail: React.FC<PDFThumbnailProps> = ({
  pdfUrl,
  alt,
  className = 'w-full h-full',
  title,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [inView, setInView] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const { signedUrl } = useSheetMusicUrl(pdfUrl);

  // Lazy: only start loading once visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !inView) {
          setInView(true);
        }
      },
      { threshold: 0.1 }
    );
    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [inView]);

  // Render page 1 via pdf.js
  useEffect(() => {
    if (!inView) return;
    const url = signedUrl || pdfUrl;
    if (!url) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    let loadingTask: any = null;
    setStatus('loading');

    (async () => {
      try {
        loadingTask = pdfjsLib.getDocument({ url, disableFontFace: true });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        const page = await pdf.getPage(1);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Render at the width of the container * device pixel ratio.
        const containerWidth = elementRef.current?.clientWidth || 220;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: 1 });
        const scale = (containerWidth * dpr) / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
        if (cancelled) return;
        setStatus('ready');
      } catch (err) {
        console.error('PDFThumbnail render error', err);
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      try { loadingTask?.destroy?.(); } catch (_) { /* noop */ }
    };
  }, [inView, signedUrl, pdfUrl]);

  return (
    <div
      ref={elementRef}
      className={`flex flex-col bg-white border-2 border-gray-200 rounded-lg overflow-hidden ${className}`}
    >
      {/* Preview area — canvas is always mounted so its ref stays stable. */}
      <div className="flex-1 relative bg-slate-50 min-h-[180px]">
        <canvas
          ref={canvasRef}
          aria-label={alt}
          className={`block w-full h-auto ${status === 'ready' ? '' : 'opacity-0'}`}
        />
        {(status === 'idle' || status === 'loading') && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
            <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-4 gap-2">
            <div className="p-3 bg-red-100 rounded-full">
              <FileText className="h-8 w-8 text-red-600" />
            </div>
            <span className="text-xs font-medium text-slate-700 bg-red-50 px-2 py-1 rounded">PDF</span>
          </div>
        )}
      </div>

      {title && (
        <div className="p-2 border-t border-gray-100">
          <div className="text-xs text-center text-slate-700 font-medium line-clamp-2 leading-tight">
            {title}
          </div>
        </div>
      )}
    </div>
  );
};
