import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, X, RefreshCw, Presentation, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PowerPointViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  title: string;
}

export function PowerPointViewer({ 
  isOpen, 
  onClose, 
  fileUrl, 
  fileName, 
  title 
}: PowerPointViewerProps) {
  const [viewerMethod, setViewerMethod] = useState<'google' | 'microsoft' | 'download'>('google');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);


  const handleOpenExternal = () => {
    window.open(fileUrl, '_blank');
  };

  // Try different viewer methods
  const getViewerUrl = () => {
    // For private Supabase storage URLs, external viewers often fail due to CORS
    // Let's try a direct approach first, then fallback
    const encodedUrl = encodeURIComponent(fileUrl);
    
    switch (viewerMethod) {
      case 'google':
        return `https://docs.google.com/gview?url=${encodedUrl}&embedded=true`;
      case 'microsoft':
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
      default:
        return null;
    }
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
    
    // Try the next viewer method
    if (viewerMethod === 'google') {
      setViewerMethod('microsoft');
      setIsLoading(true);
      setHasError(false);
      toast.info('Trying Microsoft Office Online viewer...');
    } else if (viewerMethod === 'microsoft') {
      setViewerMethod('download');
      toast.error('Online PowerPoint viewers are blocked. Please download the file to view it.');
    }
  };

  const resetViewer = () => {
    setViewerMethod('google');
    setIsLoading(true);
    setHasError(false);
  };

  useEffect(() => {
    if (isOpen) {
      // For private Supabase URLs, external viewers will fail due to CORS
      // Skip to download mode immediately for better UX
      if (fileUrl.includes('supabase.co/storage') && fileUrl.includes('/object/')) {
        setViewerMethod('download');
        setIsLoading(false);
        setHasError(false);
      } else {
        setIsLoading(true);
        setHasError(false);
        setViewerMethod('google');
      }
    }
  }, [isOpen, fileUrl]);

  const renderViewer = () => {
    const viewerUrl = getViewerUrl();
    
    if (viewerMethod === 'download' || !viewerUrl) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
          <div className="bg-amber-100 rounded-full p-6 mb-4">
            <AlertCircle className="h-12 w-12 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Content Protected</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            This PowerPoint presentation is protected and cannot be viewed or downloaded directly.
          </p>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            Please contact your instructor for access to this content.
          </p>
        </div>
      );
    }

    return (
      <div className="h-full relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mx-auto mb-4 flex items-center justify-center animate-pulse">
                <Presentation className="h-8 w-8 text-white" />
              </div>
              <p className="text-gray-600">
                Loading PowerPoint via {viewerMethod === 'google' ? 'Google Docs' : 'Microsoft Office Online'}...
              </p>
            </div>
          </div>
        )}
        
        <iframe
          src={viewerUrl}
          className="w-full h-full border-0"
          title={`PowerPoint Viewer - ${fileName}`}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          allow="cross-origin-isolated"
        />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-semibold truncate max-w-md">
                {title}
              </DialogTitle>
              <Badge variant="outline" className="flex items-center gap-1">
                <Presentation className="h-3 w-3" />
                PowerPoint
              </Badge>
              {viewerMethod !== 'download' && (
                <Badge variant="secondary" className="text-xs">
                  {viewerMethod === 'google' ? 'Google Docs' : 'Office Online'}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {hasError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetViewer}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {renderViewer()}
        </div>

        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>File: {fileName}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>
                {viewerMethod === 'google' 
                  ? 'Powered by Google Docs Viewer' 
                  : viewerMethod === 'microsoft' 
                  ? 'Powered by Microsoft Office Online'
                  : 'Download to view PowerPoint presentation'
                }
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}