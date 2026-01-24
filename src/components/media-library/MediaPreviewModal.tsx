import { MediaFile } from './types';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, ExternalLink, FileText, FileSpreadsheet, Presentation, FileArchive, FileCode } from 'lucide-react';
import { useState } from 'react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface MediaPreviewModalProps {
  file: MediaFile;
  onClose: () => void;
  getFileType: (file: MediaFile) => string;
}

// Extended file type detection
const getExtendedFileType = (file: MediaFile): string => {
  const url = file.file_url?.toLowerCase() || '';
  const type = file.file_type?.toLowerCase() || '';
  const title = file.title?.toLowerCase() || '';
  
  // Images
  if (type.includes('image') || url.match(/\.(jpg|jpeg|png|gif|webp|svg|heic|bmp|ico|tiff?)$/)) return 'image';
  
  // Video
  if (type.includes('video') || url.match(/\.(mp4|mov|avi|webm|mkv|m4v|wmv|flv)$/)) return 'video';
  
  // Audio
  if (type.includes('audio') || url.match(/\.(mp3|wav|m4a|aac|ogg|flac|wma)$/)) return 'audio';
  
  // PDF
  if (type.includes('pdf') || url.match(/\.pdf$/)) return 'pdf';
  
  // PowerPoint
  if (type.includes('presentation') || type.includes('powerpoint') || url.match(/\.(ppt|pptx)$/) || title.match(/\.(ppt|pptx)$/)) return 'powerpoint';
  
  // Word
  if (type.includes('word') || type.includes('document') && type.includes('office') || url.match(/\.(doc|docx)$/) || title.match(/\.(doc|docx)$/)) return 'word';
  
  // Excel
  if (type.includes('spreadsheet') || type.includes('excel') || url.match(/\.(xls|xlsx|csv)$/) || title.match(/\.(xls|xlsx)$/)) return 'excel';
  
  // Code/Text
  if (url.match(/\.(js|jsx|ts|tsx|json|html|css|scss|md|txt|yaml|yml|xml)$/)) return 'code';
  
  // Archive
  if (url.match(/\.(zip|rar|7z|tar|gz)$/)) return 'archive';
  
  return 'other';
};

// Google Docs Viewer URL
const getGoogleViewerUrl = (url: string) => {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
};

// Office Online Viewer URL
const getOfficeViewerUrl = (url: string) => {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
};

export const MediaPreviewModal = ({ file, onClose, getFileType }: MediaPreviewModalProps) => {
  const [zoom, setZoom] = useState(1);
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);
  const fileType = getExtendedFileType(file);

  // Use raw URL - Supabase handles encoding
  const fileUrl = file.file_url;

  const renderContent = () => {
    switch (fileType) {
      case 'image':
        return (
          <div className="relative flex items-center justify-center h-full overflow-auto">
            <img
              src={fileUrl}
              alt={file.title}
              className="max-w-full max-h-full object-contain transition-transform"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
        );

      case 'video':
        return (
          <video
            src={fileUrl}
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
              <h3 className="font-semibold text-lg text-white">{file.title}</h3>
              {file.description && (
                <p className="text-white/70 text-sm mt-1">{file.description}</p>
              )}
            </div>
            <audio 
              src={fileUrl} 
              controls 
              autoPlay
              className="w-full max-w-md"
              onError={(e) => console.error('Audio preview error:', e.currentTarget.error?.message)}
            />
          </div>
        );

      case 'pdf':
        return (
          <iframe
            src={useGoogleViewer ? getGoogleViewerUrl(fileUrl) : fileUrl}
            className="w-full h-full bg-white"
            title={file.title}
            onError={() => setUseGoogleViewer(true)}
          />
        );

      case 'powerpoint':
        return (
          <div className="w-full h-full flex flex-col">
            <iframe
              src={getOfficeViewerUrl(fileUrl)}
              className="w-full flex-1 bg-white"
              title={file.title}
            />
            <div className="bg-muted/50 p-2 text-center">
              <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in PowerPoint Online
              </Button>
            </div>
          </div>
        );

      case 'word':
        return (
          <div className="w-full h-full flex flex-col">
            <iframe
              src={getOfficeViewerUrl(fileUrl)}
              className="w-full flex-1 bg-white"
              title={file.title}
            />
            <div className="bg-muted/50 p-2 text-center">
              <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Word Online
              </Button>
            </div>
          </div>
        );

      case 'excel':
        return (
          <div className="w-full h-full flex flex-col">
            <iframe
              src={getOfficeViewerUrl(fileUrl)}
              className="w-full flex-1 bg-white"
              title={file.title}
            />
            <div className="bg-muted/50 p-2 text-center">
              <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Excel Online
              </Button>
            </div>
          </div>
        );

      case 'code':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-white">
            <FileCode className="h-20 w-20 text-green-400" />
            <p className="text-lg font-medium">{file.title}</p>
            <p className="text-white/60">Code/Text File</p>
            <Button onClick={() => window.open(fileUrl, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        );

      case 'archive':
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-white">
            <FileArchive className="h-20 w-20 text-yellow-400" />
            <p className="text-lg font-medium">{file.title}</p>
            <p className="text-white/60">Archive File</p>
            <Button onClick={() => window.open(fileUrl, '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Download Archive
            </Button>
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center gap-4 text-white">
            <FileText className="h-20 w-20 text-gray-400" />
            <p className="text-lg font-medium">{file.title}</p>
            <p className="text-white/60">{file.file_type || 'Unknown file type'}</p>
            <div className="flex gap-2">
              <Button onClick={() => window.open(getGoogleViewerUrl(fileUrl), '_blank')} variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                Try Google Viewer
              </Button>
              <Button onClick={() => window.open(fileUrl, '_blank')}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        );
    }
  };

  const getTypeIcon = () => {
    switch (fileType) {
      case 'powerpoint': return <Presentation className="h-4 w-4 mr-2" />;
      case 'word': return <FileText className="h-4 w-4 mr-2" />;
      case 'excel': return <FileSpreadsheet className="h-4 w-4 mr-2" />;
      default: return null;
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[90vh] w-full h-full p-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>{file.title || 'Media Preview'}</DialogTitle>
        </VisuallyHidden>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
          <h3 className="text-white font-medium truncate max-w-[60%] flex items-center">
            {getTypeIcon()}
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
              onClick={() => window.open(fileUrl, '_blank')}
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
