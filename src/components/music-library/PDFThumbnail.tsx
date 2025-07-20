import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker - disable worker for now to avoid loading issues
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

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

        console.log('Generating PDF thumbnail for:', pdfUrl);

        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('PDF loading timeout')), 10000);
        });

        // Load the PDF document with timeout - just use the URL directly
        const pdfPromise = pdfjsLib.getDocument(pdfUrl).promise;

        const pdf = await Promise.race([pdfPromise, timeoutPromise]) as any;
        
        console.log('PDF loaded successfully');
        
        // Get the first page
        const page = await pdf.getPage(1);
        
        // Set up the canvas
        const scale = 1.5; // Reduced scale for better performance
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
        
        console.log('PDF page rendered successfully');
        
        // Convert canvas to blob and create URL
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setThumbnailUrl(url);
            console.log('PDF thumbnail generated successfully');
          } else {
            setError(true);
            console.error('Failed to create blob from canvas');
          }
          setLoading(false);
        }, 'image/jpeg', 0.7);
        
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
      onError={() => {
        console.error('Image failed to load');
        setError(true);
      }}
    />
  );
};