import React, { useRef, useEffect, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { Button } from '@/components/ui/button';
import { RefreshCw, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface MusicXMLViewerProps {
  musicxml: string;
  onClose?: () => void;
  title?: string;
}

export const MusicXMLViewer: React.FC<MusicXMLViewerProps> = ({ 
  musicxml, 
  onClose, 
  title = "Sheet Music" 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load music when XML content changes
  useEffect(() => {
    loadMusic();
  }, [musicxml]);

  const loadMusic = async () => {
    if (!containerRef.current || !musicxml) {
      console.error('MusicXMLViewer: No container or musicxml content');
      setError('No music content provided');
      setIsLoading(false);
      return;
    }

    console.log('MusicXMLViewer: Starting to load music, XML length:', musicxml.length);
    setIsLoading(true);
    setError(null);

    try {
      // Clear previous content
      containerRef.current.innerHTML = '';

      // Initialize OSMD
      console.log('MusicXMLViewer: Initializing OSMD...');
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
        renderSingleHorizontalStaffline: false,
      });
      console.log('MusicXMLViewer: OSMD initialized');

      // Create blob URL from XML content
      console.log('MusicXMLViewer: Creating blob URL...');
      const blob = new Blob([musicxml], { type: 'application/xml' });
      const blobUrl = URL.createObjectURL(blob);

      try {
        console.log('MusicXMLViewer: Loading XML into OSMD...');
        await osmdRef.current.load(blobUrl);
        console.log('MusicXMLViewer: XML loaded, now rendering...');
        
        await osmdRef.current.render();
        console.log('MusicXMLViewer: Rendering complete');
        
        // Verify SVG was created
        const svgs = containerRef.current.querySelectorAll('svg');
        console.log('MusicXMLViewer: SVG elements found:', svgs.length);
        
        if (svgs.length === 0) {
          throw new Error('No musical notation was rendered');
        }

        toast({
          title: "Success",
          description: "Sheet music loaded successfully"
        });

      } finally {
        URL.revokeObjectURL(blobUrl);
      }

    } catch (error) {
      console.error('MusicXMLViewer: Error loading music:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="flex items-center justify-center h-96 text-muted-foreground">
            <div class="text-center">
              <p class="font-medium text-destructive mb-2">Failed to load sheet music</p>
              <p class="text-sm">${errorMessage}</p>
              <p class="text-xs mt-2">The MusicXML file may be invalid or corrupted.</p>
            </div>
          </div>
        `;
      }

      toast({
        title: "Loading Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If onClose is provided, wrap in Dialog
  if (onClose) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-7xl h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="sr-only">
              View and interact with the musical score
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-6">
            {isLoading && (
              <div className="flex items-center justify-center h-96">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>Loading sheet music...</span>
                </div>
              </div>
            )}
            
            <div 
              ref={containerRef}
              className="bg-white rounded-md min-h-[400px]"
              style={{ 
                minHeight: '400px',
                width: '100%',
                display: isLoading ? 'none' : 'block'
              }}
            />
            
            {error && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">Error: {error}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise return content directly (without dialog wrapper)
  return (
    <div className="w-full">
      {isLoading && (
        <div className="flex items-center justify-center h-96">
          <div className="flex items-center gap-2 text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading sheet music...</span>
          </div>
        </div>
      )}
      
      <div 
        ref={containerRef}
        className="bg-white rounded-md border p-4 min-h-[400px]"
        style={{ 
          minHeight: '400px',
          width: '100%',
          display: isLoading ? 'none' : 'block'
        }}
      />
      
      {error && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive font-medium">Error: {error}</p>
        </div>
      )}
    </div>
  );
};