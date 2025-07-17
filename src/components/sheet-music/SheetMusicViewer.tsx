import React, { useState, useCallback } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Download, 
  Loader2, 
  AlertCircle, 
  Music,
  Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';
import { PitchPipe } from "./audio-utilities/PitchPipe";
import { Tuner } from "./audio-utilities/Tuner";

// Import CSS
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

type SheetMusic = Database['public']['Tables']['gw_sheet_music']['Row'];

interface SheetMusicViewerProps {
  sheetMusic: SheetMusic;
  onBack: () => void;
  className?: string;
}

export const SheetMusicViewer: React.FC<SheetMusicViewerProps> = ({
  sheetMusic,
  onBack,
  className
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAudioTools, setShowAudioTools] = useState<boolean>(false);

  console.log('🔍 SheetMusicViewer rendering with:', sheetMusic.title);
  console.log('📄 PDF URL:', sheetMusic.pdf_url);

  // Create plugins
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      defaultTabs[0], // Thumbnails
    ],
  });

  // Document load handlers
  const handleDocumentLoad = useCallback(() => {
    console.log('✅ PDF loaded successfully:', sheetMusic.title);
    setIsLoading(false);
    setError(null);
  }, [sheetMusic.title]);

  // Download handler
  const downloadPDF = useCallback(async () => {
    try {
      const response = await fetch(sheetMusic.pdf_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sheetMusic.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [sheetMusic.pdf_url, sheetMusic.title]);

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button onClick={onBack} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Library
              </Button>
              
              <div className="flex items-center gap-2">
                <Music className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">{sheetMusic.title}</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Error Content */}
        <div className="container mx-auto px-4 py-6">
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button onClick={onBack} variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Library
              </Button>
              
              <div className="flex items-center gap-2">
                <Music className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">{sheetMusic.title}</h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setShowAudioTools(!showAudioTools)} 
                variant="outline" 
                size="sm"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Audio Tools
              </Button>
              
              <Button onClick={downloadPDF} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Tools Panel */}
      {showAudioTools && (
        <div className="border-b bg-muted/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[300px]">
                <PitchPipe 
                  isOpen={showAudioTools} 
                  onClose={() => setShowAudioTools(false)} 
                />
              </div>
              <div className="flex-1 min-w-[300px]">
                <Tuner 
                  isOpen={showAudioTools} 
                  onClose={() => setShowAudioTools(false)} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Content */}
      <div className="container mx-auto px-4 py-6">
        <Card className={cn("w-full max-w-7xl mx-auto", className)}>
          <CardContent className="p-0">
            <div className="relative h-[900px] w-full">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading sheet music...</p>
                  </div>
                </div>
              )}
              
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                <Viewer
                  fileUrl={sheetMusic.pdf_url}
                  plugins={[defaultLayoutPluginInstance]}
                  onDocumentLoad={handleDocumentLoad}
                  defaultScale={1.0}
                />
              </Worker>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SheetMusicViewer;