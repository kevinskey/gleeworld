import React, { useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScoreDisplayProps {
  musicXML: string;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ musicXML }) => {
  const scoreRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!scoreRef.current || !musicXML) return;

    const loadOSMD = async () => {
      try {
        // Dynamic import of OpenSheetMusicDisplay
        const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
        
        // Clear previous score
        scoreRef.current!.innerHTML = '';
        
        // Create new OSMD instance
        const osmd = new OpenSheetMusicDisplay(scoreRef.current!, {
          autoResize: true,
          drawTitle: true,
          drawCredits: false,
          drawPartNames: false,
          drawMeasureNumbers: true,
          coloringMode: 0, // No coloring
          cursorsOptions: [{
            type: 3, // Thin cursor
            color: '#3B82F6',
            alpha: 0.7,
            follow: true
          }]
        });

        // Load the MusicXML
        await osmd.load(musicXML);
        osmd.render();

        // Store OSMD instance for potential cursor usage
        (scoreRef.current as any).__osmdInstance = osmd;

      } catch (error) {
        console.error('Error loading OSMD:', error);
        toast({
          title: "Score Display Error",
          description: "Failed to render musical score",
          variant: "destructive"
        });
      }
    };

    loadOSMD();
  }, [musicXML, toast]);

  const handleDownloadMusicXML = () => {
    try {
      const blob = new Blob([musicXML], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sight-singing-exercise.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Started",
        description: "MusicXML file is downloading",
      });
    } catch (error) {
      console.error('Error downloading MusicXML:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download MusicXML file",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Musical Score</h3>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDownloadMusicXML}
          >
            <Download className="h-4 w-4 mr-2" />
            Download MusicXML
          </Button>
        </div>
        
        <div 
          ref={scoreRef}
          className="min-h-[300px] bg-background rounded-lg border p-4 overflow-auto"
        />
        
        {!musicXML && (
          <div className="min-h-[300px] flex items-center justify-center text-muted-foreground">
            Generate an exercise to see the musical score
          </div>
        )}
      </CardContent>
    </Card>
  );
};