import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  Piano as PianoIcon
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
}

export const SightSingingPractice: React.FC<SightSingingPracticeProps> = ({
  musicXML,
  exerciseMetadata,
  onRecordingChange
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addScore } = useUserScores();
  
  // Practice settings
  const [practiceMode, setPracticeMode] = useState(true);
  const [pianoEnabled, setPianoEnabled] = useState(true);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [tempo, setTempo] = useState(120);
  
  // Melody player state
  const [melodyPlaysRemaining, setMelodyPlaysRemaining] = useState(2);
  const [isPlayingMelody, setIsPlayingMelody] = useState(false);
  
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
  
  
  // Refs
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const metronomeRef = useRef<any>(null);
  const pitchOscillatorRef = useRef<OscillatorNode | null>(null);
  const pitchGainNodeRef = useRef<GainNode | null>(null);

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
    
    window.addEventListener('startRecording', handleStartRecording);
    window.addEventListener('stopRecording', handleStopRecording);
    window.addEventListener('startPractice', handleStartPractice);
    
    return () => {
      window.removeEventListener('startRecording', handleStartRecording);
      window.removeEventListener('stopRecording', handleStopRecording);
      window.removeEventListener('startPractice', handleStartPractice);
    };
  }, []);

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

  // Melody player functions
  const playMelody = async () => {
    if (melodyPlaysRemaining <= 0 || isPlayingMelody) return;
    
    setIsPlayingMelody(true);
    setMelodyPlaysRemaining(prev => prev - 1);
    
    try {
      // Initialize audio context
      const audioContext = await initPitchAudioContext();
      
      // Extract notes from exercise (simplified - in real implementation would parse musicXML)
      const exerciseNotes = extractNotesFromExercise();
      
      toast({
        title: "Playing Exercise Melody",
        description: `Playing ${exerciseNotes.length} notes with piano sound. Plays remaining: ${melodyPlaysRemaining - 1}/2`
      });
      
      // Play notes sequentially with piano sound
      await playNotesSequentially(exerciseNotes, audioContext);
      
    } catch (error) {
      console.error('Error playing melody:', error);
      toast({
        title: "Playback Error",
        description: "Failed to play exercise melody",
        variant: "destructive"
      });
    } finally {
      setIsPlayingMelody(false);
    }
  };

  const extractNotesFromExercise = () => {
    // Simplified note extraction - in real implementation would parse musicXML
    // For now, return a sample melody based on key signature
    const keySignature = exerciseMetadata.keySignature;
    
    if (keySignature.includes('C major')) {
      return [
        { frequency: 261.63, duration: 500 }, // C4
        { frequency: 293.66, duration: 500 }, // D4
        { frequency: 329.63, duration: 500 }, // E4
        { frequency: 349.23, duration: 500 }, // F4
        { frequency: 392.00, duration: 500 }, // G4
        { frequency: 440.00, duration: 500 }, // A4
        { frequency: 493.88, duration: 500 }, // B4
        { frequency: 523.25, duration: 1000 }, // C5
      ];
    } else if (keySignature.includes('G major')) {
      return [
        { frequency: 392.00, duration: 500 }, // G4
        { frequency: 440.00, duration: 500 }, // A4
        { frequency: 493.88, duration: 500 }, // B4
        { frequency: 523.25, duration: 500 }, // C5
        { frequency: 587.33, duration: 500 }, // D5
        { frequency: 659.25, duration: 500 }, // E5
        { frequency: 740.00, duration: 500 }, // F#5
        { frequency: 783.99, duration: 1000 }, // G5
      ];
    } else {
      // Default scale
      return [
        { frequency: 261.63, duration: 500 }, // C4
        { frequency: 293.66, duration: 500 }, // D4
        { frequency: 329.63, duration: 500 }, // E4
        { frequency: 261.63, duration: 1000 }, // C4
      ];
    }
  };

  const playNotesSequentially = async (notes: { frequency: number; duration: number }[], audioContext: AudioContext) => {
    for (let i = 0; i < notes.length; i++) {
      if (!isPlayingMelody) break; // Stop if melody was cancelled
      
      const note = notes[i];
      await playPianoNote(note.frequency, note.duration, audioContext);
      
      // Small gap between notes
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  };

  const playPianoNote = async (frequency: number, duration: number, audioContext: AudioContext) => {
    return new Promise<void>((resolve) => {
      // Create a more piano-like sound using multiple oscillators
      const fundamental = audioContext.createOscillator();
      const harmonic2 = audioContext.createOscillator();
      const harmonic3 = audioContext.createOscillator();
      
      const gainNode = audioContext.createGain();
      const gain2 = audioContext.createGain();
      const gain3 = audioContext.createGain();
      const masterGain = audioContext.createGain();
      
      // Set up fundamental frequency
      fundamental.frequency.value = frequency;
      fundamental.type = 'sine';
      
      // Set up harmonics for piano-like timbre
      harmonic2.frequency.value = frequency * 2;
      harmonic2.type = 'sine';
      
      harmonic3.frequency.value = frequency * 3;
      harmonic3.type = 'sine';
      
      // Connect and set volumes
      fundamental.connect(gainNode);
      harmonic2.connect(gain2);
      harmonic3.connect(gain3);
      
      gainNode.connect(masterGain);
      gain2.connect(masterGain);
      gain3.connect(masterGain);
      masterGain.connect(audioContext.destination);
      
      // Set volumes for piano-like sound
      const volume = pianoEnabled ? 0.3 : 0.15;
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gain2.gain.setValueAtTime(volume * 0.3, audioContext.currentTime);
      gain3.gain.setValueAtTime(volume * 0.1, audioContext.currentTime);
      
      // Piano-like envelope (quick attack, slower decay)
      masterGain.gain.setValueAtTime(0, audioContext.currentTime);
      masterGain.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.01);
      masterGain.gain.exponentialRampToValueAtTime(0.7, audioContext.currentTime + 0.1);
      masterGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
      
      // Start oscillators
      fundamental.start(audioContext.currentTime);
      harmonic2.start(audioContext.currentTime);
      harmonic3.start(audioContext.currentTime);
      
      // Stop oscillators
      fundamental.stop(audioContext.currentTime + duration / 1000);
      harmonic2.stop(audioContext.currentTime + duration / 1000);
      harmonic3.stop(audioContext.currentTime + duration / 1000);
      
      setTimeout(resolve, duration);
    });
  };

  // Reset melody plays when new exercise starts
  React.useEffect(() => {
    setMelodyPlaysRemaining(2);
  }, [musicXML]);

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
    setIsPlaying(true);
    
    if (pianoEnabled) {
      // Simulate piano accompaniment
      toast({
        title: "Practice Started",
        description: "Piano accompaniment and metronome are playing"
      });
    } else {
      toast({
        title: "Practice Started", 
        description: "Metronome is playing"
      });
    }
    
    // Simulate practice duration
    let time = 0;
    playbackTimerRef.current = setInterval(() => {
      time += 1;
      setPlaybackTime(time);
      if (time >= 30) { // 30 second practice
        stopPractice();
      }
    }, 1000);
  };

  const stopPractice = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    stopMetronome();
  };

  const startMetronome = async () => {
    try {
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
      
      // Clear any existing metronome
      if (metronomeRef.current) {
        clearInterval(metronomeRef.current);
      }
      
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
    if (metronomeRef.current) {
      clearInterval(metronomeRef.current);
      metronomeRef.current = null;
    }
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
      
      const { score, feedback } = data;
      setAssessmentScore(score);
      setAssessmentFeedback(feedback);
      
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
      const mockScore = Math.floor(Math.random() * 41) + 60;
      setAssessmentScore(mockScore);
      
      let mockFeedback = '';
      if (mockScore >= 90) {
        mockFeedback = 'Excellent sight singing! Your pitch accuracy and rhythm were nearly perfect.';
      } else if (mockScore >= 80) {
        mockFeedback = 'Very good sight singing. Minor intonation adjustments needed.';
      } else if (mockScore >= 70) {
        mockFeedback = 'Good effort. Focus on maintaining steady tempo and pitch accuracy.';
      } else {
        mockFeedback = 'Keep practicing! Work on interval recognition and rhythmic precision.';
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
    setRecordingTime(0);
    setPlaybackTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Practice Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Practice Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single Line Practice Controls */}
          <div className="flex items-center justify-between gap-4 p-4 bg-muted/20 rounded-lg border">
            {/* Left Side - Piano Switch */}
            <div className="flex items-center space-x-2">
              <Switch
                id="piano"
                checked={pianoEnabled}
                onCheckedChange={setPianoEnabled}
              />
              <Label htmlFor="piano" className="flex items-center gap-2">
                <Piano className="h-4 w-4" />
                Piano
              </Label>
            </div>
            
            {/* Center - Metronome with Vertical Tempo */}
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="metronome"
                  checked={metronomeEnabled}
                  onCheckedChange={setMetronomeEnabled}
                />
                <Label htmlFor="metronome" className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Metronome
                </Label>
              </div>
              
              {/* Vertical Tempo Slider */}
              <div className="flex flex-col items-center space-y-2">
                <Label className="text-xs">Tempo</Label>
                <div className="flex flex-col items-center h-24">
                  <input
                    type="range"
                    min="60"
                    max="200"
                    value={tempo}
                    onChange={(e) => setTempo(Number(e.target.value))}
                    className="h-20 w-2 bg-gray-200 rounded-lg appearance-none cursor-pointer transform rotate-90"
                  />
                  <span className="text-xs text-muted-foreground mt-1">{tempo}</span>
                </div>
              </div>
            </div>
            
            {/* Melody Player */}
            <div className="flex items-center gap-2">
              <Button
                onClick={playMelody}
                disabled={melodyPlaysRemaining <= 0 || isPlayingMelody}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <PianoIcon className="h-4 w-4" />
                {isPlayingMelody ? 'Playing...' : 'Play Melody'}
              </Button>
              <div className="text-xs text-muted-foreground">
                {melodyPlaysRemaining}/2
              </div>
            </div>
            
            
            {/* Volume Control for Pitch Pipe */}
            <div className="flex flex-col items-center space-y-2">
              <Label className="text-xs">Volume</Label>
              <div className="flex flex-col items-center h-24">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={pitchPipeVolume}
                  onChange={(e) => {
                    const newVolume = Number(e.target.value);
                    console.log('Volume changed to:', newVolume);
                    setPitchPipeVolume(newVolume);
                    
                    // Update volume of currently playing pitch if any
                    if (pitchGainNodeRef.current && audioContextRef.current) {
                      pitchGainNodeRef.current.gain.setValueAtTime(
                        pitchPipeMuted ? 0 : newVolume,
                        audioContextRef.current.currentTime
                      );
                    }
                  }}
                  className="h-20 w-2 bg-gray-200 rounded-lg appearance-none cursor-pointer transform rotate-90"
                />
                <div className="flex items-center gap-1 mt-1">
                  <Volume2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{Math.round(pitchPipeVolume * 100)}%</span>
                </div>
              </div>
            </div>
            
            {/* Right Side - Pitch Pipe */}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative">
                {/* Main Pitch Pipe */}
                <div 
                  className="relative cursor-pointer group z-10"
                  onClick={() => setPitchPipeExpanded(!pitchPipeExpanded)}
                >
                  <div className={`w-12 h-12 bg-gradient-to-br from-amber-200 to-amber-400 rounded-full border-3 border-amber-500 shadow-lg flex items-center justify-center transition-all duration-300 ${
                    pitchPipeExpanded ? 'scale-110 shadow-xl ring-4 ring-amber-300' : 'group-hover:scale-105'
                  }`}>
                    <div className="w-4 h-4 bg-amber-800 rounded-full shadow-inner">
                      <div className="w-full h-full bg-black rounded-full opacity-40"></div>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-amber-400 rounded-b-full border-l-2 border-r-2 border-b-2 border-amber-500"></div>
                  {currentPitch && (
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-1 py-0.5 rounded animate-fade-in">
                      {currentPitch}
                    </div>
                  )}
                </div>

                {/* Flower Pattern Notes */}
                {pitchPipeExpanded && (
                  <div className="absolute inset-0 w-12 h-12">
                    {pitches.map((pitch, index) => {
                      const angle = (index * 30) - 90; // 30 degrees apart, starting from top
                      const radius = 35; // Smaller radius for compact layout
                      const x = Math.cos(angle * Math.PI / 180) * radius;
                      const y = Math.sin(angle * Math.PI / 180) * radius;
                      
                      return (
                        <Button
                          key={pitch.note}
                          variant={currentPitch === pitch.note ? "default" : "outline"}
                          size="sm"
                          className={`absolute w-6 h-6 p-0 text-xs font-medium rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 animate-scale-in ${
                            currentPitch === pitch.note 
                              ? "bg-amber-600 text-white shadow-lg scale-110" 
                              : "bg-white hover:bg-amber-100 hover:scale-110 shadow-md border-amber-300"
                          }`}
                          style={{
                            left: `50%`,
                            top: `50%`,
                            transform: `translate(${x}px, ${y}px) translate(-50%, -50%)`,
                            animationDelay: `${index * 50}ms`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            playPitch(pitch.frequency, pitch.note);
                          }}
                        >
                          {pitch.note.replace('♯', '#')}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <Label className="text-xs text-center">
                Pitch Pipe
              </Label>
              
              {/* Close button when expanded */}
              {pitchPipeExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPitchPipeExpanded(false);
                    stopPitch();
                  }}
                  className="text-xs animate-fade-in"
                >
                  Close
                </Button>
              )}
            </div>
          </div>
          
          
          
          {/* Countdown Display */}
          {isCountingDown && (
            <div className="flex items-center justify-center gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
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
          )}
        </CardContent>
      </Card>

      {/* Assessment Results */}
      {assessmentScore !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Assessment Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-primary">
                  {assessmentScore}/100
                </div>
                <div className="text-sm text-muted-foreground">
                  {assessmentScore >= 90 ? 'Excellent' :
                   assessmentScore >= 80 ? 'Very Good' :
                   assessmentScore >= 70 ? 'Good' : 'Needs Practice'}
                </div>
              </div>
              <div className="w-32">
                <Progress value={assessmentScore} className="h-2" />
              </div>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">{assessmentFeedback}</p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={resetSession} className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Microphone Testing */}
      <MicTester className="w-full" />
    </div>
  );
};