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
          tempo,
          rhythmicComplexity,
          noteDensity,
          cadenceType,
          modulationFrequency,
          accidentals
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

  const downloadGeneratedPDF = async () => {
    if (!generatedMusicXML) return;
    const container = document.getElementById('generated-osmd');
    if (!container) {
      toast({ title: 'PDF Error', description: 'Nothing to export yet.', variant: 'destructive' });
      return;
    }
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = await import('html2canvas');
      const canvas = await html2canvas.default(container as HTMLElement, { backgroundColor: '#ffffff', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const safeKey = keySignature.replace(/\s+/g, '-');
      pdf.save(`sight-reading-${difficulty}-${safeKey}.pdf`);
      toast({ title: 'PDF Downloaded', description: 'Your exercise has been exported.' });
    } catch (e: any) {
      console.error('PDF export error:', e);
      toast({ title: 'PDF Error', description: e.message || 'Failed to export PDF', variant: 'destructive' });
    }
  };

  const saveExercise = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to save exercises.', variant: 'destructive' });
      return;
    }
    if (!generatedMusicXML) {
      toast({ title: 'Nothing to save', description: 'Generate an exercise first.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const title = `${difficulty} ${partMode === 'two-part' ? 'SA Two-Part' : voicePart} • ${keySignature} • ${timeSignature}`;
      const params = {
        difficulty,
        keySignature,
        timeSignature,
        measures: measures[0],
        noteRange,
        partMode,
        voicePart,
        intervalProfile,
        tempo,
        rhythmicComplexity,
        noteDensity,
        cadenceType,
        modulationFrequency,
        accidentals
      };
      const { data, error } = await supabase
        .from('gw_sight_reading_exercises')
        .insert({ user_id: user.id, title, params, musicxml: generatedMusicXML })
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (data?.id) setSavedExerciseId(data.id);
      toast({ title: 'Saved', description: 'Exercise saved to your library.' });
    } catch (e: any) {
      console.error('Save error:', e);
      toast({ title: 'Save failed', description: e.message || 'Could not save exercise', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const startExamplePlayback = async () => {
    if (!audioContextRef.current || !metronomeRef.current || !notePlayerRef.current) return;
    
    // Resume audio context if suspended
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    setIsPlayingExample(true);
    setIsCountingIn(true);
    setCountInBeats(0);
    setCurrentBeat(0);
    setCurrentMeasure(0);
    
    const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
    const totalMeasures = measures[0];
    const totalBeatsInExercise = totalMeasures * beatsPerMeasure;
    const secondsPerBeat = 60.0 / tempo;
    let exerciseBeatCount = 0;
    
    console.log('Starting example playback:', {
      totalMeasures,
      beatsPerMeasure,
      totalBeatsInExercise,
      tempo,
      notesToPlay: parsedNotes.length
    });
    
    // Schedule all notes based on their timing
    const startTime = audioContextRef.current.currentTime + (4 * secondsPerBeat); // After count-in
    
    parsedNotes.forEach((note) => {
      const noteStartTime = startTime + (note.startBeat * secondsPerBeat);
      const noteDuration = note.duration * secondsPerBeat;
      notePlayerRef.current!.playNote(note.pitch, noteDuration, noteStartTime);
    });
    
    // Start metronome with count-in
    metronomeRef.current.onBeat((beatNumber, isDownbeat) => {
      if (beatNumber < 4) {
        // Count-in phase (beats 0-3)
        setCountInBeats(beatNumber + 1);
        console.log('Count-in beat:', beatNumber + 1);
      } else {
        // Example playback phase starts after count-in
        if (beatNumber === 4) {
          setIsCountingIn(false);
          console.log('Example playback started');
        }
        
        exerciseBeatCount = beatNumber - 4; // Exercise beats start from 0
        const currentBeatInMeasure = exerciseBeatCount % beatsPerMeasure;
        const currentMeasureNumber = Math.floor(exerciseBeatCount / beatsPerMeasure);
        
        setCurrentBeat(currentBeatInMeasure);
        setCurrentMeasure(currentMeasureNumber);
        
        // Stop exactly when we've completed all the measures
        if (exerciseBeatCount >= totalBeatsInExercise) {
          console.log('Example playback completed, stopping');
          stopExamplePlayback();
          return;
        }
      }
    });
    
    metronomeRef.current.start(tempo, beatsPerMeasure);
  };

  const stopExamplePlayback = () => {
    if (metronomeRef.current) {
      metronomeRef.current.stop();
    }
    if (notePlayerRef.current) {
      notePlayerRef.current.stop();
    }
    setIsPlayingExample(false);
    setIsCountingIn(false);
    setCountInBeats(0);
    setCurrentBeat(0);
    setCurrentMeasure(0);
  };

  const startPractice = async () => {
    if (!audioContextRef.current || !metronomeRef.current) return;
    
    // Resume audio context if suspended
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    setIsPracticing(true);
    setIsCountingIn(true);
    setCountInBeats(0);
    setCurrentBeat(0);
    setCurrentMeasure(0);
    
    const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
    const totalMeasures = measures[0];
    const totalBeatsInExercise = totalMeasures * beatsPerMeasure;
    let exerciseBeatCount = 0; // Separate counter for the actual exercise
    
    console.log('Starting practice:', {
      totalMeasures,
      beatsPerMeasure,
      totalBeatsInExercise,
      tempo
    });
    
    // Start metronome with count-in
    metronomeRef.current.onBeat((beatNumber, isDownbeat) => {
      if (beatNumber < 4) {
        // Count-in phase (beats 0-3)
        setCountInBeats(beatNumber + 1);
        console.log('Count-in beat:', beatNumber + 1);
      } else {
        // Practice phase starts after count-in
        if (beatNumber === 4) {
          setIsCountingIn(false);
          console.log('Exercise started');
        }
        
        exerciseBeatCount = beatNumber - 4; // Exercise beats start from 0
        const currentBeatInMeasure = exerciseBeatCount % beatsPerMeasure;
        const currentMeasureNumber = Math.floor(exerciseBeatCount / beatsPerMeasure);
        
        setCurrentBeat(currentBeatInMeasure);
        setCurrentMeasure(currentMeasureNumber);
        
        console.log('Exercise beat:', {
          exerciseBeatCount,
          currentMeasureNumber: currentMeasureNumber + 1,
          currentBeatInMeasure: currentBeatInMeasure + 1,
          totalBeatsInExercise
        });
        
        // Stop exactly when we've completed all the measures
        if (exerciseBeatCount >= totalBeatsInExercise) {
          console.log('Exercise completed, stopping metronome');
          stopPractice();
          return;
        }
      }
    });
    
    metronomeRef.current.start(tempo, beatsPerMeasure);
  };
  const stopPractice = () => {
    if (metronomeRef.current) {
      metronomeRef.current.stop();
    }
    setIsPracticing(false);
    setIsCountingIn(false);
    setCountInBeats(0);
    setCurrentBeat(0);
    setCurrentMeasure(0);
  };

  const startNewExercise = () => {
    stopPractice();
    stopExamplePlayback();
    setGeneratedMusicXML('');
    setExerciseGenerated(false);
    setIsPlayingExercise(false);
    setIsRecording(false);
    setSolfegeEnabled(false);
    setParsedNotes([]);
    
    // Reset to default parameters
    setDifficulty('beginner');
    setKeySignature('C major');
    setTimeSignature('4/4');
    setMeasures([8]);
    setNoteRange('C4-C5');
    
    // Dispatch reset events to clear practice component state
    window.dispatchEvent(new CustomEvent('resetPractice'));
  };

  // Initialize audio context and players
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        metronomeRef.current = new MetronomePlayer(audioContextRef.current);
        notePlayerRef.current = new NotePlayer(audioContextRef.current);
        
        // Set up beat callback
        metronomeRef.current.onBeat((beatNumber, isDownbeat) => {
          const beatsPerMeasure = parseInt(timeSignature.split('/')[0]);
          setCurrentBeat(beatNumber % beatsPerMeasure);
          setCurrentMeasure(Math.floor(beatNumber / beatsPerMeasure));
        });
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    };
    
    initAudio();
    
    return () => {
      if (metronomeRef.current) {
        metronomeRef.current.stop();
      }
      if (notePlayerRef.current) {
        notePlayerRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [timeSignature]);

  // Parse notes when exercise is generated
  useEffect(() => {
    if (generatedMusicXML) {
      const parsed = parseMusicXMLForPlayback(generatedMusicXML);
      setParsedNotes(parsed.notes);
      console.log('Parsed exercise notes:', parsed);
    }
  }, [generatedMusicXML]);

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
                    {/* Play Example Button */}
                    <Button
                      variant={isPlayingExample ? "destructive" : "default"}
                      onClick={isPlayingExample ? stopExamplePlayback : startExamplePlayback}
                      className="flex items-center gap-2"
                      disabled={!parsedNotes.length}
                    >
                      {isPlayingExample ? (
                        <>
                          <StopCircle className="h-4 w-4" />
                          Stop Example
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Play Example
                        </>
                      )}
                    </Button>
                    
                    {/* Practice Button with Metronome */}
                    <Button
                      variant={isPracticing ? "destructive" : "secondary"}
                      onClick={isPracticing ? stopPractice : startPractice}
                      className="flex items-center gap-2"
                    >
                      {isPracticing ? (
                        <>
                          <StopCircle className="h-4 w-4" />
                          Stop Practice
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Practice with Metronome
                        </>
                      )}
                    </Button>
                    
                    {/* Recording Button */}
                    <RecordingButton 
                      isRecording={isRecording}
                      onStartRecording={() => {
                        console.log('Recording button clicked - start recording');
                        setIsRecording(true);
                        const recordingEvent = new CustomEvent('startRecording');
                        window.dispatchEvent(recordingEvent);
                      }}
                      onStopRecording={() => {
                        console.log('Recording button clicked - stop recording');
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
                {/* Practice Status Display */}
                {(isPracticing || isPlayingExample || isCountingIn) && (
                  <div className="mb-4 p-4 bg-muted rounded-lg border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium">
                          {isCountingIn ? (
                            <span className="text-primary">Count-in: {countInBeats}/4</span>
                          ) : (
                            <span>
                              {isPlayingExample ? '🔊 Playing Example - ' : '🎤 Practice Mode - '}
                              Measure {currentMeasure + 1} of {measures[0]} • Beat {currentBeat + 1}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {tempo} BPM • {timeSignature}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: parseInt(timeSignature.split('/')[0]) }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full border-2 transition-colors ${
                              i === currentBeat && !isCountingIn
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground/30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Parts</Label>
                      <Select value={partMode} onValueChange={(v: any) => setPartMode(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single Part</SelectItem>
                          <SelectItem value="two-part">Two-Part Treble (SA)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {partMode === 'single' && (
                      <div className="space-y-2">
                        <Label>Voice</Label>
                        <Select value={voicePart} onValueChange={(v: any) => setVoicePart(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Soprano">Soprano</SelectItem>
                            <SelectItem value="Alto">Alto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Interval Profile</Label>
                      <Select value={intervalProfile} onValueChange={(v: any) => setIntervalProfile(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="stepwise">Stepwise</SelectItem>
                          <SelectItem value="thirds">Thirds</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tempo: {tempo} BPM</Label>
                      <Slider value={[tempo]} onValueChange={(v) => setTempo(v[0])} min={60} max={144} step={2} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rhythmic Complexity</Label>
                      <Select value={rhythmicComplexity} onValueChange={(v: any) => setRhythmicComplexity(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Simple</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Note Density</Label>
                      <Select value={noteDensity} onValueChange={(v: any) => setNoteDensity(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Cadence Type</Label>
                      <Select value={cadenceType} onValueChange={(v: any) => setCadenceType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="perfect">Perfect (V–I)</SelectItem>
                          <SelectItem value="plagal">Plagal (IV–I)</SelectItem>
                          <SelectItem value="half">Half (ends on V)</SelectItem>
                          <SelectItem value="deceptive">Deceptive (V–vi)</SelectItem>
                          <SelectItem value="phrygian-half">Phrygian Half</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Modulation</Label>
                      <Select value={modulationFrequency} onValueChange={(v: any) => setModulationFrequency(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="never">Never</SelectItem>
                          <SelectItem value="rare">Rare</SelectItem>
                          <SelectItem value="frequent">Frequent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Accidentals</Label>
                      <Select value={accidentals} onValueChange={(v: any) => setAccidentals(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="some">Some</SelectItem>
                          <SelectItem value="many">Many</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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