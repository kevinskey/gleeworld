import React, { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
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
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);

  useEffect(() => {
    if (!scoreRef.current) return;
    
    // Always clear the score container first
    scoreRef.current.innerHTML = '';
    
    // If no musicXML, just leave it empty (this handles the reset case)
    if (!musicXML) {
      osmdRef.current = null;
      return;
    }

    const renderScore = async () => {
      try {
        console.log('Rendering MusicXML with OSMD...');
        console.log('MusicXML length:', musicXML.length);
        
        // Calculate responsive settings based on container width
        // Ensure exactly 4 measures per row on iPad (768px+) and desktop (1024px+)
        const containerWidth = scoreRef.current?.clientWidth || 800;
        const measuresPerRow = containerWidth < 640 ? 2 : // Mobile: 2 measures
                              containerWidth < 768 ? 3 : // Small tablet: 3 measures  
                              4; // iPad and desktop: exactly 4 measures (min and max)
        
        // Create OSMD instance with settings that constrain measures per system
        const osmd = new OpenSheetMusicDisplay(scoreRef.current!, {
          autoResize: true,
          backend: "svg",
          drawTitle: false,
          drawCredits: false,
          drawPartNames: true,
          drawMeasureNumbers: true,
          coloringMode: 0, // No coloring
          cursorsOptions: [{
            type: 3, // Thin cursor
            color: '#3B82F6',
            alpha: 0.7,
            follow: true
          }],
          pageFormat: "Endless",
          pageBackgroundColor: "#FFFFFF",
          renderSingleHorizontalStaffline: false
        });

        // Store reference for cleanup and resize
        osmdRef.current = osmd;

        // Load the MusicXML first
        await osmd.load(musicXML);
        
        console.log(`Setting up score with ${measuresPerRow} measures per row target, container width: ${containerWidth}px`);
        
        // Use zoom to control measures per line more aggressively
        // The key insight is that zoom affects how much music fits per line
        let zoomLevel = 1.0;
        
        if (measuresPerRow === 2) {
          zoomLevel = 1.6; // Much larger zoom for mobile to force 2 measures max
        } else if (measuresPerRow === 3) {
          zoomLevel = 1.3; // Larger zoom for tablet to force 3 measures max  
        } else {
          // For desktop (4 measures), we need to calculate zoom to prevent more than 4
          // Based on container width, determine zoom that caps at 4 measures
          const baseWidth = 200; // Approximate width needed per measure
          const idealWidth = measuresPerRow * baseWidth;
          zoomLevel = Math.max(0.8, idealWidth / containerWidth);
        }
        
        osmd.zoom = zoomLevel;
        
        // Render with the calculated zoom
        osmd.render();
        
        console.log(`OSMD rendering completed with zoom ${zoomLevel} targeting max ${measuresPerRow} measures per row`);

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

  // Handle window resize to maintain consistent formatting
  useEffect(() => {
    const handleResize = () => {
      if (osmdRef.current && scoreRef.current && musicXML) {
        try {
          const containerWidth = scoreRef.current.clientWidth;
          console.log('Resizing OSMD display, container width:', containerWidth);
          
          // Use a debounced approach to avoid excessive re-renders
          setTimeout(() => {
            if (osmdRef.current) {
              osmdRef.current.render();
            }
          }, 250);
        } catch (error) {
          console.error('Error resizing score:', error);
        }
      }
    };

    const debouncedResize = (() => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(handleResize, 250);
      };
    })();

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
    };
  }, [musicXML]);


  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-end mb-4">
        <div className="flex gap-2">
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
        className="flex-1 min-h-[300px] w-full bg-white rounded-lg border-2 shadow-xl p-2 lg:p-4 overflow-auto"
        style={{ 
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      />
      
      {!musicXML && (
        <div className="flex-1 min-h-[300px] h-full flex items-center justify-center text-muted-foreground text-center px-4">
          Generate an exercise to see the musical notation
        </div>
      )}
    </div>
  );
};