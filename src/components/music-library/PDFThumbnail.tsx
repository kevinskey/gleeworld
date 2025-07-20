import React from 'react';
import { FileText, Download } from 'lucide-react';

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
  const handleClick = () => {
    window.open(pdfUrl, '_blank');
  };

  return (
    <div 
      className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg cursor-pointer hover:from-red-100 hover:to-red-200 transition-colors p-4"
      onClick={handleClick}
      title={`Click to open ${title || alt}`}
    >
      <FileText className="h-12 w-12 text-red-600 mb-2" />
      <div className="text-xs text-center text-red-700 font-medium">PDF</div>
      {title && (
        <div className="text-xs text-center text-red-600 mt-1 line-clamp-2 leading-tight">
          {title}
        </div>
      )}
      <Download className="h-4 w-4 text-red-500 mt-2 opacity-60" />
    </div>
  );
};