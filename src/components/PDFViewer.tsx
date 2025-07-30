import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PDFViewerProps {
  pdfUrl: string;
  className?: string;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfUrl,
  className
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  console.log('PDFViewer: Attempting to load PDF:', pdfUrl);

  const handleLoad = () => {
  console.log('PDFViewer: PDF loaded successfully');
  setIsLoading(false);
  setError(null);
};

const handleError = () => {
  console.error('PDFViewer: Failed to load PDF:', pdfUrl);
  setIsLoading(false);
  setError('Failed to load PDF. The file might be corrupted or inaccessible.');
  };

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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => window.open(pdfUrl, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button 
              onClick={() => {
                setError(null);
                setIsLoading(true);
              }} 
              variant="outline"
            >
              Try Again
            </Button>
          </div>
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
          
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`}
            className="w-full h-full border-0"
            onLoad={handleLoad}
            onError={handleError}
            title="PDF Viewer"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFViewer;