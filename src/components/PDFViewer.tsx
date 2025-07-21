import React, { useState, useCallback } from 'react';
import { Worker, Viewer, SpecialZoomLevel } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { toolbarPlugin } from '@react-pdf-viewer/toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Import CSS
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/toolbar/lib/styles/index.css';

interface PDFViewerProps {
  pdfUrl: string;
  className?: string;
  initialScale?: number;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfUrl,
  className,
  initialScale = 1.0
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Create plugins
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      defaultTabs[0], // Thumbnails
      defaultTabs[1], // Bookmarks
    ],
    toolbarPlugin: {
      searchPlugin: {
        keyword: '',
      },
    },
  });

  const toolbarPluginInstance = toolbarPlugin();

  // Document load handlers
  const handleDocumentLoad = useCallback(() => {
    console.log('PDF loaded successfully');
    setIsLoading(false);
    setError(null);
  }, []);

  const handleDocumentError = useCallback((error: any) => {
    console.error('PDF Load Error:', error);
    setIsLoading(false);
    setError(error.message || 'Failed to load PDF');
  }, []);


  if (error) {
    return (
      <Card className={cn("w-full max-w-4xl mx-auto", className)}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold text-destructive">Failed to Load PDF</h3>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-6xl mx-auto", className)}>
      {/* PDF Content */}
      <CardContent className="p-0">
        <div className="relative h-[800px] w-full">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="flex flex-col items-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading PDF...</p>
              </div>
            </div>
          )}
          
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@5.3.93/build/pdf.worker.js">
            <Viewer
              fileUrl={pdfUrl}
              plugins={[defaultLayoutPluginInstance]}
              onDocumentLoad={handleDocumentLoad}
              defaultScale={initialScale}
            />
          </Worker>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFViewer;