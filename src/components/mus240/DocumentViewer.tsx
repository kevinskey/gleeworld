import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, X, Presentation } from 'lucide-react';
import { toast } from 'sonner';
import { PresentationViewer } from './PresentationViewer';
import { NativePowerPointViewer } from './NativePowerPointViewer';
import { FastPDFViewer } from '@/components/FastPDFViewer';

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
    fileName.toLowerCase().endsWith('.pptx') ||
    fileUrl.toLowerCase().includes('.ppt') ||
    fileUrl.toLowerCase().includes('.pptx');
  const isGoogleSlides = fileUrl.includes('docs.google.com/presentation') || fileUrl.includes('slides.google.com');
  const isYouTube = fileUrl.includes('youtu.be') || fileUrl.includes('youtube.com/watch');

  const lowerName = `${fileName} ${fileUrl}`.toLowerCase();
  const isAudio = fileType.startsWith('audio/') || ['.mp3', '.wav', '.ogg', '.m4a'].some(ext => lowerName.includes(ext));
  const isVideoFile = fileType.startsWith('video/') || ['.mp4', '.webm', '.mov'].some(ext => lowerName.includes(ext));

  const isWebsite = !isPDF && !isPowerPoint && !isGoogleSlides && !isYouTube && !isAudio && !isVideoFile && (fileUrl.startsWith('http') || fileUrl.startsWith('https'));

  const handleOpenExternal = () => {
    // Stay in the same tab (in-app navigation) rather than opening a new window.
    window.location.assign(fileUrl);
  };

  const getFileTypeDisplay = () => {
    if (isPDF) return 'PDF';
    if (isPowerPoint) return 'PowerPoint';
    if (isGoogleSlides) return 'Google Slides';
    if (isYouTube) return 'YouTube Video';
    if (isVideoFile) return 'Video';
    if (isAudio) return 'Audio';
    if (isWebsite) return 'Website';
    return fileName.split('.').pop()?.toUpperCase() || 'Document';
  };

  const getGoogleSlidesEmbedUrl = (url: string) => {
    console.log('Converting Google Slides URL:', url);
    
    // Handle different Google Slides URL formats
    let presentationId = '';
    
    // Extract presentation ID from various URL formats
    const patterns = [
      /\/presentation\/d\/e\/([a-zA-Z0-9-_]+)/, // Published format (this should match the URL in question)
      /\/presentation\/d\/([a-zA-Z0-9-_]+)/, // Standard format
      /\/presentation\/u\/\d+\/d\/([a-zA-Z0-9-_]+)/, // User-specific format
      /id=([a-zA-Z0-9-_]+)/ // Query parameter format
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        presentationId = match[1];
        console.log('Found presentation ID:', presentationId);
        break;
      }
    }
    
    if (presentationId) {
      // Always use the published embed format for better compatibility
      const embedUrl = `https://docs.google.com/presentation/d/e/${presentationId}/embed?start=false&loop=false&delayms=3000`;
      console.log('Generated embed URL:', embedUrl);
      return embedUrl;
    }
    
    // If no ID found, try to convert different URL types
    if (url.includes('/pub?')) {
      // Published presentation - replace /pub with /embed
      const embedUrl = url.replace('/pub?', '/embed?').replace('start=true', 'start=false');
      console.log('Converted /pub URL to embed:', embedUrl);
      return embedUrl;
    } else if (url.includes('/edit')) {
      // Edit URL - replace with embed
      const embedUrl = url.replace('/edit', '/embed?start=false&loop=false&delayms=3000');
      console.log('Converted /edit URL to embed:', embedUrl);
      return embedUrl;
    }
    
    console.log('Using original URL as fallback:', url);
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
      <div className="h-full w-full overflow-auto">
        <FastPDFViewer 
          pdfUrl={fileUrl}
          onPageChange={(page, total) => {
            setCurrentPage(page);
            setTotalPages(total);
          }}
          className="w-full"
        />
      </div>
    );
  };

  const renderPowerPointViewer = () => {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          <div className="text-center p-8 max-w-md space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-lg mx-auto flex items-center justify-center">
              <Presentation className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">PowerPoint Slideshow</h3>
              <p className="text-sm text-muted-foreground mt-1">{fileName}</p>
            </div>

            <Button onClick={() => setShowPowerPointViewer(true)} className="w-full">
              Open Slideshow
            </Button>

            <p className="text-xs text-muted-foreground">
              If the slideshow fails to load, try re-uploading or exporting from PowerPoint as “.pptx (Standard)”.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Auto-open the native slideshow for ppt/pptx when the DocumentViewer modal opens.
  useEffect(() => {
    if (!isOpen) return;
    if (!isPowerPoint) return;
    setShowPowerPointViewer(true);
  }, [isOpen, isPowerPoint]);

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
          // Allow basic capabilities but keep this reasonably locked down.
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          referrerPolicy="strict-origin-when-cross-origin"
          onError={(e) => {
            console.warn('Website iframe error:', e);
            toast.error('This site cannot be embedded. Opening in the same tab...');
            handleOpenExternal();
          }}
        />
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
        This file type cannot be previewed directly. We'll open it in the same tab.
      </p>
      <Button onClick={handleOpenExternal} className="flex items-center gap-2">
        <ExternalLink className="h-4 w-4" />
        Open
      </Button>
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

        <div className="flex-1 overflow-auto min-h-0">
          {isPDF && renderPDFViewer()}
          {isPowerPoint && renderPowerPointViewer()}
          {isGoogleSlides && renderGoogleSlidesViewer()}
          {isYouTube && renderYouTubeViewer()}
          {isVideoFile && (
            <div className="h-full w-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
              <video className="w-full h-full" controls playsInline src={fileUrl} />
            </div>
          )}
          {isAudio && (
            <div className="h-full w-full flex items-center justify-center">
              <div className="w-full max-w-2xl">
                <audio className="w-full" controls src={fileUrl} />
              </div>
            </div>
          )}
          {isWebsite && renderWebsiteViewer()}
          {!isPDF && !isPowerPoint && !isGoogleSlides && !isYouTube && !isVideoFile && !isAudio && !isWebsite && renderUnsupportedFile()}
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
        
        {/* Native PowerPoint Slideshow Viewer */}
        {isPowerPoint && (
          <NativePowerPointViewer
            isOpen={showPowerPointViewer}
            onClose={() => {
              setShowPowerPointViewer(false);
              onClose();
            }}
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