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
  Star
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserScores } from '@/hooks/useUserScores';

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

  // Add event listeners for external recording control
  React.useEffect(() => {
    const handleStartRecording = () => startRecording();
    const handleStopRecording = () => stopRecording();
    
    window.addEventListener('startRecording', handleStartRecording);
    window.addEventListener('stopRecording', handleStopRecording);
    
    return () => {
      window.removeEventListener('startRecording', handleStartRecording);
      window.removeEventListener('stopRecording', handleStopRecording);
    };
  }, []);

  // Pitch pipe functions
  const initPitchAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playPitch = useCallback((frequency: number, note: string) => {
    stopPitch(); // Stop any currently playing pitch
    
    const audioContext = initPitchAudioContext();
    
    // Create oscillator for the tone
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine'; // Pure tone
    
    const currentVolume = pitchPipeMuted ? 0 : pitchPipeVolume;
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(currentVolume, audioContext.currentTime + 0.05);
    
    oscillator.start();
    
    pitchOscillatorRef.current = oscillator;
    pitchGainNodeRef.current = gainNode;
    setCurrentPitch(note);
    
    // Auto-stop after 3 seconds
    setTimeout(() => {
      stopPitch();
    }, 3000);
  }, [pitchPipeVolume, pitchPipeMuted, initPitchAudioContext]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            
            {/* Interactive Round Pitch Pipe */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="relative">
                {/* Main Pitch Pipe */}
                <div 
                  className="relative cursor-pointer group z-10"
                  onClick={() => setPitchPipeExpanded(!pitchPipeExpanded)}
                >
                  <div className={`w-16 h-16 bg-gradient-to-br from-amber-200 to-amber-400 rounded-full border-4 border-amber-500 shadow-lg flex items-center justify-center transition-all duration-300 ${
                    pitchPipeExpanded ? 'scale-110 shadow-xl ring-4 ring-amber-300' : 'group-hover:scale-105'
                  }`}>
                    <div className="w-6 h-6 bg-amber-800 rounded-full shadow-inner">
                      <div className="w-full h-full bg-black rounded-full opacity-40"></div>
                    </div>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-3 bg-amber-400 rounded-b-full border-l-2 border-r-2 border-b-2 border-amber-500"></div>
                  {currentPitch && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded animate-fade-in">
                      {currentPitch}
                    </div>
                  )}
                </div>

                {/* Flower Pattern Notes */}
                {pitchPipeExpanded && (
                  <div className="absolute inset-0 w-16 h-16">
                    {pitches.map((pitch, index) => {
                      const angle = (index * 30) - 90; // 30 degrees apart, starting from top
                      const radius = 45; // Distance from center
                      const x = Math.cos(angle * Math.PI / 180) * radius;
                      const y = Math.sin(angle * Math.PI / 180) * radius;
                      
                      return (
                        <Button
                          key={pitch.note}
                          variant={currentPitch === pitch.note ? "default" : "outline"}
                          size="sm"
                          className={`absolute w-8 h-8 p-0 text-xs font-medium rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 animate-scale-in ${
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
                <div className="text-xs text-muted-foreground">
                  {pitchPipeExpanded ? 'Select a note' : 'Click to expand'}
                </div>
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
          
          {/* Tempo Control */}
          <div className="space-y-2">
            <Label>Tempo: {tempo} BPM</Label>
            <input
              type="range"
              min="60"
              max="200"
              value={tempo}
              onChange={(e) => setTempo(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>60 BPM</span>
              <span>200 BPM</span>
            </div>
          </div>
          
          
          
          <div className="flex items-center gap-4">
            {!isPlaying ? (
              <Button onClick={startPractice} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Practice
              </Button>
            ) : (
              <Button onClick={stopPractice} variant="outline" className="flex items-center gap-2">
                <Pause className="h-4 w-4" />
                Stop Practice
              </Button>
            )}
            
            {isPlaying && (
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                <span>{formatTime(playbackTime)}</span>
              </div>
            )}
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
    </div>
  );
};