import { useState, useRef } from 'react';
import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, X, ZoomIn, ZoomOut, RotateCw, Presentation } from 'lucide-react';
import { toast } from 'sonner';
import { PresentationViewer } from './PresentationViewer';

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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  };

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

  const renderPowerPointViewer = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 bg-gray-50 rounded-lg overflow-hidden">
        <iframe
          src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`}
          className="w-full h-full border-0"
          title={`PowerPoint Viewer - ${fileName}`}
          onError={() => {
            toast.error('Failed to load PowerPoint file. Try downloading instead.');
          }}
        />
      </div>
      <div className="mt-4 flex gap-4">
        <div className="flex-1 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> PowerPoint files are viewed using Google Docs viewer. 
            For full functionality, consider downloading the file.
          </p>
        </div>
        <Button
          onClick={() => setShowSlideshow(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
        >
          <Presentation className="h-4 w-4 mr-2" />
          Start Slideshow
        </Button>
      </div>
    </div>
  );

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
        <Button onClick={handleDownload} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Download File
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
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenExternal}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open External
              </Button>
              
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