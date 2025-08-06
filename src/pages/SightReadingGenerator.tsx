import React, { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Music, RefreshCw, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SightSingingPractice } from '@/components/sight-singing/SightSingingPractice';

interface OSMDViewerProps {
  musicXML: string;
  title?: string;
}

const OSMDViewer: React.FC<OSMDViewerProps> = ({ musicXML, title }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const osmdRef = React.useRef<any>(null);
  const isMountedRef = React.useRef(true);
  const cleanupTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cleanup function to properly dispose of OSMD
  const cleanup = React.useCallback(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
      cleanupTimeoutRef.current = null;
    }

    if (osmdRef.current) {
      try {
        // Try to dispose OSMD instance properly
        if (typeof osmdRef.current.clear === 'function') {
          osmdRef.current.clear();
        }
        if (typeof osmdRef.current.dispose === 'function') {
          osmdRef.current.dispose();
        }
      } catch (cleanupError) {
        console.warn('Error during OSMD cleanup:', cleanupError);
      }
      osmdRef.current = null;
    }

    // Clear container safely without triggering React DOM errors
    if (containerRef.current) {
      try {
        // Use React-safe method to clear content
        const container = containerRef.current;
        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }
      } catch (clearError) {
        console.warn('Error clearing container:', clearError);
      }
    }
  }, []);

  // Mount/unmount tracking
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Render when musicXML changes
  React.useEffect(() => {
    if (musicXML && containerRef.current && isMountedRef.current) {
      // Cleanup previous instance before rendering new one
      cleanup();
      // Small delay to ensure cleanup is complete
      cleanupTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          renderMusicXML();
        }
      }, 100);
    }
    
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
        cleanupTimeoutRef.current = null;
      }
    };
  }, [musicXML, cleanup]);

  const renderMusicXML = async () => {
    if (!isMountedRef.current || !containerRef.current || !musicXML) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const container = containerRef.current;
      
      // Ensure container has proper dimensions before OSMD initialization
      if (container.offsetWidth === 0 || container.offsetHeight === 0) {
        console.warn('Container has zero dimensions, forcing layout');
        container.style.width = '800px';
        container.style.height = '400px';
        // Force a reflow
        container.offsetHeight;
      }

      const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
      
      if (!isMountedRef.current) return;

      // Create OSMD with more conservative settings to prevent width errors
      osmdRef.current = new OpenSheetMusicDisplay(container, {
        autoResize: false, // Disable auto-resize to prevent conflicts
        backend: 'svg',
        drawTitle: false, // Disable title to reduce complexity
        drawCredits: false,
        pageBackgroundColor: '#FFFFFF',
        pageFormat: 'A4_P', // Use standard page format instead of Endless
        autoBeam: true,
        coloringMode: 0,
        defaultFontFamily: 'Arial',
        renderSingleHorizontalStaffline: false,
        spacingBetweenTextLines: 5,
        // Simplified options to prevent width calculation issues
        followCursor: false
      } as any); // Type assertion to handle OSMD version differences

      if (!isMountedRef.current) return;

      // Load and render with proper error handling
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(musicXML, 'application/xml');
        
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
          throw new Error(`XML parsing failed: ${parseError.textContent}`);
        }
        
        await osmdRef.current.load(xmlDoc);
        
        if (!isMountedRef.current) return;
        
        // Render with additional safety checks
        osmdRef.current.render();
        
        console.log('MusicXML rendered successfully');
      } catch (renderError) {
        console.error('OSMD render error:', renderError);
        throw new Error(`Failed to render music: ${renderError.message}`);
      }
      
    } catch (err) {
      console.error('Error in renderMusicXML:', err);
      if (isMountedRef.current) {
        setError('Failed to render sheet music. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => {
                setError(null);
                if (musicXML && isMountedRef.current) {
                  renderMusicXML();
                }
              }}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          {title || 'Generated Exercise'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Rendering sheet music...</span>
          </div>
        ) : (
          <div 
            ref={containerRef}
            className="w-full border rounded-lg bg-white p-4"
            style={{ 
              minHeight: '400px',
              minWidth: '800px',
              width: '100%',
              height: '400px',
              overflow: 'hidden', // Prevent scroll issues during render
              display: 'block'
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

const SightReadingGeneratorPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMusicXML, setGeneratedMusicXML] = useState<string>('');
  const [exerciseGenerated, setExerciseGenerated] = useState(false);
  const [parametersCollapsed, setParametersCollapsed] = useState(false);
  
  // Generation parameters
  const [difficulty, setDifficulty] = useState('beginner');
  const [keySignature, setKeySignature] = useState('C major');
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [measures, setMeasures] = useState([8]);
  const [noteRange, setNoteRange] = useState('C4-C5');

  const validateMusicXML = (xml: string): { valid: boolean; error?: string } => {
    if (!xml || typeof xml !== 'string') {
      return { valid: false, error: 'MusicXML is empty or not a string' };
    }
    
    const trimmed = xml.trim();
    if (!trimmed.startsWith('<?xml')) {
      return { valid: false, error: 'Missing XML declaration' };
    }
    
    if (!xml.includes('<score-partwise')) {
      return { valid: false, error: 'Missing score-partwise element' };
    }
    
    if (!xml.includes('<part')) {
      return { valid: false, error: 'Missing part element' };
    }
    
    if (!xml.includes('<measure')) {
      return { valid: false, error: 'Missing measure element' };
    }
    
    if (!xml.includes('</score-partwise>')) {
      return { valid: false, error: 'Incomplete MusicXML - missing closing tags. This may be due to generation limits. Try with fewer measures or a simpler difficulty level.' };
    }
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, 'application/xml');
      
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        return { valid: false, error: `XML parsing error: ${parseError.textContent}` };
      }
      
      const scorePartwise = xmlDoc.querySelector('score-partwise');
      if (!scorePartwise) {
        return { valid: false, error: 'Invalid MusicXML structure: missing score-partwise' };
      }
      
      const measures = xmlDoc.querySelectorAll('measure');
      if (measures.length === 0) {
        return { valid: false, error: 'No measures found in MusicXML' };
      }
      
    } catch (error) {
      return { valid: false, error: `XML validation failed: ${error.message}` };
    }
    
    return { valid: true };
  };

  const generateExercise = async () => {
    setIsGenerating(true);
    setGeneratedMusicXML('');
    setExerciseGenerated(false);
    setParametersCollapsed(true); // Collapse parameters during generation

    try {
      console.log('Generating sight-reading exercise...');
      console.log('Parameters:', {
        difficulty,
        keySignature,
        timeSignature,
        measures: measures[0],
        noteRange
      });
      
      const { data, error } = await supabase.functions.invoke('generate-musicxml', {
        body: {
          difficulty,
          keySignature,
          timeSignature,
          measures: measures[0],
          noteRange
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from function');
      }

      const { musicXML } = data;
      
      if (!musicXML) {
        throw new Error('No MusicXML content in response');
      }
      
      const validation = validateMusicXML(musicXML);
      if (!validation.valid) {
        console.error('Invalid MusicXML generated:', validation.error);
        console.error('MusicXML preview:', musicXML?.substring(0, 500));
        throw new Error(`Generated MusicXML is invalid: ${validation.error}. Please try generating again with different parameters.`);
      }

      console.log('Valid MusicXML generated, length:', musicXML.length);
      setGeneratedMusicXML(musicXML);
      setExerciseGenerated(true);
      
      toast({
        title: "Exercise Generated",
        description: `Created ${measures[0]}-measure sight-reading exercise in ${keySignature}`
      });

    } catch (error) {
      console.error('Error generating exercise:', error);
      
      let errorMessage = "Failed to generate sight-reading exercise";
      
      if (error.message?.includes('Failed to fetch')) {
        errorMessage = "Network error: Unable to connect to the generation service. Please check your internet connection and try again.";
      } else if (error.message?.includes('500')) {
        errorMessage = "Server error: The music generation service is currently unavailable. Please try again in a moment.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const startNewExercise = () => {
    setGeneratedMusicXML('');
    setExerciseGenerated(false);
    setParametersCollapsed(false); // Show parameters again
  };

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {exerciseGenerated ? 'Sight Reading Exercise' : 'Sight Reading Generator'}
            </h1>
            <p className="text-muted-foreground">
              {exerciseGenerated ? 'Practice your sight singing skills' : 'Generate AI-powered sight-reading exercises with professional notation'}
            </p>
          </div>
        </div>

        {/* Generated Exercise - Shows at top when available */}
        {exerciseGenerated && generatedMusicXML && (
          <div className="mb-8">
            <Card className="w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Music className="h-5 w-5" />
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Exercise
                    </CardTitle>
                    <CardDescription>
                      {measures[0]} measures • {keySignature} • {timeSignature} • {noteRange}
                    </CardDescription>
                  </div>
                  <Button variant="outline" onClick={startNewExercise}>
                    Generate New Exercise
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <OSMDViewer 
                  musicXML={generatedMusicXML} 
                  title={`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Exercise - ${keySignature}`}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sight Singing Practice Component */}
        {exerciseGenerated && generatedMusicXML && (
          <SightSingingPractice 
            musicXML={generatedMusicXML}
            exerciseMetadata={{
              difficulty,
              keySignature,
              timeSignature,
              measures: measures[0],
              noteRange
            }}
          />
        )}

        {/* Controls - Collapse when exercise is generated */}
        <div className={`transition-all duration-500 ${exerciseGenerated ? 'max-h-20 overflow-hidden' : 'max-h-full'}`}>
          {exerciseGenerated && (
            <div className="mb-4">
              <Button 
                variant="outline" 
                onClick={startNewExercise}
                className="w-full"
              >
                <Music className="h-4 w-4 mr-2" />
                Generate New Exercise
              </Button>
            </div>
          )}
          
          {(!exerciseGenerated || isGenerating) && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Controls */}
              <div className="xl:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Exercise Parameters</CardTitle>
                    <CardDescription>Customize your sight-reading exercise</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty Level</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="key">Key Signature</Label>
                      <Select value={keySignature} onValueChange={setKeySignature}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="C major">C Major</SelectItem>
                          <SelectItem value="G major">G Major</SelectItem>
                          <SelectItem value="D major">D Major</SelectItem>
                          <SelectItem value="A major">A Major</SelectItem>
                          <SelectItem value="F major">F Major</SelectItem>
                          <SelectItem value="Bb major">B♭ Major</SelectItem>
                          <SelectItem value="Eb major">E♭ Major</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="time">Time Signature</Label>
                      <Select value={timeSignature} onValueChange={setTimeSignature}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4/4">4/4</SelectItem>
                          <SelectItem value="3/4">3/4</SelectItem>
                          <SelectItem value="2/4">2/4</SelectItem>
                          <SelectItem value="6/8">6/8</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="measures">Number of Measures: {measures[0]}</Label>
                      <Slider
                        value={measures}
                        onValueChange={setMeasures}
                        min={4}
                        max={16}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="range">Note Range</Label>
                      <Select value={noteRange} onValueChange={setNoteRange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="C4-C5">C4-C5 (Beginner)</SelectItem>
                          <SelectItem value="G3-G5">G3-G5 (Intermediate)</SelectItem>
                          <SelectItem value="E3-E5">E3-E5 (Advanced)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={generateExercise} 
                      disabled={isGenerating}
                      className="w-full bg-primary text-primary-foreground"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating Exercise...
                        </>
                      ) : (
                        <>
                          <Music className="h-4 w-4 mr-2" />
                          Generate Exercise
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Preview Area */}
              <div className="xl:col-span-2">
                {isGenerating ? (
                  <Card>
                    <CardContent className="p-12">
                      <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <RefreshCw className="h-12 w-12 animate-spin text-primary" />
                        <h3 className="text-xl font-semibold">Generating Your Exercise</h3>
                        <p className="text-muted-foreground">
                          Creating a {difficulty} level sight-reading exercise in {keySignature}...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-12">
                      <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <Music className="h-16 w-16 text-muted-foreground" />
                        <h3 className="text-xl font-semibold text-muted-foreground">Ready to Generate</h3>
                        <p className="text-muted-foreground">
                          Configure your parameters and click "Generate Exercise" to create a personalized sight-reading exercise.
                        </p>
            </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </UniversalLayout>
  );
};

export default SightReadingGeneratorPage;
