import { MediaFile } from './types';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

interface MediaPreviewModalProps {
  file: MediaFile;
  onClose: () => void;
  getFileType: (file: MediaFile) => string;
}

export const MediaPreviewModal = ({ file, onClose, getFileType }: MediaPreviewModalProps) => {
  const [zoom, setZoom] = useState(1);
  const fileType = getFileType(file);

  // Encode URL to handle special characters like apostrophes
  const encodeFileUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      urlObj.pathname = urlObj.pathname.split('/').map(segment => encodeURIComponent(decodeURIComponent(segment))).join('/');
      return urlObj.toString();
    } catch {
      return url;
    }
  };

  const encodedUrl = encodeFileUrl(file.file_url);

  const renderContent = () => {
    switch (fileType) {
      case 'image':
        return (
          <div className="relative flex items-center justify-center h-full overflow-auto">
            <img
              src={encodedUrl}
              alt={file.title}
              className="max-w-full max-h-full object-contain transition-transform"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
        );

      case 'video':
        return (
          <video
            src={encodedUrl}
            controls
            autoPlay
            className="max-w-full max-h-full"
          />
        );

      case 'audio':
        return (
          <div className="flex flex-col items-center justify-center gap-6 p-8">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-background flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500" />
              </div>
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg">{file.title}</h3>
              {file.description && (
                <p className="text-muted-foreground text-sm mt-1">{file.description}</p>
              )}
            </div>
            <audio 
              src={encodedUrl} 
              controls 
              className="w-full max-w-md"
              onError={(e) => console.error('Audio preview error:', e.currentTarget.error?.message)}
            />
            <p className="text-muted-foreground text-xs">Click play to start audio</p>
          </div>
        );

      case 'document':
        return (
          <iframe
            src={encodedUrl}
            className="w-full h-full"
            title={file.title}
          />
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground">
            <p>Preview not available for this file type</p>
            <Button onClick={() => window.open(encodedUrl, '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Download to View
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full p-0 overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <h3 className="text-white font-medium truncate max-w-[60%]">
            {file.title || 'Untitled'}
          </h3>
          <div className="flex items-center gap-2">
            {fileType === 'image' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
                  className="text-white hover:bg-white/20"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-white text-sm min-w-[50px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(z => Math.min(3, z + 0.25))}
                  className="text-white hover:bg-white/20"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(encodedUrl, '_blank')}
              className="text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex items-center justify-center h-full bg-black/90">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
