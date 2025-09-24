import React, { useEffect, useRef, useState, useCallback } from 'react';
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

  // Preprocess MusicXML: insert <print new-system="yes"/> every 2 measures
  const insertSystemBreaks = useCallback((xml: string, measuresPerSystem: number = 2) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');
      const parseError = doc.getElementsByTagName('parsererror')[0];
      if (parseError) {
        console.warn('XML parse error, skipping system break insertion');
        return xml;
      }
      const ns = doc.documentElement.namespaceURI || undefined;

      // Remove existing <print> elements to avoid conflicts
      const existingPrints = Array.from(doc.getElementsByTagName('print'));
      existingPrints.forEach((p) => p.parentNode?.removeChild(p));

      const parts = Array.from(doc.getElementsByTagName('part'));
      parts.forEach((part) => {
        const measures = Array.from(part.getElementsByTagName('measure'));
        measures.forEach((measure, idx) => {
          if (idx > 0 && idx % measuresPerSystem === 0) {
            const printEl = ns
              ? doc.createElementNS(ns, 'print')
              : doc.createElement('print');
            printEl.setAttribute('new-system', 'yes');
            // Insert at top of measure
            const firstChild = measure.firstChild;
            if (firstChild) {
              measure.insertBefore(printEl, firstChild);
            } else {
              measure.appendChild(printEl);
            }
          }
        });
      });

      const serialized = new XMLSerializer().serializeToString(doc);
      return serialized;
    } catch (e) {
      console.warn('Failed to insert system breaks, returning original XML', e);
      return xml;
    }
  }, []);

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
        
        // Force exactly 2 measures per line maximum with responsive sizing
        const containerWidth = scoreRef.current?.clientWidth || 800;
        const isMobile = containerWidth < 640; // sm breakpoint
        
        let measuresPerRow = 2; // Default maximum for all devices
        if (isMobile) {
          measuresPerRow = Math.min(2, 2); // 2 measures per row on mobile
        } else {
          measuresPerRow = 2; // Always 2 measures per row on tablet and desktop
        }
        
        console.log(`Container width: ${containerWidth}, Measures per row: ${measuresPerRow}, Device: ${isMobile ? 'mobile' : 'desktop/tablet'}`);
        
        // Layout at a wider fixed width so 2 measures fit, then scale SVG to container width
        const desiredLayoutWidth = 1200;
        if (scoreRef.current) {
          scoreRef.current.style.width = `${desiredLayoutWidth}px`;
          scoreRef.current.style.maxWidth = `${desiredLayoutWidth}px`;
        }
        
        // Create OSMD instance with responsive settings optimized for 2 measures per line
        const osmd = new OpenSheetMusicDisplay(scoreRef.current!, {
          autoResize: true,
          backend: "svg",
          drawTitle: false,
          drawComposer: false,
          drawCredits: false,
          drawLyrics: false,
          drawPartNames: false,
          spacingFactorSoftmax: isMobile ? 3 : 5,  // Tighter spacing on mobile
          spacingBetweenTextLines: 0.3,
          newSystemFromXML: true,  // Respect system breaks
          newPageFromXML: false,
          autoBeam: true,
        });

        // Store reference for cleanup and resize
        osmdRef.current = osmd;

        // Use default zoom; we'll make SVG responsive after render
        osmd.zoom = 1;

        // Load the MusicXML with enforced system breaks
        const xmlWithBreaks = insertSystemBreaks(musicXML, 2);
        await osmd.load(xmlWithBreaks);
        
        console.log(`Rendering score for ${isMobile ? 'mobile' : 'desktop'} with ${measuresPerRow} measures per row`);
        
        // Render with optimized settings
        osmd.render();
        
        // Make SVG responsive to container width
        const svgs = scoreRef.current!.querySelectorAll('svg');
        svgs.forEach((svgEl) => {
          svgEl.removeAttribute('width');
          svgEl.removeAttribute('height');
          svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          (svgEl as SVGElement).style.width = '100%';
          (svgEl as SVGElement).style.maxWidth = '100%';
          (svgEl as SVGElement).style.height = 'auto';
          (svgEl as SVGElement).style.display = 'block';
        });
        
        // Force system breaks after every 2 measures
        enforceMaxMeasuresPerSystem(scoreRef.current!, 2);
        
        // Restore container width after rendering so SVG can scale to available space
        if (scoreRef.current) {
          scoreRef.current.style.width = '';
          scoreRef.current.style.maxWidth = '';
        }
        
        console.log(`OSMD rendering completed with enforced max 2 measures per system`);

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
            const desiredLayoutWidth = 1200;
            if (osmdRef.current && scoreRef.current) {
              // Temporarily widen for consistent 2-measure layout
              scoreRef.current.style.width = `${desiredLayoutWidth}px`;
              scoreRef.current.style.maxWidth = `${desiredLayoutWidth}px`;
              osmdRef.current.render();
              // Make SVG responsive to container width
              const svgs = scoreRef.current.querySelectorAll('svg');
              svgs.forEach((svgEl) => {
                svgEl.removeAttribute('width');
                svgEl.removeAttribute('height');
                svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                (svgEl as SVGElement).style.width = '100%';
                (svgEl as SVGElement).style.maxWidth = '100%';
                (svgEl as SVGElement).style.height = 'auto';
                (svgEl as SVGElement).style.display = 'block';
              });
              // Restore container width
              scoreRef.current.style.width = '';
              scoreRef.current.style.maxWidth = '';
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
            <div className="flex-1 px-0 sm:p-4 py-2 sm:py-4 overflow-auto">
              <div 
                className="w-full bg-white rounded border shadow-sm py-2 sm:p-4 px-0 sm:px-4 min-h-full"
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
            className="flex-1 min-h-[180px] sm:min-h-[250px] lg:min-h-[300px] w-full bg-white rounded border shadow-sm py-1 sm:p-2 px-0 sm:px-2 overflow-auto"
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