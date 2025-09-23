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
    console.log('🎼 ScoreDisplay useEffect triggered');
    console.log('🎼 MusicXML exists:', !!musicXML);
    console.log('🎼 MusicXML length:', musicXML?.length);
    console.log('🎼 MusicXML preview:', musicXML?.substring(0, 100));
    console.log('🎼 scoreRef exists:', !!scoreRef.current);
    
    if (!scoreRef.current) return;
    
    // Always clear the score container first
    scoreRef.current.innerHTML = '';
    
    // If no musicXML, just leave it empty (this handles the reset case)
    if (!musicXML) {
      console.log('🎼 No MusicXML provided, clearing display');
      osmdRef.current = null;
      return;
    }

    const renderScore = async () => {
      try {
        console.log('Rendering MusicXML with OSMD...');
        console.log('MusicXML length:', musicXML.length);
        console.log('Full MusicXML content:', musicXML);
        
        // Force exactly 4 measures per line
        const containerWidth = scoreRef.current?.clientWidth || 800;
        const measuresPerRow = 4; // Always 4 measures per line
        
        console.log(`Container width: ${containerWidth}, Measures per row: ${measuresPerRow}`);
        
        // Dynamically resize the container to force 4 measures per row
        const baseWidthPerMeasure = 160; // Consistent width per measure
        const targetContainerWidth = measuresPerRow * baseWidthPerMeasure + 60; // Standard padding
        
        // Temporarily constrain the container width for OSMD calculation
        if (scoreRef.current) {
          scoreRef.current.style.width = `${targetContainerWidth}px`;
          scoreRef.current.style.maxWidth = `${targetContainerWidth}px`;
        }
        
        // Create OSMD instance with minimal, stable settings
        const osmd = new OpenSheetMusicDisplay(scoreRef.current!, {
          autoResize: true,
          backend: "svg",
          drawTitle: false,
          drawComposer: false,
          drawCredits: false,
          drawLyrics: false,
          drawPartNames: false
        });

        // Store reference for cleanup and resize
        osmdRef.current = osmd;

        // Load the MusicXML
        await osmd.load(musicXML);
        
        console.log(`Rendering score with container width constrained to ${targetContainerWidth}px for ${measuresPerRow} measures per row`);
        
        // Render with constrained width
        osmd.render();
        
        // After rendering, restore the container to full width for responsive display
        if (scoreRef.current) {
          scoreRef.current.style.width = '';
          scoreRef.current.style.maxWidth = '';
        }
        
        console.log(`OSMD rendering completed with forced ${measuresPerRow} measures per row layout`);

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
      <div className="flex items-center justify-end mb-2 sm:mb-4">
        <div className="flex gap-2">
          {hasRecording && onGradeRecording && (
            <Button 
              onClick={onGradeRecording}
              disabled={isGrading}
              variant="default"
              size="sm"
              className="text-xs sm:text-sm"
            >
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {isGrading ? 'Grading...' : 'Grade Performance'}
            </Button>
          )}
        </div>
      </div>
      
      {musicXML && (
        <div 
          ref={scoreRef}
          className="flex-1 min-h-[200px] sm:min-h-[300px] w-full bg-white rounded border shadow-sm p-0 sm:p-2 overflow-x-auto overflow-y-visible"
          style={{ 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        />
      )}
      
      {!musicXML && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <p className="text-sm sm:text-base">Generate an exercise to see the score</p>
        </div>
      )}
    </div>
  );
};