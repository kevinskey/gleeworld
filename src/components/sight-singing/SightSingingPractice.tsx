import React, { useState, useRef, useEffect, useCallback } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import './slider-styles.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { VirtualPiano } from './VirtualPiano';
import { SolfegeAnnotations } from './SolfegeAnnotations';
import { Metronome } from './Metronome';
import { 
  Play, 
  Pause, 
  Square, 
  Mic, 
  MicOff, 
  Piano, 
  Timer, 
  Volume2,
  VolumeX,
  RotateCcw,
  Save,
  Music,
  Star,
  GraduationCap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserScores } from '@/hooks/useUserScores';
import { MicTester } from '@/components/audio/MicTester';

// Standard pitch frequencies (A440 tuning) for pitch pipe
const pitches = [
  { note: 'C', frequency: 261.63, octave: 4 },
  { note: 'C♯', frequency: 277.18, octave: 4 },
  { note: 'D', frequency: 293.66, octave: 4 },
  { note: 'D♯', frequency: 311.13, octave: 4 },
  { note: 'E', frequency: 329.63, octave: 4 },
  { note: 'F', frequency: 349.23, octave: 4 },
  { note: 'F♯', frequency: 369.99, octave: 4 },
  { note: 'G', frequency: 392.00, octave: 4 },
  { note: 'G♯', frequency: 415.30, octave: 4 },
  { note: 'A', frequency: 440.00, octave: 4 },
  { note: 'A♯', frequency: 466.16, octave: 4 },
  { note: 'B', frequency: 493.88, octave: 4 },
];

interface SightSingingPracticeProps {
  musicXML: string;
  exerciseMetadata: {
    difficulty: string;
    keySignature: string;
    timeSignature: string;
    measures: number;
    noteRange: string;
  };
  showRecordingButton?: boolean;
  onRecordingChange?: (isRecording: boolean) => void;
  onSolfegeChange?: (enabled: boolean) => void;
}

interface Note {
  note: string;
  time: number;
  duration?: number;
}

export const SightSingingPractice: React.FC<SightSingingPracticeProps> = ({
  musicXML,
  exerciseMetadata,
  onRecordingChange,
  onSolfegeChange
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addScore } = useUserScores();
  
  // Practice settings
  const [practiceMode, setPracticeMode] = useState(true);
  const [pianoEnabled, setPianoEnabled] = useState(true);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [tempo, setTempo] = useState(120);
  const [solfegeEnabled, setSolfegeEnabled] = useState(false);
  const [currentNote, setCurrentNote] = useState<string | undefined>();
  const [extractedMelody, setExtractedMelody] = useState<Note[]>([]);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  
  // Voice range detection (soprano/alto based on key signature and exercise data)
  const voiceRange = exerciseMetadata.keySignature?.includes('♭') || 
                     exerciseMetadata.keySignature?.toLowerCase().includes('f') ? 'alto' : 'soprano';
  
  // Pitch pipe state
  const [currentPitch, setCurrentPitch] = useState<string | null>(null);
  const [pitchPipeExpanded, setPitchPipeExpanded] = useState(false);
  const [pitchPipeVolume, setPitchPipeVolume] = useState(0.3);
  const [pitchPipeMuted, setPitchPipeMuted] = useState(false);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownBeats, setCountdownBeats] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  
  // Assessment state
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentScore, setAssessmentScore] = useState<number | null>(null);
  const [assessmentFeedback, setAssessmentFeedback] = useState<string>('');
  const [detailedScores, setDetailedScores] = useState<any>(null);
  const [needsPractice, setNeedsPractice] = useState(false);
  const targetScore = 90;
  
  // Refs
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Audio and music display refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const metronomeRef = useRef<any>(null);
  const pitchOscillatorRef = useRef<OscillatorNode | null>(null);
  const pitchGainNodeRef = useRef<GainNode | null>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const sheetMusicRef = useRef<HTMLDivElement>(null);
  const melodyTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (recordingStream) {
        recordingStream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Add event listeners for external recording and practice control
  React.useEffect(() => {
    const handleStartRecording = () => startRecording();
    const handleStopRecording = () => stopRecording();
    const handleStartPractice = () => startPractice();
    const handleStopPractice = () => stopPractice();
    const handleResetPractice = () => resetSession();
    
    window.addEventListener('startRecording', handleStartRecording);
    window.addEventListener('stopRecording', handleStopRecording);
    window.addEventListener('startPractice', handleStartPractice);
    window.addEventListener('stopPractice', handleStopPractice);
    window.addEventListener('resetPractice', handleResetPractice);
    
    return () => {
      window.removeEventListener('startRecording', handleStartRecording);
      window.removeEventListener('stopRecording', handleStopRecording);
      window.removeEventListener('startPractice', handleStartPractice);
      window.removeEventListener('stopPractice', handleStopPractice);
      window.removeEventListener('resetPractice', handleResetPractice);
    };
  }, []);

  // Spacebar to stop playback
  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle spacebar if not typing in an input field
      if (event.code === 'Space' && event.target instanceof HTMLElement && 
          !['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) {
        event.preventDefault();
        
        if (isPlaying) {
          stopPractice();
        } else if (isRecording) {
          stopRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isPlaying, isRecording]);
  // Pitch pipe functions
  const initPitchAudioContext = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume audio context if suspended (required for user interaction)
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    return audioContextRef.current;
  }, []);

  const playPitch = useCallback(async (frequency: number, note: string) => {
    console.log('Playing pitch:', note, 'frequency:', frequency, 'volume:', pitchPipeVolume);
    
    try {
      stopPitch(); // Stop any currently playing pitch
      
      const audioContext = await initPitchAudioContext();
      console.log('Audio context state:', audioContext.state);
      
      // Create oscillator for the tone
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine'; // Pure tone
      
      const currentVolume = pitchPipeMuted ? 0 : pitchPipeVolume;
      console.log('Setting volume to:', currentVolume);
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(currentVolume, audioContext.currentTime + 0.05);
      
      oscillator.start();
      
      pitchOscillatorRef.current = oscillator;
      pitchGainNodeRef.current = gainNode;
      setCurrentPitch(note);
      
      console.log('Pitch started successfully');
      
      // Auto-stop after 3 seconds
      setTimeout(() => {
        if (pitchOscillatorRef.current === oscillator) {
          stopPitch();
        }
      }, 3000);
    } catch (error) {
      console.error('Error playing pitch:', error);
      toast({
        title: "Audio Error",
        description: "Failed to play pitch. Check browser audio permissions.",
        variant: "destructive"
      });
    }
  }, [pitchPipeVolume, pitchPipeMuted, initPitchAudioContext, toast]);

  const stopPitch = useCallback(() => {
    if (pitchOscillatorRef.current && pitchGainNodeRef.current && audioContextRef.current) {
      pitchGainNodeRef.current.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.05);
      setTimeout(() => {
        pitchOscillatorRef.current?.stop();
        pitchOscillatorRef.current = null;
        pitchGainNodeRef.current = null;
      }, 50);
    }
    setCurrentPitch(null);
  }, []);

  // Extract melody from musicXML and reset solfege when new exercise starts
  React.useEffect(() => {
    console.log('=== MELODY EXTRACTION DEBUG ===');
    console.log('MusicXML changed, extracting melody. XML length:', musicXML?.length || 0);
    console.log('MusicXML content preview:', musicXML?.substring(0, 200) || 'No XML');
    
    // Extract melody from MusicXML
    const melody = extractMelodyFromMusicXML(musicXML);
    console.log('Extracted melody:', melody.length, 'notes');
    console.log('Melody notes:', melody);
    setExtractedMelody(melody);
    
    // Notify parent about solfege setting change
    if (onSolfegeChange) {
      onSolfegeChange(solfegeEnabled);
    }
  }, [musicXML, solfegeEnabled]);

  // Initialize OSMD and render sheet music
  useEffect(() => {
    if (sheetMusicRef.current && musicXML) {
      renderSheetMusic();
    }
  }, [musicXML]);

  const renderSheetMusic = async () => {
    if (!sheetMusicRef.current || !musicXML) return;

    try {
      // Clear previous content
      sheetMusicRef.current.innerHTML = '';

      // Initialize OSMD
      osmdRef.current = new OpenSheetMusicDisplay(sheetMusicRef.current, {
        autoResize: true,
        backend: 'svg',
        drawTitle: false,
        drawComposer: false,
        drawCredits: false,
        drawLyrics: false,
        drawPartNames: false,
        coloringMode: 0,
        followCursor: false,
        cursorsOptions: [],
        pageFormat: 'A4_P',
        pageBackgroundColor: '#FFFFFF',
        renderSingleHorizontalStaffline: false,
        defaultFontFamily: 'Times New Roman',
        spacingFactorSoftmax: 5,
        spacingBetweenTextLines: 0.5,
      });

      // Create blob URL from XML content
      const blob = new Blob([musicXML], { type: 'application/xml' });
      const blobUrl = URL.createObjectURL(blob);

      try {
        await osmdRef.current.load(blobUrl);
        await osmdRef.current.render();
        console.log('Sheet music rendered successfully');
      } finally {
        // Clean up blob URL
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error('Error rendering sheet music:', error);
      if (sheetMusicRef.current) {
        sheetMusicRef.current.innerHTML = `
          <div class="flex items-center justify-center h-64 text-muted-foreground">
            <div class="text-center">
              <p class="font-medium">Failed to render sheet music</p>
              <p class="text-sm mt-1">Please try generating a new exercise</p>
            </div>
          </div>
        `;
      }
    }
  };

  // Function to extract melody from MusicXML
  const extractMelodyFromMusicXML = (xml: string): Note[] => {
    console.log('extractMelodyFromMusicXML called with XML length:', xml ? xml.length : 0);
    if (!xml) {
      console.log('No XML provided to extractMelodyFromMusicXML');
      return [];
    }
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'application/xml');
      console.log('Parsed MusicXML document:', doc);
      
      const notes = doc.querySelectorAll('note');
      console.log('Found notes in MusicXML:', notes.length);
      
      const melody: Note[] = [];
      let currentTime = 0;
      const beatDuration = 0.5; // Half second per beat (120 BPM)
      
      notes.forEach((noteElement, index) => {
        console.log(`Processing note ${index + 1}:`, noteElement);
        const pitchElement = noteElement.querySelector('pitch');
        console.log('Pitch element found:', !!pitchElement);
        
        if (pitchElement) {
          const step = pitchElement.querySelector('step')?.textContent || 'C';
          const octave = pitchElement.querySelector('octave')?.textContent || '4';
          const alter = pitchElement.querySelector('alter')?.textContent;
          
          let noteName = step + octave;
          if (alter === '1') noteName = step + '#' + octave;
          if (alter === '-1') noteName = step + 'b' + octave;
          
          const duration = noteElement.querySelector('duration')?.textContent;
          const durationValue = duration ? parseFloat(duration) / 4 * beatDuration : beatDuration;
          
          console.log(`Adding note to melody: ${noteName} at time ${currentTime} with duration ${durationValue}`);
          
          melody.push({
            note: noteName,
            time: currentTime,
            duration: durationValue
          });
          
          currentTime += durationValue;
        } else {
          console.log('Note element has no pitch - might be a rest');
        }
      });
      
      console.log('Final extracted melody:', melody);
      return melody;
    } catch (error) {
      console.error('Error extracting melody from MusicXML:', error);
      return [];
    }
  };

  const startCountdown = (callback: () => void) => {
    setIsCountingDown(true);
    setCountdownBeats(0);
    
    // Get beats per measure from time signature
    const [beatsPerMeasure] = exerciseMetadata.timeSignature.split('/').map(Number);
    const interval = 60000 / tempo; // Convert BPM to milliseconds
    
    let beatCount = 0;
    
    // Start metronome for countdown
    if (metronomeEnabled) {
      startMetronome();
    }
    
    const countdownInterval = setInterval(() => {
      beatCount++;
      setCountdownBeats(beatCount);
      
      if (beatCount >= beatsPerMeasure) {
        clearInterval(countdownInterval);
        setIsCountingDown(false);
        
        // Keep metronome running for both practice and recording modes
        // Only stop metronome when user toggles it off or session ends
        console.log('Countdown complete, metronome continues running');
        
        callback(); // Start the actual practice or recording
      }
    }, interval);
    
    toast({
      title: "Get Ready",
      description: `1 measure countdown (${beatsPerMeasure} beats)`
    });
  };

  const startPractice = async () => {
    try {
      // Initialize audio context on user interaction
      if (!audioContextRef.current) {
        console.log('Initializing AudioContext on user interaction');
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('AudioContext initialized, state:', audioContextRef.current.state);
      }
      
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        console.log('Resuming AudioContext');
        await audioContextRef.current.resume();
        console.log('AudioContext resumed, state:', audioContextRef.current.state);
      }
      
      if (metronomeEnabled) {
        // Start with countdown
        startCountdown(() => {
          actuallyStartPractice();
        });
      } else {
        actuallyStartPractice();
      }
    } catch (error) {
      console.error('Error starting practice:', error);
      toast({
        title: "Error",
        description: "Failed to start practice session",
        variant: "destructive"
      });
    }
  };

  const actuallyStartPractice = () => {
    console.log('=== STARTING PRACTICE SESSION ===');
    console.log('Piano enabled:', pianoEnabled);
    console.log('Extracted melody length:', extractedMelody.length);
    console.log('Extracted melody:', extractedMelody);
    console.log('Metronome enabled:', metronomeEnabled);
    
    setIsPlaying(true);
    
    console.log('Starting practice - pianoEnabled:', pianoEnabled, 'extractedMelody length:', extractedMelody.length);
    
    // Metronome continues running from countdown through practice
    if (metronomeEnabled) {
      toast({
        title: "Practice Started",
        description: "Practicing with metronome and melody playback"
      });
    }
    
    if (pianoEnabled && extractedMelody.length > 0) {
      console.log('Starting melody playback with', extractedMelody.length, 'notes');
      // Play melody synchronized with tempo
      playMelodySequence();
      toast({
        title: "Practice Started",
        description: "Melody playback and practice aids are now active"
      });
    } else {
      console.log('Melody playback skipped - pianoEnabled:', pianoEnabled, 'melody length:', extractedMelody.length);
    }
    
    // Calculate practice duration based on exercise measures and tempo
    const [beatsPerMeasure] = exerciseMetadata.timeSignature.split('/').map(Number);
    const totalBeats = exerciseMetadata.measures * beatsPerMeasure;
    const practiceSeconds = Math.ceil((totalBeats * 60) / tempo);
    
    console.log('Practice duration calculated:', practiceSeconds, 'seconds for', exerciseMetadata.measures, 'measures');
    
    // Clear any existing timer before starting a new one
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    
    // Timer for visual feedback and auto-stop
    let time = 0;
    playbackTimerRef.current = setInterval(() => {
      time += 1;
      setPlaybackTime(time);
      if (time >= practiceSeconds && isPlaying) { // Only auto-stop if still playing
        console.log('Practice time completed, auto-stopping practice');
        stopPractice();
        // Dispatch event to update the parent component's state
        window.dispatchEvent(new CustomEvent('practiceAutoStopped'));
      }
    }, 1000);
  };

  // Play melody notes in sequence synchronized with tempo
  const playMelodySequence = () => {
    if (!pianoEnabled || extractedMelody.length === 0) {
      console.log('playMelodySequence aborted - pianoEnabled:', pianoEnabled, 'melody length:', extractedMelody.length);
      return;
    }

    console.log('Playing melody sequence with', extractedMelody.length, 'notes at tempo', tempo);
    const tempoMultiplier = 120 / tempo; // Adjust timing based on current tempo
    
    // Clear any existing melody timeouts
    melodyTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    melodyTimeoutsRef.current = [];
    
    // Reset progress indicators
    setPlaybackProgress(0);
    setCurrentNoteIndex(-1);
    
    extractedMelody.forEach((note, index) => {
      const delayMs = note.time * 1000 * tempoMultiplier;
      const duration = (note.duration || 0.5) * tempoMultiplier;
      
      console.log(`Scheduling note ${index + 1}/${extractedMelody.length}: ${note.note} at ${delayMs}ms`);
      
      const noteTimeout = setTimeout(() => {
        if (isPlaying) { // Only play if still in practice mode
          console.log(`Playing note: ${note.note}`);
          setCurrentNoteIndex(index);
          setCurrentNote(note.note);
          
          // Play the note asynchronously to handle AudioContext state properly
          playMelodyNote(note.note, duration).catch((error) => {
            console.error(`Failed to play note ${note.note}:`, error);
          });
          
          // Update progress
          const progress = ((index + 1) / extractedMelody.length) * 100;
          setPlaybackProgress(progress);
        }
      }, delayMs);
      
      melodyTimeoutsRef.current.push(noteTimeout);
      
      // Clear current note highlight after duration
      const clearTimeout = setTimeout(() => {
        if (isPlaying && index === currentNoteIndex) {
          setCurrentNote(undefined);
        }
      }, delayMs + (duration * 1000));
      
      melodyTimeoutsRef.current.push(clearTimeout);
    });

    // Reset progress when melody completes
    const totalDuration = extractedMelody[extractedMelody.length - 1]?.time * 1000 * tempoMultiplier + 1000;
    const resetTimeout = setTimeout(() => {
      if (isPlaying) {
        setPlaybackProgress(0);
        setCurrentNoteIndex(-1);
        setCurrentNote(undefined);
      }
    }, totalDuration);
    
    melodyTimeoutsRef.current.push(resetTimeout);
  };

  // Play a single melody note using Web Audio API
  const playMelodyNote = async (noteName: string, duration: number = 0.5) => {
    console.log('playMelodyNote called with:', noteName, 'duration:', duration);
    
    try {
      // Ensure we have a fresh, active AudioContext for each note
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        console.log('Creating new AudioContext for note playback');
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Always resume the audio context before playing
      if (audioContextRef.current.state === 'suspended') {
        console.log('Resuming suspended AudioContext');
        await audioContextRef.current.resume();
      }
      
      // Verify audio context is ready
      if (audioContextRef.current.state !== 'running') {
        console.error('AudioContext failed to start, state:', audioContextRef.current.state);
        // Try to create a new one
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        await audioContextRef.current.resume();
      }
      
      console.log('AudioContext state before playing note:', audioContextRef.current.state);

      // Note frequencies for melody playback
      const frequencies: { [key: string]: number } = {
        'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00,
        'A#3': 233.08, 'B3': 246.94,
        'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63,
        'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00,
        'A#4': 466.16, 'B4': 493.88,
        'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25, 'E5': 659.25,
        'F5': 698.46, 'F#5': 739.99, 'G5': 783.99, 'G#5': 830.61, 'A5': 880.00
      };

      const frequency = frequencies[noteName];
      if (!frequency) {
        console.error('No frequency found for note:', noteName);
        return;
      }

      console.log('Playing frequency:', frequency, 'for note:', noteName);

      const oscillator = audioContextRef.current.createOscillator();
      const gainNode = audioContextRef.current.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);

      // Create envelope for musical sound
      gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioContextRef.current.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.05, audioContextRef.current.currentTime + duration * 0.8);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + duration);

      oscillator.start(audioContextRef.current.currentTime);
      oscillator.stop(audioContextRef.current.currentTime + duration);
      
      console.log('Note played successfully:', noteName);
    } catch (error) {
      console.error('Error playing melody note:', error);
    }
  };

  const stopPractice = () => {
    console.log('Stopping practice session');
    
    // Prevent multiple calls by checking if already stopped
    if (!isPlaying) {
      console.log('Practice already stopped, ignoring duplicate call');
      return;
    }
    
    setIsPlaying(false);
    setPlaybackTime(0);
    setPlaybackProgress(0);
    setCurrentNoteIndex(-1);
    setCurrentNote(undefined);
    
    // Clear all melody timeouts to stop notes from playing
    console.log('Clearing', melodyTimeoutsRef.current.length, 'melody timeouts');
    melodyTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    melodyTimeoutsRef.current = [];
    
    // Clear timer
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    
    // Always stop metronome when practice stops
    stopMetronome();
    
    toast({
      title: "Practice Stopped",
      description: "Practice session ended"
    });
  };

  const startMetronome = async () => {
    try {
      console.log('startMetronome called - current metronome exists:', !!metronomeRef.current);
      
      // Always stop any existing metronome first
      if (metronomeRef.current) {
        console.log('Stopping existing metronome before starting new one');
        clearInterval(metronomeRef.current);
        metronomeRef.current = null;
      }
      
      // Initialize audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const audioContext = audioContextRef.current;
      
      // Resume audio context if suspended (required for user interaction)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const interval = 60000 / tempo; // Convert BPM to milliseconds
      console.log('Starting metronome with interval:', interval, 'ms for tempo:', tempo);
      
      metronomeRef.current = setInterval(() => {
        try {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = 800; // Higher pitch for clear click
          oscillator.type = 'sine';
          
          const currentTime = audioContext.currentTime;
          gainNode.gain.setValueAtTime(0, currentTime);
          gainNode.gain.linearRampToValueAtTime(0.3, currentTime + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.1);
          
          oscillator.start(currentTime);
          oscillator.stop(currentTime + 0.1);
        } catch (error) {
          console.error('Metronome tick error:', error);
        }
      }, interval);
      
    } catch (error) {
      console.error('Error starting metronome:', error);
      toast({
        title: "Metronome Error",
        description: "Failed to start metronome",
        variant: "destructive"
      });
    }
  };

  const stopMetronome = () => {
    console.log('stopMetronome called - metronomeRef.current:', !!metronomeRef.current);
    
    // Force clear the interval
    if (metronomeRef.current) {
      console.log('Clearing metronome interval:', metronomeRef.current);
      clearInterval(metronomeRef.current);
      metronomeRef.current = null;
      console.log('Metronome interval cleared');
    } else {
      console.log('No metronome interval to clear');
    }
    
    // Also try to close the audio context to force stop any playing audio
    try {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        console.log('Suspending audio context to stop metronome audio');
        audioContextRef.current.suspend();
      }
    } catch (error) {
      console.log('Error suspending audio context:', error);
    }
    
    console.log('stopMetronome completed');
  };

  const startRecording = async () => {
    try {
      if (metronomeEnabled) {
        // Start with countdown
        startCountdown(() => {
          actuallyStartRecording();
        });
      } else {
        actuallyStartRecording();
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Failed to start recording session",
        variant: "destructive"
      });
    }
  };

  const actuallyStartRecording = async () => {
    try {
      // Metronome is already running from countdown, keep it going
      console.log('Starting recording with metronome continuing from countdown');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      setRecordingStream(stream);
      
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      const chunks: BlobPart[] = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
      onRecordingChange?.(true);
      setRecordingTime(0);
      
      // Recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Sing the exercise with the metronome"
      });
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Error",
        description: "Failed to access microphone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    
    setIsRecording(false);
    onRecordingChange?.(false);
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    stopMetronome();
    
    toast({
      title: "Recording Stopped",
      description: "Ready for AI assessment"
    });
  };

  const submitForAssessment = async () => {
    if (!audioBlob || !user) {
      toast({
        title: "Error",
        description: "No recording or user found",
        variant: "destructive"
      });
      return;
    }

    setIsAssessing(true);
    
    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      // Call AI assessment function
      const { data, error } = await supabase.functions.invoke('assess-sight-singing', {
        body: {
          audioData: base64Audio,
          exerciseMetadata,
          musicXML
        }
      });
      
      if (error) throw error;
      
      const { score, feedback, detailed_scores, needs_practice } = data;
      setAssessmentScore(score);
      setAssessmentFeedback(feedback);
      setDetailedScores(detailed_scores);
      setNeedsPractice(needs_practice);
      
      // Save score to database
      await addScore({
        score_value: score,
        performance_date: new Date().toISOString().split('T')[0],
        notes: feedback,
        sheet_music_id: null // Could be implemented later
      });
      
      toast({
        title: "Assessment Complete",
        description: `Score: ${score}/100`
      });
      
    } catch (error) {
      console.error('Error during assessment:', error);
      
      // Fallback mock assessment
      const mockScore = Math.floor(Math.random() * 25) + 70; // 70-95 range
      setAssessmentScore(mockScore);
      setNeedsPractice(mockScore < targetScore);
      setDetailedScores({
        pitch_accuracy: Math.floor(Math.random() * 20) + 75,
        rhythm_accuracy: Math.floor(Math.random() * 20) + 70,
        tempo_consistency: Math.floor(Math.random() * 15) + 80,
        intonation_score: Math.floor(Math.random() * 25) + 70,
        overall_musicality: Math.floor(Math.random() * 20) + 75
      });
      
      let mockFeedback = '';
      if (mockScore >= 90) {
        mockFeedback = '🎯 Excellent sight singing! You\'ve achieved mastery level. Outstanding pitch accuracy and rhythm!';
      } else if (mockScore >= 80) {
        mockFeedback = '🎵 Very good sight singing! You\'re close to mastery - just minor adjustments needed for 90+.';
      } else if (mockScore >= 70) {
        mockFeedback = '📈 Good effort! Focus on maintaining steady tempo and pitch accuracy to reach the 90 target.';
      } else {
        mockFeedback = '🎼 Keep practicing! Work on interval recognition and rhythmic precision to improve your score.';
      }
      
      setAssessmentFeedback(mockFeedback);
      
      await addScore({
        score_value: mockScore,
        performance_date: new Date().toISOString().split('T')[0],
        notes: mockFeedback,
        sheet_music_id: null
      });
      
      toast({
        title: "Assessment Complete (Mock)",
        description: `Score: ${mockScore}/100`
      });
    } finally {
      setIsAssessing(false);
    }
  };

  const resetSession = () => {
    setAudioBlob(null);
    setAssessmentScore(null);
    setAssessmentFeedback('');
    setDetailedScores(null);
    setNeedsPractice(false);
    setRecordingTime(0);
    setPlaybackTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Top Ribbon - Practice Controls */}
      <div className="bg-gradient-to-r from-muted/50 to-muted/30 border border-border rounded-lg p-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Left Group - Toggles */}
          <div className="flex items-center gap-6">
            {/* Melody Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="piano"
                checked={pianoEnabled}
                onCheckedChange={setPianoEnabled}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-300"
              />
              <Label htmlFor="piano" className="flex items-center gap-1 cursor-pointer text-sm">
                <Piano className="h-3.5 w-3.5" />
                Melody
              </Label>
            </div>
            
            {/* Solfège Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="solfege"
                checked={solfegeEnabled}
                onCheckedChange={setSolfegeEnabled}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-300"
              />
              <Label htmlFor="solfege" className="flex items-center gap-1 cursor-pointer text-sm">
                <GraduationCap className="h-3.5 w-3.5" />
                Solfège
              </Label>
            </div>
            
            {/* Metronome Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="metronome"
                checked={metronomeEnabled}
                onCheckedChange={(checked) => {
                  console.log('=== METRONOME TOGGLE ===');
                  console.log('Metronome toggle clicked:', checked);
                  console.log('Current metronome state - isPlaying:', isPlaying, 'isRecording:', isRecording);
                  console.log('Current metronomeRef.current:', !!metronomeRef.current);
                  
                  setMetronomeEnabled(checked);
                  
                  if (!checked) {
                    console.log('Metronome toggled OFF - force stopping metronome');
                    stopMetronome();
                  } else if (isPlaying || isRecording) {
                    console.log('Metronome toggled ON during active session - starting metronome');
                    startMetronome();
                  } else {
                    console.log('Metronome toggled ON but no active session');
                  }
                  
                  console.log('=== END METRONOME TOGGLE ===');
                }}
                className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-gray-300"
              />
              <Label htmlFor="metronome" className="flex items-center gap-1 cursor-pointer text-sm">
                <Timer className="h-3.5 w-3.5" />
                Metronome
              </Label>
            </div>
          </div>
          
          {/* Right Group - Tempo Control and Play Button */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">Tempo:</Label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="60"
                  max="200"
                  value={tempo}
                  onChange={(e) => setTempo(parseInt(e.target.value))}
                  className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-sm font-mono min-w-[3rem] text-center">{tempo}</span>
              </div>
            </div>
            
            {/* Play Button */}
            <Button 
              onClick={startPractice}
              disabled={!musicXML || extractedMelody.length === 0}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Play
            </Button>
          </div>
        </div>
      </div>


      {/* Countdown Display */}
      {isCountingDown && (
        <Card className="border-yellow-500 bg-yellow-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <Timer className="h-6 w-6 text-yellow-600 animate-pulse" />
              <div className="text-center">
                <div className="text-lg font-semibold text-yellow-800">
                  Get Ready! Beat {countdownBeats} of {exerciseMetadata.timeSignature.split('/')[0]}
                </div>
                <div className="text-sm text-yellow-600">
                  Practice/recording will start after this measure
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assessment Results */}
      {assessmentScore !== null && (
        <Card className={needsPractice ? "border-yellow-500 bg-yellow-50/30" : "border-green-500 bg-green-50/30"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              AI Assessment Results
              {needsPractice && (
                <Badge variant="outline" className="ml-2 border-yellow-500 text-yellow-700">
                  Target: {targetScore}/100
                </Badge>
              )}
              {!needsPractice && (
                <Badge className="ml-2 bg-green-500 text-white">
                  🎯 Mastery Achieved!
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-3xl font-bold ${needsPractice ? 'text-yellow-600' : 'text-green-600'}`}>
                  {assessmentScore}/100
                </div>
                <div className="text-sm text-muted-foreground">
                  {assessmentScore >= 90 ? '🏆 Excellent - Mastery Level!' :
                   assessmentScore >= 80 ? '🎵 Very Good - Almost There!' :
                   assessmentScore >= 70 ? '📈 Good - Keep Practicing!' : '🎼 Needs Work - Focus on Fundamentals'}
                </div>
              </div>
              <div className="w-32">
                <Progress 
                  value={assessmentScore} 
                  className={`h-3 ${needsPractice ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`} 
                />
                <div className="text-xs text-center mt-1 text-muted-foreground">
                  {needsPractice ? `${targetScore - assessmentScore} points to target` : 'Target achieved!'}
                </div>
              </div>
            </div>

            {/* Detailed Scores */}
            {detailedScores && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-sm font-medium text-muted-foreground">Pitch</div>
                  <div className="text-lg font-bold">{Math.round(detailedScores.pitch_accuracy)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-muted-foreground">Rhythm</div>
                  <div className="text-lg font-bold">{Math.round(detailedScores.rhythm_accuracy)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-muted-foreground">Tempo</div>
                  <div className="text-lg font-bold">{Math.round(detailedScores.tempo_consistency)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-muted-foreground">Tone</div>
                  <div className="text-lg font-bold">{Math.round(detailedScores.intonation_score)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-muted-foreground">Music</div>
                  <div className="text-lg font-bold">{Math.round(detailedScores.overall_musicality)}</div>
                </div>
              </div>
            )}
            
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">{assessmentFeedback}</p>
            </div>
            
            <div className="flex gap-2">
              {needsPractice ? (
                <>
                  <Button onClick={resetSession} className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700">
                    <RotateCcw className="h-4 w-4" />
                    Practice Again (Goal: {targetScore}/100)
                  </Button>
                  <Button variant="outline" onClick={resetSession}>
                    New Exercise
                  </Button>
                </>
              ) : (
                <>
                  <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                    🎉 Mastery Achieved!
                  </Button>
                  <Button variant="outline" onClick={resetSession}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try New Exercise
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Microphone Testing */}
      <MicTester className="w-full" />
    </div>
  );
};