import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';

interface PDFThumbnailProps {
  pdfUrl: string;
  alt: string;
  className?: string;
  title?: string;
}

export const PDFThumbnail: React.FC<PDFThumbnailProps> = ({ 
  pdfUrl, 
  alt, 
  className = "w-full h-full",
  title 
}) => {
  const openPDF = () => {
    window.open(pdfUrl, '_blank');
  };

  return (
    <div 
      className="w-full h-full flex flex-col bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200 p-3"
      onClick={openPDF}
    >
      {/* PDF Icon */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-2">
          <div className="p-3 bg-red-100 rounded-full">
            <FileText className="h-8 w-8 text-red-600" />
          </div>
          <span className="text-xs font-medium text-gray-600 bg-red-50 px-2 py-1 rounded">
            PDF
          </span>
        </div>
      </div>
      
      {/* Title */}
      {title && (
        <div className="mt-2 text-xs text-center text-gray-700 font-medium line-clamp-2 leading-tight">
          {title}
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex items-center justify-center space-x-3 mt-2 pt-2 border-t border-gray-100">
        <Eye className="h-3 w-3 text-gray-400" />
        <span className="text-xs text-gray-500">Click to view</span>
        <Download className="h-3 w-3 text-gray-400" />
      </div>
    </div>
  );
};