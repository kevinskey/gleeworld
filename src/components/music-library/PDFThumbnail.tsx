import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set the worker path for PDF.js - use the local version
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url
).toString();

interface PDFThumbnailProps {
  pdfUrl: string;
  alt: string;
  className?: string;
}

export const PDFThumbnail: React.FC<PDFThumbnailProps> = ({ pdfUrl, alt, className = "w-full h-full object-cover" }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!pdfUrl) {
      setLoading(false);
      setError(true);
      return;
    }

    const generateThumbnail = async () => {
      try {
        setLoading(true);
        setError(false);

        // Load the PDF document
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        
        // Get the first page
        const page = await pdf.getPage(1);
        
        // Set up the canvas
        const scale = 2; // Higher scale for better quality
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) {
          throw new Error('Could not get canvas context');
        }
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        // Render the page
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
        
        await page.render(renderContext).promise;
        
        // Convert canvas to blob and create URL
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setThumbnailUrl(url);
          } else {
            setError(true);
          }
          setLoading(false);
        }, 'image/jpeg', 0.8);
        
      } catch (err) {
        console.error('Error generating PDF thumbnail:', err);
        setError(true);
        setLoading(false);
      }
    };

    generateThumbnail();

    // Cleanup function to revoke blob URL
    return () => {
      if (thumbnailUrl) {
        URL.revokeObjectURL(thumbnailUrl);
      }
    };
  }, [pdfUrl]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !thumbnailUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={thumbnailUrl}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
};