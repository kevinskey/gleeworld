import React, { useState } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Music, RefreshCw, ArrowLeft, Mic, Square, Play, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SightSingingPractice } from '@/components/sight-singing/SightSingingPractice';
import { RecordingButton } from '@/components/sight-singing/RecordingButton';
import { CompletedExercisesList } from '@/components/sight-singing/CompletedExercisesList';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { MemberSearchDropdown, Member } from '@/components/shared/MemberSearchDropdown';

interface OSMDViewerProps {
  musicXML: string;
  title?: string;
  solfegeEnabled?: boolean;
}

const OSMDViewer: React.FC<OSMDViewerProps> = ({ musicXML, title, solfegeEnabled = false }) => {
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
      
      // Clear container first
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      const { OpenSheetMusicDisplay } = await import('opensheetmusicdisplay');
      
      if (!isMountedRef.current) return;

      // Create OSMD with settings optimized for content-based sizing
      osmdRef.current = new OpenSheetMusicDisplay(container, {
        autoResize: true,
        backend: 'svg',
        drawTitle: false,
        drawCredits: false,
        pageBackgroundColor: '#FFFFFF',
        pageFormat: 'Endless', // Use endless format for dynamic sizing
        autoBeam: true,
        coloringMode: 0,
        defaultFontFamily: 'Arial',
        renderSingleHorizontalStaffline: false,
        spacingBetweenTextLines: 5,
        followCursor: false,
        // Optimized sizing settings
        zoom: 1.8, // Slightly smaller for better fitting
        pageTopMargin: 15,
        pageBottomMargin: 15,
        staffDistance: 120, // Compact staff spacing
        systemLeftMargin: 10,
        systemRightMargin: 10,
        compactMode: false,
        spacingFactorSoftmax: 8, // Balanced note spacing
        measureWidth: 200, // Reasonable measure width
        // Solfege syllables
        drawSolfegeSyllables: solfegeEnabled
      } as any);

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
        
        // Render the music
        osmdRef.current.render();
        
        // Auto-size container to content after rendering
        setTimeout(() => {
          if (isMountedRef.current && containerRef.current && osmdRef.current) {
            const svgElement = containerRef.current.querySelector('svg');
            if (svgElement) {
              const bbox = svgElement.getBBox();
              const padding = 40; // Extra padding
              
              // Set container size based on content
              containerRef.current.style.height = `${Math.max(300, bbox.height + padding)}px`;
              containerRef.current.style.width = `${Math.min(1200, Math.max(600, bbox.width + padding))}px`;
              
              console.log('Auto-sized container to content:', {
                width: bbox.width + padding,
                height: bbox.height + padding
              });
            }
          }
        }, 100);
        
        console.log('MusicXML rendered successfully with auto-sizing');
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
        <div 
          id="generated-osmd"
          ref={containerRef}
          className="w-full border rounded-lg bg-white p-4"
          style={{ 
            minHeight: '300px',
            maxWidth: '100%',
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start'
          }}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Rendering sheet music...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const SightReadingGeneratorPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMusicXML, setGeneratedMusicXML] = useState<string>('');
  const [exerciseGenerated, setExerciseGenerated] = useState(false);
  const [solfegeEnabled, setSolfegeEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingExercise, setIsPlayingExercise] = useState(false);
  
  // Generation parameters
  const [difficulty, setDifficulty] = useState('beginner');
  const [keySignature, setKeySignature] = useState('C major');
  const [timeSignature, setTimeSignature] = useState('4/4');
  const [measures, setMeasures] = useState([8]);
  const [noteRange, setNoteRange] = useState('C4-C5');
  // New parameters
  const [partMode, setPartMode] = useState<'single' | 'two-part'>('single');
  const [voicePart, setVoicePart] = useState<'Soprano' | 'Alto'>('Soprano');
  const [intervalProfile, setIntervalProfile] = useState<'stepwise' | 'thirds' | 'mixed'>('stepwise');
  const [tempo, setTempo] = useState(120);
  // Save/assign state
  const [saving, setSaving] = useState(false);
  const [savedExerciseId, setSavedExerciseId] = useState<string | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [dueDate, setDueDate] = useState<string>('');

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

    try {
      console.log('Generating sight-reading exercise...');
      console.log('Parameters:', {
        difficulty,
        keySignature,
        timeSignature,
        measures: measures[0],
        noteRange,
        partMode,
        voicePart,
        intervalProfile,
        tempo
      });
      
      const { data, error } = await supabase.functions.invoke('generate-musicxml', {
        body: {
          difficulty,
          keySignature,
          timeSignature,
          measures: measures[0],
          noteRange,
          partCount: partMode === 'two-part' ? 2 : 1,
          voiceParts: partMode === 'two-part' ? ['Soprano','Alto'] : [voicePart],
          intervalProfile,
          tempo
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
    setIsPlayingExercise(false);
    setIsRecording(false);
    setSolfegeEnabled(false);
    
    // Reset to default parameters
    setDifficulty('beginner');
    setKeySignature('C major');
    setTimeSignature('4/4');
    setMeasures([8]);
    setNoteRange('C4-C5');
    
    // Dispatch reset events to clear practice component state
    window.dispatchEvent(new CustomEvent('resetPractice'));
  };

  // Listen for practice auto-stop to update button state
  React.useEffect(() => {
    const handlePracticeAutoStopped = () => {
      setIsPlayingExercise(false);
    };
    
    window.addEventListener('practiceAutoStopped', handlePracticeAutoStopped);
    
    return () => {
      window.removeEventListener('practiceAutoStopped', handlePracticeAutoStopped);
    };
  }, []);

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
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
          
          {/* Reset Button - Always visible */}
          <Button
            variant="destructive"
            onClick={startNewExercise}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset & Start Over
          </Button>
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
                  <div className="flex items-center gap-2">
                    {/* Practice Button */}
                    <Button 
                      onClick={() => {
                        if (isPlayingExercise) {
                          const stopEvent = new CustomEvent('stopPractice');
                          window.dispatchEvent(stopEvent);
                          setIsPlayingExercise(false);
                        } else {
                          const practiceEvent = new CustomEvent('startPractice');
                          window.dispatchEvent(practiceEvent);
                          setIsPlayingExercise(true);
                        }
                      }}
                      className="flex items-center gap-2"
                      variant="secondary"
                    >
                      {isPlayingExercise ? (
                        <>
                          <Square className="h-4 w-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Practice
                        </>
                      )}
                    </Button>
                    
                    {/* Recording Button */}
                    <RecordingButton 
                      isRecording={isRecording}
                      onStartRecording={() => {
                        setIsRecording(true);
                        const recordingEvent = new CustomEvent('startRecording');
                        window.dispatchEvent(recordingEvent);
                      }}
                      onStopRecording={() => {
                        setIsRecording(false);
                        const recordingEvent = new CustomEvent('stopRecording');
                        window.dispatchEvent(recordingEvent);
                      }}
                    />
                    <Button variant="outline" onClick={startNewExercise}>
                      Generate New Exercise
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <OSMDViewer 
                  musicXML={generatedMusicXML} 
                  title={`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Exercise - ${keySignature}`}
                  solfegeEnabled={solfegeEnabled}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sight Singing Practice Component */}
        {exerciseGenerated && generatedMusicXML && (
          <div className="space-y-6">
            <SightSingingPractice 
              musicXML={generatedMusicXML}
              exerciseMetadata={{
                difficulty,
                keySignature,
                timeSignature,
                measures: measures[0],
                noteRange
              }}
              onRecordingChange={setIsRecording}
              onSolfegeChange={setSolfegeEnabled}
            />
            
            {/* Completed Exercises List */}
            {user && (
              <CompletedExercisesList user={user} />
            )}
          </div>
        )}

        {/* Generation Parameters - Show when no exercise is generated */}
        {!exerciseGenerated && (
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
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </UniversalLayout>
  );
};

export default SightReadingGeneratorPage;