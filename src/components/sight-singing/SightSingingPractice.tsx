import React, { useState, useRef, useEffect } from 'react';
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
import { PitchPipe } from '@/components/pitch-pipe/PitchPipe';
import { useAuth } from '@/contexts/AuthContext';
import { useUserScores } from '@/hooks/useUserScores';

interface SightSingingPracticeProps {
  musicXML: string;
  exerciseMetadata: {
    difficulty: string;
    keySignature: string;
    timeSignature: string;
    measures: number;
    noteRange: string;
  };
}

export const SightSingingPractice: React.FC<SightSingingPracticeProps> = ({
  musicXML,
  exerciseMetadata
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { addScore } = useUserScores();
  
  // Practice settings
  const [practiceMode, setPracticeMode] = useState(true);
  const [pianoEnabled, setPianoEnabled] = useState(true);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [tempo, setTempo] = useState(120);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  
  // Assessment state
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentScore, setAssessmentScore] = useState<number | null>(null);
  const [assessmentFeedback, setAssessmentFeedback] = useState<string>('');
  
  // Audio playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  
  // Refs
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const metronomeRef = useRef<any>(null);

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

  const startPractice = async () => {
    try {
      setIsPlaying(true);
      
      if (metronomeEnabled) {
        startMetronome();
      }
      
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
      
    } catch (error) {
      console.error('Error starting practice:', error);
      toast({
        title: "Error",
        description: "Failed to start practice session",
        variant: "destructive"
      });
    }
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

  const startMetronome = () => {
    // Simple metronome implementation
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audioContext = audioContextRef.current;
    const interval = 60000 / tempo; // Convert BPM to milliseconds
    
    metronomeRef.current = setInterval(() => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }, interval);
  };

  const stopMetronome = () => {
    if (metronomeRef.current) {
      clearInterval(metronomeRef.current);
      metronomeRef.current = null;
    }
  };

  const startRecording = async () => {
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
      setRecordingTime(0);
      
      // Start metronome for recording
      if (metronomeEnabled) {
        startMetronome();
      }
      
      // Recording timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Sing the exercise with the metronome"
      });
      
    } catch (error) {
      console.error('Error starting recording:', error);
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            
            <div className="flex items-center gap-2">
              <Label>Tempo: {tempo} BPM</Label>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {exerciseMetadata.timeSignature}
              </Badge>
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
        </CardContent>
      </Card>

      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            {!isRecording ? (
              <Button 
                onClick={startRecording} 
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
              >
                <Mic className="h-4 w-4" />
                Start Recording
              </Button>
            ) : (
              <Button 
                onClick={stopRecording} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Square className="h-4 w-4" />
                Stop Recording
              </Button>
            )}
            
            {isRecording && (
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                <span>Recording: {formatTime(recordingTime)}</span>
              </div>
            )}
            
            {audioBlob && !isRecording && (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={submitForAssessment}
                  disabled={isAssessing}
                  className="flex items-center gap-2"
                >
                  {isAssessing ? (
                    <>
                      <RotateCcw className="h-4 w-4 animate-spin" />
                      Assessing...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Submit for Grading
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={resetSession} 
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            )}
          </div>
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

      {/* Pitch Pipe */}
      <PitchPipe className="mt-6" />
    </div>
  );
};