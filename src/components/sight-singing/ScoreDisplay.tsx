import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Maximize2, X } from 'lucide-react';
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
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Function to enforce maximum measures per system by modifying the rendered SVG
  const enforceMaxMeasuresPerSystem = (container: HTMLElement, maxMeasures: number) => {
    try {
      const svgElements = container.querySelectorAll('svg');
      
      svgElements.forEach(svg => {
        // Find all measure groups or measure elements
        const measures = svg.querySelectorAll('g[class*="measure"], g[id*="measure"], g[class*="vf-measure"]');
        console.log(`Found ${measures.length} measures in SVG`);
        
        if (measures.length <= maxMeasures) return; // No need to break if already within limit
        
        let currentSystemIndex = 0;
        let measuresInCurrentSystem = 0;
        const systemHeight = 100; // Adjust spacing between systems
        
        measures.forEach((measure, index) => {
          measuresInCurrentSystem++;
          
          if (measuresInCurrentSystem > maxMeasures) {
            // Move to next system
            currentSystemIndex++;
            measuresInCurrentSystem = 1;
            
            // Apply transform to move measure down
            const currentTransform = measure.getAttribute('transform') || '';
            const yOffset = currentSystemIndex * systemHeight;
            
            // Update or add transform
            if (currentTransform.includes('translate')) {
              const newTransform = currentTransform.replace(
                /translate\s*\(\s*([^,\)]+)\s*,\s*([^,\)]+)\s*\)/,
                `translate($1, ${yOffset})`
              );
              measure.setAttribute('transform', newTransform);
            } else {
              measure.setAttribute('transform', `translate(0, ${yOffset}) ${currentTransform}`);
            }
          }
        });
        
        // Adjust SVG height to accommodate all systems
        if (currentSystemIndex > 0) {
          const newHeight = (currentSystemIndex + 1) * systemHeight + 50; // Add some bottom margin
          svg.setAttribute('height', newHeight.toString());
        }
      });
    } catch (error) {
      console.error('Error enforcing max measures per system:', error);
    }
  };

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
        
        // Force exactly 4 measures per line maximum with responsive sizing
        const containerWidth = scoreRef.current?.clientWidth || 800;
        const isMobile = containerWidth < 640; // sm breakpoint
        
        let measuresPerRow = 4; // Default maximum for all devices
        if (isMobile) {
          measuresPerRow = Math.min(2, 4); // 2 measures per row on mobile, never more than 4
        } else {
          measuresPerRow = 4; // Always 4 measures per row on tablet and desktop
        }
        
        console.log(`Container width: ${containerWidth}, Measures per row: ${measuresPerRow}, Device: ${isMobile ? 'mobile' : 'desktop/tablet'}`);
        
        // Dynamically resize the container to force proper measures per row
        const baseWidthPerMeasure = isMobile ? 140 : 160;
        const targetContainerWidth = measuresPerRow * baseWidthPerMeasure + (isMobile ? 40 : 60);
        
        // Temporarily constrain the container width for OSMD calculation
        if (scoreRef.current) {
          scoreRef.current.style.width = `${Math.min(targetContainerWidth, containerWidth)}px`;
          scoreRef.current.style.maxWidth = `${Math.min(targetContainerWidth, containerWidth)}px`;
        }
        
        // Create OSMD instance with responsive settings
        const osmd = new OpenSheetMusicDisplay(scoreRef.current!, {
          autoResize: true,
          backend: "svg",
          drawTitle: false,
          drawComposer: false,
          drawCredits: false,
          drawLyrics: false,
          drawPartNames: false,
          spacingFactorSoftmax: 5,
          spacingBetweenTextLines: 0.5,
          newSystemFromXML: false,
          newPageFromXML: false,
          autoBeam: true,
        });

        // Store reference for cleanup and resize
        osmdRef.current = osmd;

        // Load the MusicXML
        await osmd.load(musicXML);
        
        console.log(`Rendering score with container width constrained to ${Math.min(targetContainerWidth, containerWidth)}px for ${measuresPerRow} measures per row`);
        
        // Render with constrained width
        osmd.render();
        
        // Force system breaks after every 4 measures
        enforceMaxMeasuresPerSystem(scoreRef.current!, 4);
        
        // After rendering, restore the container to full width for responsive display
        if (scoreRef.current) {
          scoreRef.current.style.width = '';
          scoreRef.current.style.maxWidth = '';
        }
        
        console.log(`OSMD rendering completed with enforced max 4 measures per system`);

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
    <>
      {/* Full Screen Overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="h-full flex flex-col">
            {/* Full Screen Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border">
              <h2 className="text-base sm:text-lg font-semibold">Music Score - Full Screen</h2>
              <Button
                onClick={() => setIsFullScreen(false)}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Back
              </Button>
            </div>
            
            {/* Full Screen Score */}
            <div className="flex-1 p-2 sm:p-4 overflow-auto">
              <div 
                className="w-full bg-white rounded border shadow-sm p-2 sm:p-4 min-h-full"
                style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <div 
                  className="w-full overflow-auto"
                  dangerouslySetInnerHTML={{ 
                    __html: scoreRef.current?.innerHTML || '' 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Normal View */}
      <div className="h-full flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-4 gap-2">
          <div className="flex gap-2">
            {musicXML && (
              <Button
                onClick={() => setIsFullScreen(true)}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Full Screen
              </Button>
            )}
          </div>
          
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
            className="flex-1 min-h-[180px] sm:min-h-[250px] lg:min-h-[300px] w-full bg-white rounded border shadow-sm p-1 sm:p-2 overflow-auto"
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
    </>
  );
};