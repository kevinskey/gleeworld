import React, { useRef, useEffect, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, Download, RefreshCw, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MusicXMLViewerProps {
  musicxml: string;
  onClose?: () => void;
  title?: string;
}

export const MusicXMLViewer: React.FC<MusicXMLViewerProps> = ({ 
  musicxml, 
  onClose, 
  title = "MusicXML Viewer" 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize OSMD when component mounts
  useEffect(() => {
    if (containerRef.current && !osmdRef.current) {
      try {
        osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
          autoResize: true,
          backend: 'svg',
          drawTitle: true,
          drawComposer: true,
          drawCredits: false,
          drawLyrics: true,
          drawPartNames: true,
          coloringMode: 0,
          pageFormat: 'A4_P',
          pageBackgroundColor: '#FFFFFF',
        });
        console.log('OSMD initialized successfully');
      } catch (error) {
        console.error('Error initializing OSMD:', error);
        setError('Failed to initialize music display');
      }
    }
  }, []);

  // Load music when XML content changes
  useEffect(() => {
    if (osmdRef.current && musicxml) {
      loadMusic();
    }
  }, [musicxml]);

  const loadMusic = async () => {
    if (!osmdRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Clear previous content
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      // Reinitialize OSMD for new content
      if (containerRef.current) {
        osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
          autoResize: true,
          backend: 'svg',
          drawTitle: true,
          drawComposer: true,
          drawCredits: false,
          drawLyrics: true,
          drawPartNames: true,
          coloringMode: 0,
          pageFormat: 'A4_P',
          pageBackgroundColor: '#FFFFFF',
        });
      }

      // Create blob URL from XML content
      const blob = new Blob([musicxml], { type: 'application/xml' });
      const blobUrl = URL.createObjectURL(blob);

      try {
        await osmdRef.current.load(blobUrl);
        await osmdRef.current.render();
        
        console.log('Music loaded and rendered successfully');
      } finally {
        URL.revokeObjectURL(blobUrl);
      }

    } catch (error) {
      console.error('Error loading music:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      toast({
        title: "Loading Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadXML = () => {
    const blob = new Blob([musicxml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const content = (
    <Card className="w-full border-0 shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMusic}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadXML}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Loading sheet music...</span>
              </div>
            </div>
          )}
          
          <div 
            ref={containerRef}
            className="bg-white rounded-md border p-4 min-h-[400px] overflow-auto"
          />
          
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // If onClose is provided, wrap in Dialog
  if (onClose) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-7xl h-[90vh] p-0">
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise return card directly
  return content;
};