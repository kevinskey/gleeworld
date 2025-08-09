import React, { useState, useRef, useEffect } from 'react';
import { FileText, Download, Eye, Loader2, Lock } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { useSheetMusicUrl } from '@/hooks/useSheetMusicUrl';

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
  const [isInView, setIsInView] = useState(false);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const { canDownloadPDF, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const { signedUrl } = useSheetMusicUrl(pdfUrl);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isInView) {
          setIsInView(true);
          setIsLoading(true);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [isInView]);

  const handleClick = () => {
    if (roleLoading) return;
    
    if (!canDownloadPDF()) {
      toast({
        title: "Access Denied",
        description: "Only admins and librarians can download PDFs.",
        variant: "destructive",
      });
      return;
    }
    
    window.open(signedUrl || pdfUrl, '_blank');
  };

  const handlePreviewLoad = () => {
    setPreviewLoaded(true);
    setIsLoading(false);
    setPreviewError(false);
  };

  const handlePreviewError = () => {
    setPreviewError(true);
    setIsLoading(false);
  };

  return (
    <div 
      ref={elementRef}
      className={`w-full h-full flex flex-col bg-white border-2 rounded-lg transition-all duration-200 overflow-hidden ${
        canDownloadPDF() 
          ? 'border-gray-200 cursor-pointer hover:border-primary hover:shadow-md' 
          : 'border-red-200 bg-red-50/50'
      }`}
      onClick={handleClick}
    >
      {/* Preview Area */}
      <div className="flex-1 relative">
        {!canDownloadPDF() ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 p-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 bg-red-100 rounded-full">
                <Lock className="h-8 w-8 text-red-600" />
              </div>
              <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                Restricted
              </span>
              <span className="text-xs text-center text-red-600">
                Admin/Librarian access required
              </span>
            </div>
          </div>
        ) : isInView && !previewError ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
              </div>
            )}
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(signedUrl || pdfUrl)}&embedded=true`}
              className={`w-full h-full border-0 transition-opacity duration-300 ${
                previewLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={handlePreviewLoad}
              onError={handlePreviewError}
              title={alt}
              style={{ pointerEvents: 'none' }}
              sandbox="allow-scripts allow-same-origin"
              referrerPolicy="no-referrer"
              loading="lazy"
            />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="flex flex-col items-center space-y-2">
              <div className="p-3 bg-red-100 rounded-full">
                <FileText className="h-8 w-8 text-red-600" />
              </div>
              <span className="text-xs font-medium text-gray-600 bg-red-50 px-2 py-1 rounded">
                PDF
              </span>
            </div>
          </div>
        )}
      </div>
      
      {/* Title */}
      {title && (
        <div className="p-2 border-t border-gray-100">
          <div className="text-xs text-center text-gray-700 font-medium line-clamp-2 leading-tight">
            {title}
          </div>
        </div>
      )}
      
      {/* Action Hint */}
      <div className="flex items-center justify-center space-x-2 p-2 bg-gray-50 border-t border-gray-100">
        {canDownloadPDF() ? (
          <>
            <Eye className="h-3 w-3 text-gray-400" />
            <span className="text-xs text-gray-500">Click to open</span>
          </>
        ) : (
          <>
            <Lock className="h-3 w-3 text-red-400" />
            <span className="text-xs text-red-500">Access restricted</span>
          </>
        )}
      </div>
    </div>
  );
};