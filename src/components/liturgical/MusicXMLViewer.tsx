import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music, Download, Eye } from 'lucide-react';

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

  useEffect(() => {
    // In a real implementation, we would use a library like OpenSheetMusicDisplay
    // For now, we'll show the XML content with basic formatting
    if (containerRef.current && musicxml) {
      // Simple XML formatting for display
      const formattedXML = musicxml
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
      
      containerRef.current.innerHTML = `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${formattedXML}</pre>`;
    }
  }, [musicxml]);

  const downloadXML = () => {
    const blob = new Blob([musicxml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'responsorial-psalm.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
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
              onClick={downloadXML}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                ×
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg border">
            <p className="text-sm text-muted-foreground mb-2">
              MusicXML Content Preview:
            </p>
            <div 
              ref={containerRef}
              className="max-h-96 overflow-y-auto bg-background p-3 rounded border text-xs"
            />
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <Eye className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Music Notation Viewer</p>
                <p className="text-blue-700">
                  To display the musical notation, you would need to integrate a MusicXML rendering library 
                  like OpenSheetMusicDisplay or VexFlow. The XML content above shows the structured musical data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};