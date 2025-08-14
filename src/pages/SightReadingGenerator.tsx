import React, { useState, useRef, useEffect } from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Music, RefreshCw, ArrowLeft, Mic, Square, Play, RotateCcw, Pause, StopCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SightSingingPractice } from '@/components/sight-singing/SightSingingPractice';
import { RecordingButton } from '@/components/sight-singing/RecordingButton';
import { CompletedExercisesList } from '@/components/sight-singing/CompletedExercisesList';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { MemberSearchDropdown, Member } from '@/components/shared/MemberSearchDropdown';
import { MetronomePlayer } from '@/components/sight-singing/MetronomePlayer';
import { NotePlayer } from '@/components/sight-singing/NotePlayer';
import { parseMusicXMLForPlayback, ParsedNote } from '@/utils/musicxml-parser';
import { ContractErrorBoundary } from '@/components/contract-signing/ContractErrorBoundary';

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

      // Create OSMD with settings optimized for compact display
      osmdRef.current = new OpenSheetMusicDisplay(container, {
        autoResize: true,
        backend: 'svg',
        drawTitle: false,
        drawCredits: false,
        pageBackgroundColor: '#FFFFFF',
        pageFormat: 'Endless',
        autoBeam: true,
        coloringMode: 0,
        defaultFontFamily: 'Arial',
        renderSingleHorizontalStaffline: false,
        spacingBetweenTextLines: 3,
        followCursor: false,
        // Compact sizing settings
        zoom: 1.2,
        pageTopMargin: 5,
        pageBottomMargin: 5,
        staffDistance: 80,
        systemLeftMargin: 5,
        systemRightMargin: 5,
        compactMode: true,
        spacingFactorSoftmax: 6,
        measureWidth: 180,
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
      <div className="w-full h-full flex items-center justify-center border rounded-lg bg-muted/10">
        <div className="text-center text-destructive p-4">
          <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">{error}</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => {
              setError(null);
              if (musicXML && isMountedRef.current) {
                renderMusicXML();
              }
            }}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div 
        id="generated-osmd"
        ref={containerRef}
        className="w-full h-full border rounded-lg bg-white flex items-center justify-center overflow-auto"
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm">Rendering...</span>
        </div>
      )}
    </div>
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
  
  // Metronome state
  const [isPracticing, setIsPracticing] = useState(false);
  const [isPlayingExample, setIsPlayingExample] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [currentMeasure, setCurrentMeasure] = useState(0);
  const [countInBeats, setCountInBeats] = useState(0);
  const [isCountingIn, setIsCountingIn] = useState(false);
  
  // Audio context and player refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const metronomeRef = useRef<MetronomePlayer | null>(null);
  const notePlayerRef = useRef<NotePlayer | null>(null);
  const [parsedNotes, setParsedNotes] = useState<ParsedNote[]>([]);
  
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
  const [tempo, setTempo] = useState(96);
  const [rhythmicComplexity, setRhythmicComplexity] = useState<'simple' | 'moderate' | 'advanced'>('simple');
  const [noteDensity, setNoteDensity] = useState<'low' | 'medium' | 'high'>('medium');
  const [cadenceType, setCadenceType] = useState<'perfect' | 'plagal' | 'deceptive' | 'half' | 'phrygian-half'>('perfect');
  const [modulationFrequency, setModulationFrequency] = useState<'never' | 'rare' | 'frequent'>('never');
  const [accidentals, setAccidentals] = useState<'none' | 'some' | 'many'>('none');
  // Save state
  const [saving, setSaving] = useState(false);
  const [savedExerciseId, setSavedExerciseId] = useState<string | null>(null);

  // Presets based on difficulty
  React.useEffect(() => {
    if (difficulty === 'beginner') {
      setTempo(80);
      setRhythmicComplexity('simple');
      setNoteDensity('low');
      setCadenceType('perfect');
      setModulationFrequency('never');
      setAccidentals('none');
    } else if (difficulty === 'intermediate') {
      setTempo(96);
      setRhythmicComplexity('moderate');
      setNoteDensity('medium');
      setCadenceType('plagal');
      setModulationFrequency('rare');
      setAccidentals('some');
    } else if (difficulty === 'advanced') {
      setTempo(112);
      setRhythmicComplexity('advanced');
      setNoteDensity('high');
      setCadenceType('deceptive');
      setModulationFrequency('frequent');
      setAccidentals('many');
    }
  }, [difficulty]);

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
    console.log('🎵 Generate button clicked');
    setIsGenerating(true);
    setGeneratedMusicXML('');
    setExerciseGenerated(false);

    try {
      console.log('🎵 Generating sight-reading exercise...');
      console.log('🎵 Parameters:', {
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
          tempo,
          rhythmicComplexity,
          noteDensity,
          cadenceType,
          modulationFrequency,
          accidentals
        }
      });

      console.log('🎵 Function response:', { data, error });

      if (error) {
        console.error('🚨 Supabase function error:', error);
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
        console.error('🚨 Invalid MusicXML generated:', validation.error);
        console.error('🚨 MusicXML preview:', musicXML?.substring(0, 500));
        throw new Error(`Generated MusicXML is invalid: ${validation.error}. Please try generating again with different parameters.`);
      }

      console.log('✅ Valid MusicXML generated, length:', musicXML.length);
      setGeneratedMusicXML(musicXML);
      setExerciseGenerated(true);
      
      toast({
        title: "Exercise Generated",
        description: `Created ${measures[0]}-measure sight-reading exercise in ${keySignature}`
      });

    } catch (error) {
      console.error('🚨 Error generating exercise:', error);
      
      let errorMessage = "Failed to generate sight-reading exercise";
      
      if (error?.message?.includes('Failed to fetch')) {
        errorMessage = "Network error: Unable to connect to the generation service. Please check your internet connection and try again.";
      } else if (error?.message?.includes('500')) {
        errorMessage = "Server error: The music generation service is currently unavailable. Please try again in a moment.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      console.log('🎵 Generation process completed');
      setIsGenerating(false);
    }
  };

  return (
    <ContractErrorBoundary>
      <UniversalLayout>
        <div className="h-screen flex flex-col overflow-hidden">
        {/* Header - Compact */}
        <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="p-2 h-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-xl font-bold">Sight Reading Generator</h1>
                  <p className="text-sm text-muted-foreground hidden sm:block">
                    Generate AI-powered sight-reading exercises
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Fixed Height Grid */}
        <div className="flex-1 container mx-auto px-4 py-4 overflow-hidden">
          <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left Panel - Controls (4 columns on desktop) */}
            <div className="lg:col-span-4 space-y-4 overflow-y-auto">
              
              {/* Exercise Parameters - Compact */}
              <Card className="flex-shrink-0">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Exercise Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Row 1: Difficulty & Key */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Difficulty</Label>
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs">Key</Label>
                      <Select value={keySignature} onValueChange={setKeySignature}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="C major">C major</SelectItem>
                          <SelectItem value="G major">G major</SelectItem>
                          <SelectItem value="D major">D major</SelectItem>
                          <SelectItem value="F major">F major</SelectItem>
                          <SelectItem value="Bb major">B♭ major</SelectItem>
                          <SelectItem value="A minor">A minor</SelectItem>
                          <SelectItem value="E minor">E minor</SelectItem>
                          <SelectItem value="D minor">D minor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 2: Time & Voice */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Time</Label>
                      <Select value={timeSignature} onValueChange={setTimeSignature}>
                        <SelectTrigger className="h-8">
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

                    <div className="space-y-1">
                      <Label className="text-xs">Voice</Label>
                      <Select value={voicePart} onValueChange={setVoicePart as any}>
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Soprano">Soprano</SelectItem>
                          <SelectItem value="Alto">Alto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Row 3: Measures */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Measures</Label>
                      <span className="text-xs font-mono">{measures[0]}</span>
                    </div>
                    <Slider
                      value={measures}
                      onValueChange={setMeasures}
                      max={12}
                      min={4}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* Generate Button */}
                  <Button 
                    onClick={generateExercise}
                    disabled={isGenerating}
                    className="w-full h-9"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Music className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Exercises - Compact */}
              {user && (
                <Card className="flex-1 min-h-0">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recent Exercises</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-y-auto">
                    <CompletedExercisesList user={user} />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Panel - Exercise Display (8 columns on desktop) */}
            <div className="lg:col-span-8 flex flex-col min-h-0">
              {exerciseGenerated && generatedMusicXML ? (
                <div className="h-full flex flex-col gap-4">
                  {/* Sheet Music - Takes available space */}
                  <div className="flex-1 min-h-0">
                    <Card className="h-full">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Music className="h-4 w-4" />
                          Exercise: {keySignature}, {timeSignature}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="h-full pb-6">
                        <OSMDViewer 
                          musicXML={generatedMusicXML}
                          title={`Exercise: ${keySignature}, ${timeSignature}`}
                          solfegeEnabled={solfegeEnabled}
                        />
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Practice Controls - Fixed Height */}
                  <div className="flex-shrink-0">
                    <SightSingingPractice 
                      musicXML={generatedMusicXML}
                      exerciseMetadata={{
                        key: keySignature,
                        timeSignature: timeSignature,
                        difficulty: difficulty,
                        length: measures[0],
                        description: `${measures[0]}-measure exercise in ${keySignature}`
                      }}
                      user={user}
                      onRecordingChange={setIsRecording}
                      onSolfegeChange={setSolfegeEnabled}
                    />
                  </div>
                </div>
              ) : (
                <Card className="h-full">
                  <CardContent className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <Music className="h-16 w-16 mx-auto text-muted-foreground" />
                      <div>
                        <h3 className="text-lg font-semibold">Ready to Practice?</h3>
                        <p className="text-muted-foreground">
                          Configure your exercise parameters and click "Generate" to begin.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </UniversalLayout>
    </ContractErrorBoundary>
  );
};

export default SightReadingGeneratorPage;