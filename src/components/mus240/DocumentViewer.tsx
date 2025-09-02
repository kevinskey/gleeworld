import { useState, useRef } from 'react';
import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, X, ZoomIn, ZoomOut, RotateCw, Presentation, Play } from 'lucide-react';
import { toast } from 'sonner';
import { PresentationViewer } from './PresentationViewer';
import { PowerPointViewer } from './PowerPointViewer';

// Import the styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

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
  const [zoom, setZoom] = useState(SpecialZoomLevel.PageFit);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [showPowerPointViewer, setShowPowerPointViewer] = useState(false);

  // Create plugins
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      defaultTabs[0], // Thumbnail tab
      defaultTabs[1], // Bookmark tab
    ],
  });

  const isPDF = fileType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
  const isPowerPoint = fileType.includes('presentation') || 
    fileName.toLowerCase().endsWith('.ppt') || 
    fileName.toLowerCase().endsWith('.pptx');


  const handleOpenExternal = () => {
    window.open(fileUrl, '_blank');
  };

  const getFileTypeDisplay = () => {
    if (isPDF) return 'PDF';
    if (isPowerPoint) return 'PowerPoint';
    return fileName.split('.').pop()?.toUpperCase() || 'Document';
  };

  const renderPDFViewer = () => (
    <div className="h-full">
      <Worker workerUrl="/node_modules/pdfjs-dist/build/pdf.worker.min.js">
        <div className="h-full overflow-hidden">
          <Viewer
            fileUrl={fileUrl}
            plugins={[defaultLayoutPluginInstance]}
            defaultScale={zoom}
            onDocumentLoad={(e) => {
              setTotalPages(e.doc.numPages);
              setCurrentPage(1);
            }}
            onPageChange={(e) => setCurrentPage(e.currentPage + 1)}
          />
        </div>
      </Worker>
    </div>
  );

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg font-semibold truncate max-w-md">
                {title}
              </DialogTitle>
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
              
              {!isPowerPoint && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenExternal}
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open External
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
          {isPDF && renderPDFViewer()}
          {isPowerPoint && renderPowerPointViewer()}
          {!isPDF && !isPowerPoint && renderUnsupportedFile()}
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