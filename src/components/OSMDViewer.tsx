import React, { useRef, useEffect, useState } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OSMDViewerProps {
  xmlUrl?: string;
  xmlContent?: string;
  title?: string;
  className?: string;
}

export const OSMDViewer: React.FC<OSMDViewerProps> = ({ 
  xmlUrl, 
  xmlContent, 
  title = "Sheet Music", 
  className = "" 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize OSMD
  useEffect(() => {
    if (containerRef.current && !osmdRef.current) {
      try {
        osmdRef.current = new OpenSheetMusicDisplay(containerRef.current, {
          autoResize: true,
          backend: 'svg',
          drawTitle: true,
          drawComposer: true,
          drawCredits: false,
          drawLyrics: false,
          drawPartNames: true,
          coloringMode: 0,
          followCursor: false,
          cursorsOptions: [],
          pageFormat: 'A4_P',
          pageBackgroundColor: '#FFFFFF',
          renderSingleHorizontalStaffline: false,
          defaultFontFamily: 'Times New Roman',
          // Enable better spacing and formatting
          spacingFactorSoftmax: 5,
          spacingBetweenTextLines: 0.5,
        });
        console.log('OSMD initialized successfully');
      } catch (error) {
        console.error('Error initializing OSMD:', error);
        setError('Failed to initialize music display');
      }
    }

    // Handle window resize
    const handleResize = () => {
      if (osmdRef.current) {
        try {
          osmdRef.current.render();
        } catch (error) {
          console.error('Error during resize render:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load music when URL or content changes
  useEffect(() => {
    if (osmdRef.current && (xmlUrl || xmlContent)) {
      loadMusic();
    }
  }, [xmlUrl, xmlContent]);

  const loadMusic = async () => {
    if (!osmdRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Clear previous content
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      if (xmlContent) {
        // Load from string content
        await osmdRef.current.load(xmlContent);
      } else if (xmlUrl) {
        // Load from URL
        await osmdRef.current.load(xmlUrl);
      }

      // Render the music
      await osmdRef.current.render();
      
      console.log('Music loaded and rendered successfully');
      
      // Verify SVG was created
      const svgs = containerRef.current?.querySelectorAll('svg');
      if (!svgs || svgs.length === 0) {
        throw new Error('No musical notation was rendered');
      }

      toast({
        title: "Success",
        description: "Sheet music loaded successfully"
      });

    } catch (error) {
      console.error('Error loading music:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="flex items-center justify-center h-64 text-muted-foreground">
            <div class="text-center">
              <div class="flex justify-center mb-2">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <p class="font-medium">Failed to load sheet music</p>
              <p class="text-sm mt-1">${errorMessage}</p>
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

  const handleRefresh = () => {
    if (xmlUrl || xmlContent) {
      loadMusic();
    }
  };

  const handleDownloadPDF = async () => {
    if (!containerRef.current) return;

    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');
      
      const canvas = await html2canvas.default(containerRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        scrollX: 0,
        scrollY: 0,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
      
      toast({
        title: "PDF Downloaded",
        description: "Sheet music saved successfully"
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Error",
        description: "Failed to generate PDF",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span>🎼</span>
            {title}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || (!xmlUrl && !xmlContent)}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isLoading || error !== null}
            >
              <Download className="h-4 w-4" />
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
            style={{ 
              minHeight: '400px',
              maxWidth: '100%',
              maxHeight: '800px'
            }}
          />
          
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Error: {error}</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};