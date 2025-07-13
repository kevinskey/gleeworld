import { useState, useEffect } from 'react';

export const usePdfThumbnail = (pdfUrl: string | null) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfUrl) {
      setThumbnailUrl(null);
      return;
    }

    const generateThumbnail = async () => {
      try {
        setLoading(true);
        setError(null);

        // Dynamic import of pdfjs-dist to avoid SSR issues
        const pdfjs = await import('pdfjs-dist');
        
        // Set up worker
        pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

        // Load the PDF
        const pdf = await pdfjs.getDocument(pdfUrl).promise;
        
        // Get the first page
        const page = await pdf.getPage(1);
        
        // Set up canvas for rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Failed to get canvas context');
        }

        // Calculate scale to make thumbnail width around 200px
        const viewport = page.getViewport({ scale: 1 });
        const scale = 200 / viewport.width;
        const scaledViewport = page.getViewport({ scale });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // Render the page
        await page.render({
          canvasContext: context,
          viewport: scaledViewport,
        }).promise;

        // Convert canvas to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setThumbnailUrl(dataUrl);
      } catch (err) {
        console.error('Error generating PDF thumbnail:', err);
        setError(err instanceof Error ? err.message : 'Failed to generate thumbnail');
      } finally {
        setLoading(false);
      }
    };

    generateThumbnail();
  }, [pdfUrl]);

  return { thumbnailUrl, loading, error };
};