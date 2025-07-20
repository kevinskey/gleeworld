import React, { useState } from 'react';
import { FileText, ExternalLink } from 'lucide-react';

interface PDFThumbnailProps {
  pdfUrl: string;
  alt: string;
  className?: string;
  title?: string;
}

export const PDFThumbnail: React.FC<PDFThumbnailProps> = ({ 
  pdfUrl, 
  alt, 
  className = "w-full h-full object-cover",
  title 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const openPDF = () => {
    window.open(pdfUrl, '_blank');
  };

  if (error) {
    return (
      <div 
        className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg cursor-pointer hover:from-red-100 hover:to-red-200 transition-colors p-2"
        onClick={openPDF}
        title={`Click to open ${title || alt}`}
      >
        <FileText className="h-8 w-8 text-red-600 mb-1" />
        <div className="text-xs text-center text-red-700 font-medium">PDF</div>
        <ExternalLink className="h-3 w-3 text-red-500 mt-1 opacity-60" />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-muted rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )}
      
      <iframe
        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH`}
        className={`w-full h-full border-0 ${loading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={handleLoad}
        onError={handleError}
        title={alt}
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Click overlay to open PDF */}
      <div 
        className="absolute inset-0 cursor-pointer hover:bg-black hover:bg-opacity-10 transition-colors"
        onClick={openPDF}
        title={`Click to open ${title || alt}`}
      />
    </div>
  );
};