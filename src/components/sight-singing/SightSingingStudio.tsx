import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Knob } from '@/components/ui/knob';
import { useToast } from '@/hooks/use-toast';
import { Download, Play, Pause, Volume2, VolumeX } from 'lucide-react';

// Import all the components
import { ParameterForm } from './ParameterForm';
import { ScoreDisplay } from './ScoreDisplay';
import { PlaybackControls } from './PlaybackControls';
import { RecordingControls } from './RecordingControls';
import { GradingResults } from './GradingResults';
import { ErrorVisualization } from './ErrorVisualization';
import { PerformanceReport } from './PerformanceReport';
import { ScoreLibraryManager } from './ScoreLibraryManager';
import { ScoreHistoryView } from './ScoreHistoryView';
import { PitchPipe } from './PitchPipe';
import { AssignmentCreator } from './AssignmentCreator';
import { RecordingShareDialog } from './RecordingShareDialog';

// Import hooks
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useTonePlayback } from './hooks/useTonePlayback';
import { HarmonyControls, HarmonySettings } from './HarmonyControls';
import { useGrading } from './hooks/useGrading';
import { useMetronome } from './hooks/useMetronome';
import { useAudioCombiner } from './hooks/useAudioCombiner';
import { useUserScores } from '@/hooks/useUserScores';
import { useRecordings } from '@/hooks/useRecordings';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ParsedScore, ParsedMeasure, ParsedNote } from './utils/musicXMLParser';

// Import types and utilities
import { supabase } from '@/integrations/supabase/client';

// Note frequencies for conversion
const NOTE_FREQUENCIES: { [key: string]: number } = {
  'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.00, 'A': 440.00, 'B': 493.88
};

export interface ExerciseParameters {
  key: { tonic: string; mode: string };
  time: { num: number; den: 1|2|4|8|16 };
  numMeasures: number;
  parts: Array<{ role: string; range: { min: string; max: string } }>;
  allowedDur: Array<'whole'|'half'|'quarter'|'eighth'|'16th'>;
  allowDots: boolean;
  allowAccidentals: boolean;
  intervalMotion: Array<'step'|'skip'|'leap'|'repeat'>;
  cadenceEvery: number;
  bpm: number;
  title: string;
  rhythmicPreferences?: {
    prefer24TiedEighths?: boolean;
    avoidWeakBeatQuarters?: boolean;
  };
  // Voice leading and cadence parameters
  cadenceType?: 'authentic' | 'half' | 'plagal' | 'deceptive';
  enforceVoiceLeading?: boolean;
  requireResolution?: boolean;
  strongBeatCadence?: boolean;
  maxInterval?: number;
  stepwiseMotionPercentage?: number;
}

export interface ScoreJSON {
  key: { tonic: string; mode: "major"|"minor" };
  time: { num: number; den: 1|2|4|8|16 };
  numMeasures: number;
  parts: Array<{
    role: "S"|"A";
    range: { min: string; max: string };
    measures: Array<Array<{
      kind: "note"|"rest";
      dur: { base: "whole"|"half"|"quarter"|"eighth"|"16th"; dots: 0|1|2 };
      pitch?: { step: "A"|"B"|"C"|"D"|"E"|"F"|"G"; alter: -1|0|1; oct: number };
      tie?: "start"|"stop"|"continue";
    }>>;
  }>;
  cadencePlan: Array<{
    bar: number;
    cadence: "PAC"|"IAC"|"HC"|"PL"|"DC";
    sopranoHint?: number[];
  }>;
}

// Helper function to convert ScoreJSON to ParsedScore format
const convertScoreJSONToParsedScore = (scoreJSON: ScoreJSON, tempo: number): ParsedScore => {
  console.log('🔄 Converting ScoreJSON to ParsedScore...');
  
  if (!scoreJSON.parts || scoreJSON.parts.length === 0) {
    console.warn('⚠️ No parts found in score');
    return {
      measures: [],
      tempo: tempo,
      timeSignature: { beats: 4, beatType: 4 },
      totalDuration: 0
    };
  }

  const part = scoreJSON.parts[0]; // Use first part
  const measures: ParsedMeasure[] = [];
  let currentTime = 0;
  
  // Duration mapping (in quarter note units)
  const durationMap = {
    'whole': 4,
    'half': 2,
    'quarter': 1,
    'eighth': 0.5,
    '16th': 0.25
  };
  
  const beatDuration = 60 / tempo; // Duration of one quarter note in seconds
  
  part.measures.forEach((measureNotes, measureIndex) => {
    const notes: ParsedNote[] = [];
    let measureTime = 0;
    
    measureNotes.forEach((noteData) => {
      if (noteData.kind === 'note' && noteData.pitch) {
        const baseDuration = durationMap[noteData.dur.base] || 1;
        const dotMultiplier = noteData.dur.dots === 1 ? 1.5 : noteData.dur.dots === 2 ? 1.75 : 1;
        const durationInQuarters = baseDuration * dotMultiplier;
        const durationInSeconds = durationInQuarters * beatDuration;
        
        // Calculate frequency
        let frequency = NOTE_FREQUENCIES[noteData.pitch.step] || 440;
        if (noteData.pitch.alter) {
          frequency *= Math.pow(2, noteData.pitch.alter / 12); // Adjust for sharps/flats
        }
        if (noteData.pitch.oct !== 4) {
          frequency *= Math.pow(2, (noteData.pitch.oct - 4)); // Adjust for octave
        }
        
        notes.push({
          step: noteData.pitch.step,
          octave: noteData.pitch.oct,
          frequency: frequency,
          duration: durationInSeconds,
          startTime: currentTime + measureTime
        });
        
        measureTime += durationInSeconds;
      } else if (noteData.kind === 'rest') {
        // Handle rests by advancing time
        const baseDuration = durationMap[noteData.dur.base] || 1;
        const dotMultiplier = noteData.dur.dots === 1 ? 1.5 : noteData.dur.dots === 2 ? 1.75 : 1;
        const durationInQuarters = baseDuration * dotMultiplier;
        const durationInSeconds = durationInQuarters * beatDuration;
        measureTime += durationInSeconds;
      }
    });
    
    measures.push({
      number: measureIndex + 1,
      notes: notes
    });
    
    currentTime += measureTime;
  });
  
  const result = {
    measures: measures,
    tempo: tempo,
    timeSignature: { beats: scoreJSON.time.num, beatType: scoreJSON.time.den },
    totalDuration: currentTime
  };
  
  console.log('✅ Conversion complete:', {
    measuresCount: result.measures.length,
    totalDuration: result.totalDuration,
    tempo: result.tempo
  });
  
  return result;
};

export const SightSingingStudio: React.FC = () => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentScore, setCurrentScore] = useState<ScoreJSON | null>(null);
  const [currentMusicXML, setCurrentMusicXML] = useState<string>('');
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);
  const [currentBpm, setCurrentBpm] = useState(120);
  const [activeTab, setActiveTab] = useState<'practice' | 'library' | 'history' | 'report'>('practice');
  const [parameters, setParameters] = useState<ExerciseParameters | null>(null);
  const [soundSettings, setSoundSettings] = useState({ notes: 'piano', click: 'woodblock' });
  const [selectedScore, setSelectedScore] = useState<any>(null);
  const [transportBusy, setTransportBusy] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<any>(null);
  const [exerciseKey, setExerciseKey] = useState<string>('');
  const lastClickAtRef = useRef(0);

  const { 
    isRecording, 
    recordingDuration, 
    audioBlob, 
    startRecording, 
    stopRecording, 
    clearRecording,
    setMetronomeCallback 
  } = useAudioRecorder();
  
  const { combineAudio, isProcessing: isCombiningAudio } = useAudioCombiner();
  const [combinedAudioUrl, setCombinedAudioUrl] = useState<string | null>(null);
  const [isPlayingCombined, setIsPlayingCombined] = useState(false);
  const combinedAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const { uploadRecordingFromBlob, shareRecording } = useRecordings();

  const { 
    isPlaying, 
    mode, 
    setMode, 
    startPlayback, 
    stopPlayback 
  }: {
    isPlaying: boolean;
    mode: 'click-only' | 'click-and-score' | 'pitch-only';
    setMode: (mode: 'click-only' | 'click-and-score' | 'pitch-only') => void;
    startPlayback: (musicXML: string, tempo: number, overrideMode?: 'click-only' | 'click-and-score' | 'pitch-only') => Promise<void>;
    stopPlayback: () => void;
  } = useTonePlayback(soundSettings);

  const {
    gradingResults,
    isGrading,
    gradeRecording
  } = useGrading();

  const {
    isPlaying: metronomeIsPlaying,
    startMetronome,
    stopMetronome,
    volume: metronomeVolume,
    setVolume: setMetronomeVolume,
    tempo: metronomeTempo,
    setTempo: setMetronomeTempo,
    updateTempo: updateMetronomeTempo
  } = useMetronome();

  // Connect metronome to audio recorder - set once only
  useEffect(() => {
    const metronomeController = async (bpm: number) => {
      if (bpm > 0) {
        await startMetronome(bpm);
      } else {
        stopMetronome();
      }
    };
    
    setMetronomeCallback(metronomeController);
  }, []); // Empty deps - set once only

  // Combined audio playback controls
  const handlePlayCombined = async () => {
    if (!combinedAudioUrl) {
      console.error('❌ No combined audio URL available');
      toast({
        title: "No Combined Audio",
        description: "Please combine audio first before playing.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('🎵 Playing combined audio using Web Audio API...');
    
    try {
      // Stop any currently playing combined audio
      if (combinedAudioRef.current) {
        combinedAudioRef.current.pause();
        combinedAudioRef.current.currentTime = 0;
      }
      
      if (isPlayingCombined) {
        setIsPlayingCombined(false);
        return;
      }
      
      // Use Web Audio API to play the audio to bypass CSP restrictions
      const audioContext = new AudioContext();
      
      let audioBuffer: ArrayBuffer;
      
      if (combinedAudioUrl.startsWith('data:')) {
        // Convert data URL to array buffer
        const base64Data = combinedAudioUrl.split(',')[1];
        const binaryString = atob(base64Data);
        audioBuffer = new ArrayBuffer(binaryString.length);
        const uint8Array = new Uint8Array(audioBuffer);
        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i);
        }
      } else {
        // Fetch blob URL
        const response = await fetch(combinedAudioUrl);
        audioBuffer = await response.arrayBuffer();
      }
      
      // Decode audio data
      const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
      
      // Create audio source
      const source = audioContext.createBufferSource();
      source.buffer = decodedAudio;
      source.connect(audioContext.destination);
      
      setIsPlayingCombined(true);
      
      // Handle playback end
      source.onended = () => {
        console.log('🎵 Combined audio playback ended');
        setIsPlayingCombined(false);
        audioContext.close();
      };
      
      // Start playback
      source.start(0);
      console.log('✅ Combined audio playback started using Web Audio API');
      
      // Store reference for stopping
      combinedAudioRef.current = {
        pause: () => {
          source.stop();
          setIsPlayingCombined(false);
          audioContext.close();
        },
        currentTime: 0
      } as any;
      
    } catch (error) {
      console.error('❌ Error playing combined audio with Web Audio API:', error);
      setIsPlayingCombined(false);
      toast({
        title: "Playback Failed",
        description: "Could not play combined audio. Please try downloading instead.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadCombined = () => {
    if (!combinedAudioUrl) return;
    
    // For data URLs, we need to create a blob URL for download
    if (combinedAudioUrl.startsWith('data:')) {
      // Convert data URL back to blob for download
      const byteCharacters = atob(combinedAudioUrl.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'audio/wav' });
      const downloadUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'sight-reading-exercise-with-recording.wav';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the temporary URL
      URL.revokeObjectURL(downloadUrl);
    } else {
      // Fallback for blob URLs
      const link = document.createElement('a');
      link.href = combinedAudioUrl;
      link.download = 'sight-reading-exercise-with-recording.wav';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    toast({
      title: "Download Started",
      description: "Your combined audio file is being downloaded.",
    });
  };

  useEffect(() => {
    return () => {
      if (combinedAudioRef.current) {
        combinedAudioRef.current.pause();
      }
      if (combinedAudioUrl) {
        URL.revokeObjectURL(combinedAudioUrl);
      }
    };
  }, [combinedAudioUrl]);

  const handleReset = () => {
    setCurrentScore(null);
    setCurrentMusicXML('');
    setCurrentExerciseId(null);
    setCurrentBpm(120);
    clearRecording();
    stopPlayback();
    stopMetronome(); // Ensure metronome is stopped on reset
    // Clear grading results (using gradeRecording hook)
    
    toast({
      title: "Exercise Reset",
      description: "All exercise data has been cleared",
    });
  };

  const handleGenerateExercise = async (exerciseParams: ExerciseParameters) => {
    setIsGenerating(true);
    setCurrentBpm(exerciseParams.bpm);
    setParameters(exerciseParams);
    setSelectedScore(null); // Clear selected score when generating new exercise
    
    // Clear previous exercise to ensure fresh generation
    setCurrentScore(null);
    setCurrentMusicXML('');
    setCurrentExerciseId(null);
    
    // Add rhythmic preferences based on time signature
    const enhancedParams = {
      ...exerciseParams,
      rhythmicPreferences: {
        prefer24TiedEighths: exerciseParams.time.num === 2 && exerciseParams.time.den === 4,
        avoidWeakBeatQuarters: exerciseParams.time.num === 2 && exerciseParams.time.den === 4,
      }
    };
    
    try {
      console.log('🏗️ Generating exercise with params:', enhancedParams);
      console.log('🏗️ Timestamp for uniqueness:', Date.now());
      
      // Add timestamp + random component to ensure unique requests
      const uniqueId = Date.now() + Math.floor(Math.random() * 10000);
      const { data, error } = await supabase.functions.invoke('generate-musicxml', {
        body: {
          ...enhancedParams,
          requestId: uniqueId, // Add unique identifier to prevent caching
          randomSeed: Math.random(), // Add random seed for AI generation
          forceRefresh: uniqueId // Additional parameter to force refresh
        }
      });

      console.log('🏗️ Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: "Generation Failed",
          description: error.message || "Failed to generate exercise",
          variant: "destructive",
        });
        return;
      }

      if (data.success) {
        console.log('✅ Exercise generated successfully:', {
          hasJSON: !!data.json,
          hasMusicXML: !!data.musicXML,
          musicXMLLength: data.musicXML?.length,
          exerciseId: data.exerciseId,
          firstNote: data.json?.parts?.[0]?.measures?.[0]?.[0]?.pitch,
          fullFirstMeasure: data.json?.parts?.[0]?.measures?.[0],
          requestIdFromResponse: data.requestId
        });
        
        // Log the actual MusicXML content to verify it's changing
        console.log('🎼 MusicXML preview (first 200 chars):', data.musicXML?.substring(0, 200));
        
        // Force component update by setting a new key based on timestamp
        const newExerciseKey = `exercise-${Date.now()}-${Math.random()}`;
        console.log('🔄 Setting new exercise with key:', newExerciseKey);
        
        // Clear previous state completely before setting new one
        setCurrentScore(null);
        setCurrentMusicXML('');
        setExerciseKey(''); // Clear the key first
        
        // Use setTimeout to ensure state is cleared before setting new values
        setTimeout(() => {
          setCurrentScore(data.json);
          setCurrentMusicXML(data.musicXML);
          setCurrentExerciseId(data.exerciseId);
          setExerciseKey(newExerciseKey); // Set new key to force re-render
          
          console.log('🎯 State updated with new exercise. Key:', newExerciseKey);
        }, 10);
        
        toast({
          title: "Exercise Generated",
          description: "Your sight-singing exercise is ready!",
        });
      } else {
        console.error('❌ Generation failed:', data);
        throw new Error(data.message || 'Generation failed');
      }
    } catch (error) {
      console.error('Error generating exercise:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate exercise. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Safe start helper to manage playback transitions
  const safeStart = useCallback(async (desiredMode: 'click-only' | 'click-and-score' | 'pitch-only') => {
    const now = Date.now();
    if (now - lastClickAtRef.current < 250) {
      console.log('⚠️ Throttling click - too soon since last click');
      return;
    }
    lastClickAtRef.current = now;
    
    if (transportBusy) {
      console.log('⚠️ Transport busy, ignoring click');
      return;
    }
    
    if (!currentMusicXML) {
      console.error('❌ No currentMusicXML available for playback');
      toast({
        title: "No Exercise",
        description: "Please generate an exercise first.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('🚀 safeStart called with mode:', desiredMode);
    setTransportBusy(true);
    
    try {
      // Stop any recording first
      if (isRecording) {
        stopRecording();
        stopMetronome();
      }
      
      // Stop any existing playback
      stopPlayback();
      
      // Update mode and start playback
      setMode(desiredMode);
      await startPlayback(currentMusicXML, currentBpm, desiredMode);
      console.log('✅ safeStart completed successfully');
    } catch (error) {
      console.error('❌ safeStart error:', error);
      toast({
        title: "Playback Failed",
        description: "Failed to start playback",
        variant: "destructive",
      });
    } finally {
      setTransportBusy(false);
    }
  }, [currentMusicXML, currentBpm, transportBusy, isRecording, stopRecording, stopMetronome, stopPlayback, startPlayback, setMode, toast]);

  const handleStartPlayback = async () => {
    console.log('🔥 DEPRECATED: handleStartPlayback called - use safeStart instead');
    await safeStart(mode);
  };

  const handleStartRecording = async () => {
    if (!currentMusicXML) {
      toast({
        title: "No Exercise",
        description: "Please generate an exercise or select a score first.",
        variant: "destructive",
      });
      return;
    }

    // Stop any existing recording/playback first
    stopRecording();
    stopPlayback();
    
    try {
      await startRecording(currentBpm);
    } catch (error) {
      console.error('❌ Recording error:', error);
      toast({
        title: "Recording Failed",
        description: "Failed to start recording.",
        variant: "destructive",
      });
    }
  };

  const handleStopRecording = async () => {
    stopRecording();
    stopMetronome();
  };

  const handleClearAll = () => {
    clearRecording();
    setCombinedAudioUrl(null);
    setIsPlayingCombined(false);
    if (combinedAudioRef.current) {
      combinedAudioRef.current.pause();
      combinedAudioRef.current.currentTime = 0;
    }
  };

  const handleGradeRecording = async () => {
    if (!audioBlob || !currentMusicXML) {
      toast({
        title: "Missing Data",
        description: "Please record a performance first.",
        variant: "destructive",
      });
      return;
    }

    try {
      let results;
      if (currentScore) {
        // Generated exercise - use the ScoreJSON
        results = await gradeRecording(audioBlob, currentScore, currentBpm);
      } else {
        // Uploaded XML - we need to convert or create a dummy ScoreJSON
        // For now, create a minimal ScoreJSON that will work with the grading function
        const dummyScore: ScoreJSON = {
          key: { tonic: "C", mode: "major" },
          time: { num: 4, den: 4 },
          numMeasures: 1,
          parts: [{
            role: "S",
            range: { min: "C4", max: "C5" },
            measures: [[{
              kind: "note",
              dur: { base: "quarter", dots: 0 },
              pitch: { step: "C", alter: 0, oct: 4 }
            }]]
          }],
          cadencePlan: []
        };
        results = await gradeRecording(audioBlob, dummyScore, currentBpm);
      }
      
      // Auto-save the recording to gw_recordings
      try {
        const recordingTitle = selectedScore?.title || parameters?.title || 'Sight Reading Practice';
        const savedRecording = await uploadRecordingFromBlob(audioBlob, {
          title: recordingTitle,
          description: `Grade: ${results.letter} (${Math.round(results.overall * 100)}%)`,
          associated_sheet_music_id: selectedScore?.id || null,
          quality: 'practice',
          grading_results: JSON.parse(JSON.stringify(results)),
          duration: recordingDuration || 0,
        });

        if (savedRecording) {
          setCurrentRecording(savedRecording);
          toast({
            title: "Recording Saved & Graded",
            description: `Grade: ${results.letter} (${Math.round(results.overall * 100)}%)`,
          });
        }
      } catch (saveError) {
        console.error('Failed to save recording:', saveError);
        toast({
          title: "Graded Successfully",
          description: `Grade: ${results.letter} (${Math.round(results.overall * 100)}%) - Recording save failed`,
        });
      }
      
      // Store submission if we have an exercise ID (legacy support)
      if (currentExerciseId && results) {
        try {
          // Convert audio blob to base64 for storage
          const arrayBuffer = await audioBlob.arrayBuffer();
          const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
          
          const { data: { user } } = await supabase.auth.getUser();
          
          // Store score in gw_scores table
          const scorePercentage = Math.round(results.overall * 100);
          const { error: scoreError } = await supabase
            .from('gw_scores')
            .insert({
              user_id: user?.id,
              sheet_music_id: selectedScore?.id || null, // Link to selected score if any
              score_value: scorePercentage,
              max_score: 100,
              performance_date: new Date().toISOString(),
              notes: `Pitch: ${Math.round(results.pitchAcc * 100)}%, Rhythm: ${Math.round(results.rhythmAcc * 100)}%, BPM: ${currentBpm}`,
              recorded_by: user?.id
            });

          if (scoreError) {
            console.error('Failed to store score:', scoreError);
          }

          // Store detailed submission if we have an exercise ID
          const { error: submissionError } = await supabase
            .from('submissions')
            .insert({
              exercise_id: currentExerciseId,
              user_id: user?.id,
              bpm: currentBpm,
              audio_url: `data:audio/webm;base64,${base64Audio}`,
              overall: results.overall,
              letter: results.letter,
              metrics: {
                pitchAcc: results.pitchAcc,
                rhythmAcc: results.rhythmAcc,
                restAcc: results.restAcc,
                perNote: results.perNote,
                debug: results.debug
              }
            });

          if (submissionError) {
            console.error('Failed to store submission:', submissionError);
          }
        } catch (storageError) {
          console.error('Storage error:', storageError);
        }
      }

      // After grading, automatically combine the audio
      if (audioBlob && (currentScore || currentMusicXML)) {
        console.log('🎵 Auto-combining audio after grading...');
        
        let parsedScore: ParsedScore;
        
        if (currentScore) {
          // Generated exercise - convert from ScoreJSON
          console.log('📊 Using generated exercise score:', {
            score: currentScore,
            parts: currentScore.parts?.length,
            measures: currentScore.parts?.[0]?.measures?.length,
            tempo: currentBpm
          });
          parsedScore = convertScoreJSONToParsedScore(currentScore, currentBpm);
        } else if (currentMusicXML) {
          // Uploaded MusicXML file - parse directly
          console.log('📊 Using uploaded MusicXML file for audio combination');
          const { parseMusicXML } = await import('./utils/musicXMLParser');
          parsedScore = parseMusicXML(currentMusicXML, currentBpm);
        } else {
          console.error('❌ No score data available for audio combination');
          return;
        }
        
        console.log('📊 Parsed score for combiner:', parsedScore);
        
        try {
          const combinedResult = await combineAudio(audioBlob, parsedScore, selectedScore?.title || 'Sight-Reading Exercise');
          console.log('✅ Audio combination result:', combinedResult);
          if (combinedResult) {
            setCombinedAudioUrl(combinedResult.downloadUrl);
            console.log('✅ Combined audio URL set:', combinedResult.downloadUrl);
          } else {
            console.warn('⚠️ Audio combination returned null result');
          }
        } catch (combineError) {
          console.error('❌ Audio combination failed:', combineError);
        }
      } else {
        console.log('⚠️ Skipping audio combination - missing data:', {
          hasAudioBlob: !!audioBlob,
          hasCurrentScore: !!currentScore
        });
      }
      
    } catch (error) {
      console.error('Grading error:', error);
      toast({
        title: "Grading Failed",
        description: "Failed to analyze your performance.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadMusicXML = () => {
    if (!currentMusicXML) {
      toast({
        title: "No Exercise",
        description: "Please generate an exercise first.",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([currentMusicXML], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sight-singing-${new Date().toISOString().split('T')[0]}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Download Started",
      description: "Your MusicXML file is downloading.",
    });
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50 px-4 lg:px-8 xl:px-12 py-6">
      <div className="h-full flex flex-col gap-6">
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'practice' | 'library' | 'history' | 'report')} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="practice">Practice Studio</TabsTrigger>
            <TabsTrigger value="library">Score Library</TabsTrigger>
            <TabsTrigger value="history">Score History</TabsTrigger>
            <TabsTrigger value="report" disabled={!gradingResults || !currentMusicXML}>Performance Report</TabsTrigger>
          </TabsList>

          <TabsContent value="practice" className="mt-3">
            {/* Main Content */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
              {/* Left Column - Parameters & Controls (1/3 width on desktop, full width on mobile) */}
               <div className="lg:col-span-1 col-span-1">
                 {/* Parameters */}
                 <Card className="p-4">
                   <h2 className="text-sm font-semibold mb-3 flex-shrink-0">Parameters</h2>
                   <div>
                     <ParameterForm 
                       onGenerate={handleGenerateExercise}
                       isGenerating={isGenerating}
                       onReset={handleReset}
                       hasExercise={!!currentMusicXML}
                     />
                   </div>
                 </Card>
               </div>

              {/* Right Column - Score Display (2/3 width on desktop, full width on mobile) */}
              {currentMusicXML && (
                <div className="lg:col-span-2 col-span-1 order-first lg:order-last">
                  <Card className="p-3 lg:p-4 min-h-[500px] flex flex-col shadow-2xl border-2 bg-white">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h2 className="text-base font-semibold">Musical Score</h2>
                    {currentMusicXML && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDownloadMusicXML}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Download XML
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Download the current exercise as a MusicXML file</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  
                  <div className="flex-1 min-h-0 relative">
                    {/* Pitch Pipe Component */}
                    <div className="mb-3 flex-shrink-0">
                      <PitchPipe />
                    </div>
                    
                    {/* Transport Controls - Standard Container */}
                    {currentMusicXML && (
                      <div className="mb-4 bg-card border rounded-lg shadow-md p-3 lg:p-4">
                        <div className="responsive-grid-3 items-center gap-3 lg:gap-4"
                             style={{ gridTemplateColumns: '1fr auto 1fr' }}>
                          {/* Sound Selectors */}
                          <div className="flex items-center gap-2 lg:gap-3 order-1">
                            <Select 
                              value={soundSettings.notes} 
                              onValueChange={(value) => setSoundSettings(prev => ({ ...prev, notes: value }))}
                            >
                              <SelectTrigger className="h-8 lg:h-10 w-24 lg:w-28 text-xs lg:text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-background border shadow-lg z-50">
                                <SelectItem value="piano">🎹 Piano</SelectItem>
                                <SelectItem value="flute">🎵 Flute</SelectItem>
                                <SelectItem value="xylophone">🎶 Xylophone</SelectItem>
                                <SelectItem value="synth">🎛️ Synth</SelectItem>
                              </SelectContent>
                            </Select>
                            <Select 
                              value={soundSettings.click} 
                              onValueChange={(value) => setSoundSettings(prev => ({ ...prev, click: value }))}
                            >
                              <SelectTrigger className="h-8 lg:h-10 w-24 lg:w-28 text-xs lg:text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-background border shadow-lg z-50">
                                <SelectItem value="woodblock">🥁 Wood</SelectItem>
                                <SelectItem value="beep">📢 Beep</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Divider - hidden on mobile */}
                          <div className="hidden lg:block h-8 w-px bg-border"></div>

                          {/* Play Mode Buttons */}
                          <div className="flex items-center gap-1 lg:gap-2 order-2 lg:order-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant={isPlaying && mode === 'click-and-score' ? "default" : "outline"}
                                  onClick={() => {
                                    console.log('🔥 CLICK: Notes+Click button clicked');
                                    if (isPlaying && mode === 'click-and-score') {
                                      stopPlayback();
                                    } else {
                                      safeStart('click-and-score');
                                    }
                                  }}
                                  disabled={!currentMusicXML || isRecording || transportBusy}
                                  className="h-10 lg:h-12 px-2 lg:px-4 text-sm lg:text-base font-semibold"
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="text-base lg:text-lg">♪</span>
                                    <span className="text-xs">+</span>
                                    <span className="text-base lg:text-lg">♩</span>
                                  </div>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Play both notes and metronome clicks</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant={isPlaying && mode === 'click-only' ? "default" : "outline"}
                                  onClick={() => {
                                    console.log('🔥 CLICK: Click-only button clicked');
                                    if (isPlaying && mode === 'click-only') {
                                      stopPlayback();
                                    } else {
                                      safeStart('click-only');
                                    }
                                  }}
                                  disabled={!currentMusicXML || isRecording || transportBusy}
                                  className="h-10 lg:h-12 px-2 lg:px-4 text-lg lg:text-xl"
                                >
                                  ♩
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Play metronome clicks only (no melody)</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant={isPlaying && mode === 'pitch-only' ? "default" : "outline"}
                                  onClick={() => {
                                    console.log('🔥 CLICK: Pitch-only button clicked');
                                    if (isPlaying && mode === 'pitch-only') {
                                      stopPlayback();
                                    } else {
                                      safeStart('pitch-only');
                                    }
                                  }}
                                  disabled={!currentMusicXML || isRecording || transportBusy}
                                  className="h-10 lg:h-12 px-2 lg:px-4 text-lg lg:text-xl"
                                >
                                  ♪
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Play melody notes only (no clicks)</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          {/* Metronome/BPM Controls */}
                          <div className="flex items-center gap-4 order-4 lg:order-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Knob
                                    value={currentBpm}
                                    onValueChange={(newBpm) => {
                                      setCurrentBpm(newBpm);
                                      updateMetronomeTempo(newBpm);
                                    }}
                                    min={60}
                                    max={180}
                                    step={5}
                                    size="sm"
                                    label="BPM"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Adjust tempo (60-180 BPM) - updates live during playback</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Knob
                                    value={metronomeVolume}
                                    onValueChange={setMetronomeVolume}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    size="sm"
                                    label="VOL"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Control metronome volume - adjusts live during recording</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>

                          {/* Divider - hidden on mobile */}
                          <div className="hidden lg:block h-8 w-px bg-border"></div>

                          {/* Control Buttons */}
                          <div className="flex items-center gap-1 lg:gap-2 order-3 lg:order-4">
                            {/* Record Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant={isRecording ? "destructive" : "outline"}
                                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                                  className="h-10 lg:h-12 w-10 lg:w-12 p-0"
                                >
                                  {isRecording ? (
                                    <div className="h-3 lg:h-4 w-3 lg:w-4 bg-white rounded-sm" />
                                  ) : (
                                    <div className="h-4 lg:h-5 w-4 lg:w-5 bg-red-500 rounded-full" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{isRecording ? 'Stop recording' : 'Start recording your performance'}</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Stop Button */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    stopPlayback();
                                    if (isRecording) handleStopRecording();
                                  }}
                                  className="h-10 lg:h-12 w-10 lg:w-12 p-0"
                                  disabled={!isPlaying && !isRecording}
                                >
                                  <div className="h-3 lg:h-4 w-3 lg:w-4 bg-current" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Stop all playback and recording</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* Audio Playback Button */}
                            {audioBlob && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const audio = new Audio(URL.createObjectURL(audioBlob));
                                      audio.play();
                                    }}
                                    className="h-10 lg:h-12 w-10 lg:w-12 p-0"
                                  >
                                    <Volume2 className="h-4 lg:h-5 w-4 lg:w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Play back your recorded performance</p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <ScoreDisplay
                      key={exerciseKey} // Force re-render when exerciseKey changes
                      musicXML={currentMusicXML}
                      onGradeRecording={handleGradeRecording}
                      hasRecording={!!audioBlob}
                      isGrading={isGrading}
                    />
                    
                           {/* Inline grading results summary */}
                    {gradingResults && (
                      <Card className="mt-6">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold mb-2">Latest Performance Results</h4>
                              <div className="flex items-center gap-4 text-sm">
                                <Badge variant="outline" className="bg-primary/10">
                                  Overall: {Math.round(gradingResults.overall * 100)}%
                                </Badge>
                                <span className="text-muted-foreground">
                                  Pitch: {Math.round(gradingResults.pitchAcc * 100)}% | 
                                  Rhythm: {Math.round(gradingResults.rhythmAcc * 100)}% | 
                                  Rest: {Math.round(gradingResults.restAcc * 100)}%
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {currentRecording && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setShareDialogOpen(true)}
                                >
                                  Share Recording
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setActiveTab('report')}
                              >
                                View Full Report
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </Card>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="library" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Left Column - Score Library */}
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">📚 Import Your XML Files</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Upload your MusicXML files here. Once loaded, you can create assignments for students.
                  </p>
                </div>
                
                <ScoreLibraryManager 
                  onScoreSelect={(score) => {
                    console.log('📚 Loading imported score for assignment creation:', score);
                    setSelectedScore(score);
                    if (score.xml_content) {
                      setCurrentMusicXML(score.xml_content);
                      setCurrentExerciseId(`library-${score.id}`);
                      setCurrentScore(null);
                      setCurrentBpm(120);
                      
                      toast({
                        title: "Score Selected",
                        description: `"${score.title}" selected. You can now create an assignment from it.`,
                      });
                    } else {
                      toast({
                        title: "No XML Content",
                        description: "This score needs XML content to create assignments. Please upload an XML file for this score.",
                        variant: "destructive",
                      });
                    }
                  }}
                  selectedScoreId={selectedScore?.id}
                />
              </div>
              
              {/* Right Column - Assignment Creator */}
              <div className="space-y-4">
                <AssignmentCreator 
                  selectedScore={selectedScore}
                  onAssignmentCreated={() => {
                    toast({
                      title: "Assignment Created",
                      description: "Students can now access this assignment through their member dashboard.",
                    });
                  }}
                />
                
                {selectedScore && currentMusicXML && (
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                      <h4 className="font-medium text-green-900 dark:text-green-100">Score Selected</h4>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <strong>"{selectedScore.title}"</strong> by {selectedScore.composer || 'Unknown'} is ready.
                    </p>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      Fill out the assignment details to create an assignment for your students.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ScoreHistoryView />
          </TabsContent>

          <TabsContent value="report" className="mt-6">
            {gradingResults && currentMusicXML && parameters && (
              <PerformanceReport
                musicXML={currentMusicXML}
                gradingResults={gradingResults}
                exerciseParams={{
                  difficulty: "Advanced", // This should come from parameters
                  keySignature: `${parameters.key.tonic} ${parameters.key.mode}`,
                  timeSignature: `${parameters.time.num}/${parameters.time.den}`,
                  voiceRange: parameters.parts[0]?.role || "S",
                  bpm: parameters.bpm
                }}
                timestamp={new Date()}
              />
            )}
          </TabsContent>
        </Tabs>
        
        {/* Recording Share Dialog */}
        {currentRecording && (
          <RecordingShareDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            recording={currentRecording}
            onShare={async (userIds) => {
              await shareRecording(currentRecording.id, userIds);
            }}
          />
        )}
      </div>
    </div>
    </TooltipProvider>
  );
};