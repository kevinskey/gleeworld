import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { FileText } from 'lucide-react';

// Set up the worker for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFThumbnailProps {
  pdfUrl: string;
  alt: string;
  className?: string;
}

export const PDFThumbnail: React.FC<PDFThumbnailProps> = ({ 
  pdfUrl, 
  alt, 
  className = "w-full h-full object-cover" 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const onLoadSuccess = () => {
    console.log('PDF loaded successfully');
    setLoading(false);
    setError(false);
  };

  const onLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setLoading(false);
    setError(true);
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <FileText className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-muted relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}
      
      <Document
        file={pdfUrl}
        onLoadSuccess={onLoadSuccess}
        onLoadError={onLoadError}
        loading=""
        error=""
        noData=""
      >
        <Page
          pageNumber={1}
          width={200}
          height={250}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          className={error ? 'hidden' : className}
        />
      </Document>
      
      {error && (
        <FileText className="h-12 w-12 text-muted-foreground" />
      )}
    </div>
  );
};