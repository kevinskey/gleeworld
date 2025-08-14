import React, { useState, useRef, useEffect, useCallback } from 'react';
import { OpenSheetMusicDisplay } from 'opensheetmusicdisplay';
import { MelodyPlayer, MelodyNote } from './MelodyPlayer';
import { SightSingingControls } from './SightSingingControls';
import { useMetronomeManager } from './MetronomeManager';
import { useRecordingManager } from './RecordingManager';
import './slider-styles.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Mic, GraduationCap, RotateCcw, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SightSingingPracticeProps {
  musicXML: string;
  exerciseMetadata: {
    key: string;
    timeSignature: string;
    difficulty: string;
    length: number;
    description?: string;
  };
  user?: any;
  onRecordingChange?: (isRecording: boolean) => void;
  onSolfegeChange?: (enabled: boolean) => void;
}

export const SightSingingPractice: React.FC<SightSingingPracticeProps> = ({
  musicXML,
  exerciseMetadata,
  user,
  onRecordingChange,
  onSolfegeChange
}) => {
  // Basic state
  const [tempo, setTempo] = useState(120);
  const [metronomeEnabled, setMetronomeEnabled] = useState(true);
  const [metronomeVolume, setMetronomeVolume] = useState(0.5);
  const [solfegeEnabled, setSolfegeEnabled] = useState(false);
  
  // Practice state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1);
  const [currentNote, setCurrentNote] = useState<MelodyNote | undefined>();
  const [melody, setMelody] = useState<any[]>([]);
  
  // Countdown state
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownBeats, setCountdownBeats] = useState(0);
  
  // Audio recording state
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentScore, setAssessmentScore] = useState<number | null>(null);
  const [assessmentFeedback, setAssessmentFeedback] = useState<string>('');
  const [detailedScores, setDetailedScores] = useState<any>(null);

  const { toast } = useToast();

  // Refs for audio components
  const melodyPlayerRef = useRef<MelodyPlayer | null>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const sheetMusicRef = useRef<HTMLDivElement>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize metronome manager
  const metronome = useMetronomeManager({
    tempo,
    volume: metronomeVolume,
    enabled: metronomeEnabled,
    timeSignature: exerciseMetadata.timeSignature,
  });

  // Initialize recording manager
  const recording = useRecordingManager({
    onRecordingComplete: (blob) => {
      setAudioBlob(blob);
      console.log('🎙️ Recording completed, blob size:', blob.size);
    },
    onRecordingStateChange: (isRecording) => {
      onRecordingChange?.(isRecording);
    }
  });

  // Generate preview URL for recorded audio
  useEffect(() => {
    if (!audioBlob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(audioBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [audioBlob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      metronome.cleanup();
      recording.cleanup();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Extract melody from musicXML when it changes
  useEffect(() => {
    console.log('=== MELODY EXTRACTION ===');
    const extractedMelody = extractMelodyFromMusicXML(musicXML);
    setMelody(extractedMelody);
    console.log('Extracted melody:', extractedMelody.length, 'notes');
    
    // Reset state when new exercise loads
    resetSession();
    
    if (onSolfegeChange) {
      onSolfegeChange(solfegeEnabled);
    }
  }, [musicXML, solfegeEnabled]);

  const initializeAudioSystem = useCallback(async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      melodyPlayerRef.current = new MelodyPlayer(audioContextRef.current);
      console.log('🎵 Audio system initialized');
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  const extractMelodyFromMusicXML = (xml: string): any[] => {
    if (!xml) return [];
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, 'text/xml');
      const notes = xmlDoc.querySelectorAll('note');
      
      const melody: any[] = [];
      let currentTime = 0;
      
      notes.forEach((note) => {
        const pitchElement = note.querySelector('pitch');
        if (pitchElement) {
          const step = pitchElement.querySelector('step')?.textContent || 'C';
          const octave = parseInt(pitchElement.querySelector('octave')?.textContent || '4');
          const alter = parseInt(pitchElement.querySelector('alter')?.textContent || '0');
          
          const duration = parseInt(note.querySelector('duration')?.textContent || '1');
          const durationType = note.querySelector('type')?.textContent || 'quarter';
          
          melody.push({
            pitch: { step, octave, alter },
            duration: duration,
            durationType: durationType,
            time: currentTime,
            solfege: getSolfege(step, alter)
          });
          
          currentTime += duration;
        }
      });
      
      return melody;
    } catch (error) {
      console.error('Error extracting melody:', error);
      return [];
    }
  };

  const getSolfege = (step: string, alter: number = 0): string => {
    const solfegeMap: { [key: string]: string } = {
      'C': 'Do', 'D': 'Re', 'E': 'Mi', 'F': 'Fa', 
      'G': 'Sol', 'A': 'La', 'B': 'Ti'
    };
    
    let solfege = solfegeMap[step] || 'Do';
    if (alter === 1) solfege += '#';
    if (alter === -1) solfege += '♭';
    
    return solfege;
  };

  const startCountdown = useCallback((callback: () => void) => {
    console.log('🎯 Starting countdown at tempo:', tempo);
    setIsCountingDown(true);
    setCountdownBeats(0);
    
    const [beatsPerMeasure] = exerciseMetadata.timeSignature.split('/').map(Number);
    const interval = 60000 / tempo;
    
    let beatCount = 0;
    
    // Start metronome for countdown
    if (metronomeEnabled) {
      metronome.start();
    }
    
    const countdownInterval = setInterval(() => {
      beatCount++;
      setCountdownBeats(beatCount);
      console.log(`Count-in beat ${beatCount}/${beatsPerMeasure}`);
      
      if (beatCount >= beatsPerMeasure) {
        clearInterval(countdownInterval);
        setIsCountingDown(false);
        console.log('✅ Countdown complete, continuing at', tempo, 'BPM');
        callback();
      }
    }, interval);
    
    toast({
      title: "Get Ready",
      description: `4-beat count-in starting at ${tempo} BPM`
    });
  }, [tempo, metronomeEnabled, exerciseMetadata.timeSignature, metronome, toast]);

  const handleStartPractice = useCallback(async () => {
    console.log('🎵 Starting practice at tempo:', tempo);
    
    try {
      await initializeAudioSystem();
      
      if (metronomeEnabled) {
        startCountdown(() => {
          startMelodyPlayback();
        });
      } else {
        startMelodyPlayback();
      }
    } catch (error) {
      console.error('❌ Error starting practice:', error);
      toast({
        title: "Practice Error",
        description: "Failed to start practice session",
        variant: "destructive"
      });
    }
  }, [tempo, metronomeEnabled, initializeAudioSystem, startCountdown, toast]);

  const startMelodyPlayback = useCallback(() => {
    if (!melodyPlayerRef.current || melody.length === 0) return;
    
    setIsPlaying(true);
    setPlaybackTime(0);
    setCurrentNoteIndex(0);
    
    // Convert melody to MelodyNote format for playback
    const melodyNotes: MelodyNote[] = melody.map((note, index) => ({
      note: note.pitch.step + note.pitch.octave,
      frequency: getFrequencyFromPitch(note.pitch),
      duration: (60 / tempo) * (note.duration / melody[0]?.duration || 1),
      time: note.time,
      velocity: 0.3
    }));
    
    melodyPlayerRef.current.loadMelody(melodyNotes);
    melodyPlayerRef.current.setTempo(tempo);
    melodyPlayerRef.current.start(tempo);
    
    // Start playback timer
    playbackTimerRef.current = setInterval(() => {
      setPlaybackTime(prev => prev + 1);
    }, 1000);
    
    console.log('🎵 Started melody playback with', melodyNotes.length, 'notes');
  }, [melody, tempo]);

  const handleStopPractice = useCallback(() => {
    console.log('🛑 Stopping practice');
    
    setIsPlaying(false);
    setPlaybackTime(0);
    setCurrentNoteIndex(-1);
    setCurrentNote(undefined);
    
    if (melodyPlayerRef.current) {
      melodyPlayerRef.current.stop();
    }
    
    if (metronome.isPlaying()) {
      metronome.stop();
    }
    
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  }, [metronome]);

  const handleStartRecording = useCallback(async () => {
    console.log('🎙️ Starting recording at tempo:', tempo);
    
    try {
      await initializeAudioSystem();
      
      if (metronomeEnabled) {
        startCountdown(() => {
          recording.startRecording();
        });
      } else {
        recording.startRecording();
      }
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Failed to start recording",
        variant: "destructive"
      });
    }
  }, [tempo, metronomeEnabled, initializeAudioSystem, startCountdown, recording, toast]);

  const handleStopRecording = useCallback(() => {
    recording.stopRecording();
    if (metronome.isPlaying()) {
      metronome.stop();
    }
  }, [recording, metronome]);

  const handleTempoChange = useCallback((newTempo: number) => {
    setTempo(newTempo);
    metronome.updateTempo(newTempo);
  }, [metronome]);

  const handleMetronomeToggle = useCallback((enabled: boolean) => {
    setMetronomeEnabled(enabled);
    if (!enabled && metronome.isPlaying()) {
      metronome.stop();
    }
  }, [metronome]);

  const handleMetronomeVolumeChange = useCallback((volume: number) => {
    setMetronomeVolume(volume);
    metronome.updateVolume(volume);
  }, [metronome]);

  const handleSolfegeToggle = useCallback((enabled: boolean) => {
    setSolfegeEnabled(enabled);
    if (onSolfegeChange) {
      onSolfegeChange(enabled);
    }
  }, [onSolfegeChange]);

  const resetSession = useCallback(() => {
    handleStopPractice();
    handleStopRecording();
    setAudioBlob(null);
    setAssessmentScore(null);
    setAssessmentFeedback('');
    setDetailedScores(null);
    setCountdownBeats(0);
    setIsCountingDown(false);
  }, [handleStopPractice, handleStopRecording]);

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
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('assess-sight-singing', {
          body: {
            audioData: base64Audio,
            exerciseMetadata,
            musicXML
          }
        });

        if (error) throw error;

        if (data.success) {
          setAssessmentScore(data.assessment.overallScore);
          setAssessmentFeedback(data.assessment.feedback);
          setDetailedScores(data.assessment.detailedScores);
          
          toast({
            title: "Assessment Complete",
            description: `Score: ${data.assessment.overallScore}/100`
          });
        } else {
          throw new Error(data.error || 'Assessment failed');
        }
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('❌ Assessment error:', error);
      toast({
        title: "Assessment Error",
        description: "Failed to assess your performance. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAssessing(false);
    }
  };

  const getFrequencyFromPitch = (pitch: any): number => {
    const noteFrequencies: { [key: string]: number } = {
      'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23,
      'G': 392.00, 'A': 440.00, 'B': 493.88
    };
    
    let frequency = noteFrequencies[pitch.step] || 440;
    
    // Adjust for octave
    const octaveDiff = pitch.octave - 4;
    frequency *= Math.pow(2, octaveDiff);
    
    // Adjust for alterations (sharps/flats)
    if (pitch.alter) {
      frequency *= Math.pow(2, pitch.alter / 12);
    }
    
    return frequency;
  };

  const downloadRecording = () => {
    if (!audioBlob) return;
    
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `sight-reading-recording-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="font-medium text-sm">Practice Controls</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {exerciseMetadata.key} • {exerciseMetadata.timeSignature} • {exerciseMetadata.difficulty}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Practice Controls */}
        <SightSingingControls
          isPlaying={isPlaying}
          onStartPractice={handleStartPractice}
          onStopPractice={handleStopPractice}
          isRecording={recording.isRecording}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          recordingTime={recording.recordingTime}
          tempo={tempo}
          onTempoChange={handleTempoChange}
          metronomeEnabled={metronomeEnabled}
          onMetronomeToggle={handleMetronomeToggle}
          metronomeVolume={metronomeVolume}
          onMetronomeVolumeChange={handleMetronomeVolumeChange}
          solfegeEnabled={solfegeEnabled}
          onSolfegeToggle={handleSolfegeToggle}
          countdownBeats={countdownBeats}
          isCountingDown={isCountingDown}
        />

        {/* Recording Playback */}
        {audioBlob && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              <span className="text-sm font-medium">Your Recording</span>
            </div>
            
            <div className="flex items-center gap-2">
              <audio 
                controls 
                src={previewUrl || undefined}
                className="flex-1 h-8"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={downloadRecording}
                className="h-8 px-2"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
            
            {user && (
              <div className="flex gap-2">
                <Button
                  onClick={submitForAssessment}
                  disabled={isAssessing}
                  size="sm"
                  className="flex-1 h-8"
                >
                  {isAssessing ? (
                    <>
                      <GraduationCap className="h-3 w-3 mr-1" />
                      Assessing...
                    </>
                  ) : (
                    <>
                      <GraduationCap className="h-3 w-3 mr-1" />
                      AI Assessment
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={resetSession}
                  size="sm"
                  className="h-8 px-2"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Assessment Results */}
        {assessmentScore !== null && (
          <div className="space-y-3 pt-3 border-t">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              <span className="text-sm font-medium">Assessment Results</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold">
                {assessmentScore}/100
              </div>
              <Badge variant={assessmentScore >= 80 ? "default" : assessmentScore >= 60 ? "secondary" : "destructive"} className="text-xs">
                {assessmentScore >= 80 ? "Excellent" : assessmentScore >= 60 ? "Good" : "Needs Practice"}
              </Badge>
            </div>
            
            {assessmentFeedback && (
              <div className="space-y-1">
                <h4 className="text-xs font-medium">Feedback</h4>
                <p className="text-xs text-muted-foreground">{assessmentFeedback}</p>
              </div>
            )}
            
            {detailedScores && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium">Detailed Scores</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span>Pitch:</span>
                    <span className="font-mono">{detailedScores.pitchAccuracy || 0}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rhythm:</span>
                    <span className="font-mono">{detailedScores.rhythmAccuracy || 0}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Intonation:</span>
                    <span className="font-mono">{detailedScores.intonation || 0}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fluency:</span>
                    <span className="font-mono">{detailedScores.fluency || 0}/100</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};