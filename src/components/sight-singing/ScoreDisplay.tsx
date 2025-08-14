import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';

interface ScoreDisplayProps {
  musicXML: string;
  onGradeRecording?: () => void;
  hasRecording?: boolean;
  isGrading?: boolean;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ 
  musicXML,
  onGradeRecording,
  hasRecording = false,
  isGrading = false
}) => {
  const scoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scoreRef.current) return;
    
    // Always clear the score container first
    scoreRef.current.innerHTML = '';
    
    // If no musicXML, just leave it empty (this handles the reset case)
    if (!musicXML) {
      return;
    }

    const renderScore = async () => {
      try {
        console.log('Rendering MusicXML with OSMD...');
        console.log('MusicXML length:', musicXML.length);
        
        // Create OSMD instance
        const osmd = new OpenSheetMusicDisplay(scoreRef.current!, {
          autoResize: true,
          drawTitle: false,
          backend: "svg",
          drawCredits: false,
          drawPartNames: true,
          drawMeasureNumbers: true,
          coloringMode: 0, // No coloring
          cursorsOptions: [{
            type: 3, // Thin cursor
            color: '#3B82F6',
            alpha: 0.7,
            follow: true
          }]
        });

        // Load and render the MusicXML
        await osmd.load(musicXML);
        osmd.render();
        
        console.log('OSMD rendering completed successfully');

      } catch (error) {
        console.error("Error rendering score with OSMD:", error);
        // Fallback display
        if (scoreRef.current) {
          scoreRef.current.innerHTML = `
            <div class="p-4 text-center text-muted-foreground">
              <p>Score rendering error</p>
              <p class="text-sm">MusicXML generated successfully - use download button</p>
            </div>
          `;
        }
        
        toast({
          title: "Score Display Error", 
          description: "Failed to render musical notation",
          variant: "destructive"
        });
      }
    };

    renderScore();
  }, [musicXML]);

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
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end mb-4">
        <div className="flex gap-2">
          {musicXML && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadMusicXML}
            >
              <Download className="h-4 w-4 mr-2" />
              Download MusicXML
            </Button>
          )}
          
          {hasRecording && onGradeRecording && (
            <Button 
              onClick={onGradeRecording}
              disabled={isGrading}
              variant="default"
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isGrading ? 'Grading...' : 'Grade Performance'}
            </Button>
          )}
        </div>
      </div>
      
      <div 
        ref={scoreRef}
        className="flex-1 min-h-[400px] bg-background rounded-lg border p-4 overflow-auto"
      />
      
      {!musicXML && (
        <div className="flex-1 min-h-[400px] flex items-center justify-center text-muted-foreground">
          Generate an exercise to see the musical notation
        </div>
      )}
    </div>
  );
};