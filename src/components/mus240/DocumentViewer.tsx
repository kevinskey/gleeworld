import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, X, ZoomIn, ZoomOut, RotateCw, Presentation, Play } from 'lucide-react';
import { toast } from 'sonner';
import { PresentationViewer } from './PresentationViewer';
import { PowerPointViewer } from './PowerPointViewer';

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
  title: string;
}

export function DocumentViewer({ 
  isOpen, 
  onClose, 
  fileUrl, 
  fileName, 
  fileType, 
  title 
}: DocumentViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [showPowerPointViewer, setShowPowerPointViewer] = useState(false);

  const isPDF = fileType === 'application/pdf' || 
    fileName.toLowerCase().endsWith('.pdf') || 
    fileUrl.toLowerCase().includes('.pdf') ||
    fileUrl.toLowerCase().includes('pdf');
  const isPowerPoint = fileType.includes('presentation') || 
    fileName.toLowerCase().endsWith('.ppt') || 
    fileName.toLowerCase().endsWith('.pptx');
  const isGoogleSlides = fileUrl.includes('docs.google.com/presentation') || fileUrl.includes('slides.google.com');
  const isYouTube = fileUrl.includes('youtu.be') || fileUrl.includes('youtube.com/watch');
  const isWebsite = !isPDF && !isPowerPoint && !isGoogleSlides && !isYouTube && (fileUrl.startsWith('http') || fileUrl.startsWith('https'));


  const handleOpenExternal = () => {
    if (isGoogleSlides) {
      // Open Google Slides in a new window with specific dimensions
      window.open(fileUrl, 'googleslideswindow', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    } else {
      window.open(fileUrl, '_blank');
    }
  };

  const getFileTypeDisplay = () => {
    if (isPDF) return 'PDF';
    if (isPowerPoint) return 'PowerPoint';
    if (isGoogleSlides) return 'Google Slides';
    if (isYouTube) return 'YouTube Video';
    if (isWebsite) return 'Website';
    return fileName.split('.').pop()?.toUpperCase() || 'Document';
  };

  // Convert Google Slides URL to embed format
  const getGoogleSlidesEmbedUrl = (url: string) => {
    // Handle different Google Slides URL formats
    let presentationId = '';
    
    // Extract presentation ID from various URL formats
    const patterns = [
      /\/presentation\/d\/([a-zA-Z0-9-_]+)/, // Standard format
      /\/presentation\/u\/\d+\/d\/([a-zA-Z0-9-_]+)/, // User-specific format
      /\/presentation\/d\/e\/([a-zA-Z0-9-_]+)/, // Published format
      /id=([a-zA-Z0-9-_]+)/ // Query parameter format
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        presentationId = match[1];
        break;
      }
    }
    
    if (presentationId) {
      // Check if it's a published presentation (contains /d/e/)
      if (url.includes('/d/e/')) {
        return `https://docs.google.com/presentation/d/e/${presentationId}/embed?start=false&loop=false&delayms=3000`;
      } else {
        return `https://docs.google.com/presentation/d/${presentationId}/embed?start=false&loop=false&delayms=3000`;
      }
    }
    
    // If no ID found, try to convert different URL types
    if (url.includes('/pub?')) {
      // Published presentation - replace /pub with /embed
      return url.replace('/pub?', '/embed?').replace('start=true', 'start=false');
    } else if (url.includes('/edit')) {
      // Edit URL - replace with embed
      return url.replace('/edit', '/embed?start=false&loop=false&delayms=3000');
    }
    
    return url;
  };

  // Convert YouTube URL to embed format
  const getYouTubeEmbedUrl = (url: string) => {
    // Extract video ID from various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/, // Standard formats
      /youtube\.com\/v\/([^&\n?#]+)/, // Old embed format
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const videoId = match[1];
        return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`;
      }
    }
    
    return url;
  };

  const renderPDFViewer = () => {
    console.log('DocumentViewer: Rendering PDF with URL:', fileUrl);
    console.log('DocumentViewer: PDF detection - fileType:', fileType, 'fileName:', fileName, 'isPDF:', isPDF);
    return (
      <div className="h-full">
        <iframe
          src={fileUrl}
          className="w-full h-full border-0"
          title={title || 'PDF Document'}
          onLoad={() => {
            console.log('DocumentViewer: PDF loaded directly');
          }}
          onError={(e) => {
            console.error('DocumentViewer: Direct PDF load failed:', e);
            toast.error('PDF cannot be displayed in browser. Opening in new tab...');
            setTimeout(() => {
              window.open(fileUrl, '_blank');
            }, 1500);
          }}
        />
        {/* Manual fallback button */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(fileUrl, '_blank')}
            className="bg-white/90 backdrop-blur-sm border-gray-300 text-gray-700 hover:bg-white"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
        </div>
      </div>
    );
  };

  const renderPowerPointViewer = () => {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
          <div className="text-center p-8 max-w-md">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg mx-auto mb-6 flex items-center justify-center">
              <Presentation className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-4">Content Protected</h3>
            <h4 className="text-lg font-medium text-amber-300 mb-4">{fileName}</h4>
            
            <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
              <p className="text-sm text-slate-200">
                This PowerPoint presentation is protected and cannot be viewed or downloaded directly.
              </p>
              <p className="text-xs text-slate-300 mt-2">
                Please contact your instructor for access to this content.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGoogleSlidesViewer = () => {
    const embedUrl = getGoogleSlidesEmbedUrl(fileUrl);
    
    return (
      <div className="h-full">
        <iframe
          src={embedUrl}
          className="w-full h-full border-0 rounded-lg"
          title={`Google Slides - ${title}`}
          allowFullScreen
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          onError={(e) => {
            console.warn('Google Slides iframe error:', e);
            toast.error('Error loading Google Slides presentation');
          }}
        />
      </div>
    );
  };

  const renderYouTubeViewer = () => {
    const embedUrl = getYouTubeEmbedUrl(fileUrl);
    
    return (
      <div className="h-full">
        <iframe
          src={embedUrl}
          className="w-full h-full border-0 rounded-lg"
          title={`YouTube Video - ${title}`}
          allowFullScreen
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={(e) => {
            console.warn('YouTube iframe error:', e);
            toast.error('Error loading YouTube video');
          }}
        />
      </div>
    );
  };

  const renderWebsiteViewer = () => {
    return (
      <div className="h-full">
        <iframe
          src={fileUrl}
          className="w-full h-full border-0 rounded-lg"
          title={`Website - ${title}`}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={(e) => {
            console.warn('Website iframe error:', e);
            toast.error('This website cannot be embedded. Opening in new tab...');
            setTimeout(() => {
              window.open(fileUrl, '_blank');
            }, 1000);
          }}
        />
        {/* Fallback message for blocked content */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <div className="text-center p-6 bg-white rounded-lg shadow-lg pointer-events-auto">
            <p className="text-sm text-muted-foreground mb-4">
              If the website doesn't load, it may block embedding for security reasons.
            </p>
            <Button
              onClick={() => window.open(fileUrl, '_blank')}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderUnsupportedFile = () => (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <div className="bg-gray-100 rounded-full p-6 mb-4">
        <ExternalLink className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Preview Not Available</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        This file type cannot be previewed directly. Please download the file to view its contents.
      </p>
      <div className="flex gap-3">
        <Button onClick={handleOpenExternal} className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Open File
        </Button>
        <Button variant="outline" onClick={handleOpenExternal} className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4" />
          Open in New Tab
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4 border-b">
          <DialogTitle className="text-lg font-semibold truncate max-w-md">
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Document viewer for {getFileTypeDisplay()} file: {fileName}
          </DialogDescription>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="outline">
                {getFileTypeDisplay()}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              {isPDF && totalPages > 0 && (
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
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
          {isPDF && renderPDFViewer()}
          {isPowerPoint && renderPowerPointViewer()}
          {isGoogleSlides && renderGoogleSlidesViewer()}
          {isYouTube && renderYouTubeViewer()}
          {isWebsite && renderWebsiteViewer()}
          {!isPDF && !isPowerPoint && !isGoogleSlides && !isYouTube && !isWebsite && renderUnsupportedFile()}
        </div>

        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>File: {fileName}</span>
              {fileUrl && (
                <span>Size: Loading...</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>Use Ctrl+F to search within the document</span>
            </div>
          </div>
        </div>
        
        {/* PowerPoint Online Viewer */}
        {isPowerPoint && (
          <PowerPointViewer
            isOpen={showPowerPointViewer}
            onClose={() => setShowPowerPointViewer(false)}
            fileUrl={fileUrl}
            fileName={fileName}
            title={title}
          />
        )}
        
        {/* Slideshow Modal */}
        {isPowerPoint && (
          <PresentationViewer
            isOpen={showSlideshow}
            onClose={() => setShowSlideshow(false)}
            fileUrl={fileUrl}
            fileName={fileName}
            title={title}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}