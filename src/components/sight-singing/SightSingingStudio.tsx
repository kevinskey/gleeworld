import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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

// Import hooks
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useTonePlayback } from './hooks/useTonePlayback';
import { useGrading } from './hooks/useGrading';
import { useMetronome } from './hooks/useMetronome';
import { useAudioCombiner } from './hooks/useAudioCombiner';
import { ParsedScore, ParsedMeasure, ParsedNote } from './utils/musicXMLParser';

// Import types and utilities
import { supabase } from '@/integrations/supabase/client';

// Note frequencies for conversion
const NOTE_FREQUENCIES: { [key: string]: number } = {
  'C': 261.63, 'D': 293.66, 'E': 329.63, 'F': 349.23, 'G': 392.00, 'A': 440.00, 'B': 493.88
};

export interface ExerciseParameters {
  key: { tonic: string; mode: "major"|"minor" };
  time: { num: number; den: 1|2|4|8|16 };
  numMeasures: number;
  parts: Array<{ role: "S"|"A"; range: { min: string; max: string } }>;
  allowedDur: Array<"whole"|"half"|"quarter"|"eighth"|"16th">;
  allowDots: boolean;
  allowAccidentals: boolean;
  intervalMotion: Array<"step"|"skip"|"leap"|"repeat">;
  cadenceEvery: number;
  bpm: number;
  title: string;
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
  const [selectedScore, setSelectedScore] = useState<any>(null);

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

  const { 
    isPlaying, 
    mode, 
    setMode, 
    startPlayback, 
    stopPlayback 
  } = useTonePlayback();

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
    setTempo: setMetronomeTempo
  } = useMetronome();

  // Connect metronome to audio recorder with reset capability
  useEffect(() => {
    const metronomeController = (bpm: number) => {
      if (bpm > 0) {
        console.log('Starting metronome at BPM:', bpm);
        stopMetronome(); // Stop any existing metronome first
        setTimeout(() => startMetronome(bpm), 100); // Small delay to ensure clean start
      } else {
        console.log('Stopping metronome');
        stopMetronome();
      }
    };
    
    setMetronomeCallback(metronomeController);
  }, [setMetronomeCallback, startMetronome, stopMetronome]);

  // Combined audio playback controls
  const handlePlayCombined = () => {
    if (!combinedAudioUrl) return;
    
    if (!combinedAudioRef.current) {
      combinedAudioRef.current = new Audio(combinedAudioUrl);
      combinedAudioRef.current.onended = () => setIsPlayingCombined(false);
    }
    
    if (isPlayingCombined) {
      combinedAudioRef.current.pause();
      setIsPlayingCombined(false);
    } else {
      combinedAudioRef.current.play();
      setIsPlayingCombined(true);
    }
  };

  const handleDownloadCombined = () => {
    if (!combinedAudioUrl) return;
    
    const link = document.createElement('a');
    link.href = combinedAudioUrl;
    link.download = 'sight-reading-exercise-with-recording.webm';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
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
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-musicxml', {
        body: exerciseParams
      });

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
        setCurrentScore(data.json);
        setCurrentMusicXML(data.musicXML);
        setCurrentExerciseId(data.exerciseId);
        
        toast({
          title: "Exercise Generated",
          description: "Your sight-singing exercise is ready!",
        });
      } else {
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

  const handleStartPlayback = async () => {
    if (!currentMusicXML) {
      toast({
        title: "No Exercise",
        description: "Please generate an exercise first.",
        variant: "destructive",
      });
      return;
    }

    try {
      await startPlayback(currentMusicXML, currentBpm);
    } catch (error) {
      console.error('Playback error:', error);
      toast({
        title: "Playback Failed",
        description: "Failed to start playback.",
        variant: "destructive",
      });
    }
  };

  const handleStartRecording = async () => {
    if (!currentScore) {
      toast({
        title: "No Exercise",
        description: "Please generate an exercise first.",
        variant: "destructive",
      });
      return;
    }

    console.log('🎯 handleStartRecording called with BPM:', currentBpm);
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
    if (!audioBlob || !currentScore) {
      toast({
        title: "Missing Data",
        description: "Please record a performance first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const results = await gradeRecording(audioBlob, currentScore, currentBpm);
      
      // Store submission if we have an exercise ID
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
          } else {
            toast({
              title: "Results Saved",
              description: `Grade: ${results.letter} (${Math.round(results.overall * 100)}%)`,
            });
          }
        } catch (storageError) {
          console.error('Storage error:', storageError);
          // Don't fail grading if storage fails
          toast({
            title: "Graded Successfully",
            description: `Grade: ${results.letter} (${Math.round(results.overall * 100)}%)`,
          });
        }
      }

      // After grading, automatically combine the audio
      if (audioBlob && currentScore) {
        console.log('🎵 Auto-combining audio after grading...');
        console.log('📊 Current score data:', {
          score: currentScore,
          parts: currentScore.parts?.length,
          measures: currentScore.parts?.[0]?.measures?.length,
          tempo: currentBpm
        });
        
        // Convert ScoreJSON to ParsedScore format for the audio combiner
        const parsedScore = convertScoreJSONToParsedScore(currentScore, currentBpm);
        
        console.log('📊 Parsed score for combiner:', parsedScore);
        
        try {
          const combinedResult = await combineAudio(audioBlob, parsedScore, 'Sight-Reading Exercise');
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

          <TabsContent value="practice" className="mt-6">
            {/* Main Content */}
            <div className="flex-1 grid gap-6 grid-cols-1 lg:grid-cols-3 min-h-0">
              {/* Left Column - Parameters & Controls (1/3 width on desktop, full width on mobile) */}
              <div className="lg:col-span-1 col-span-1 flex flex-col gap-4">
                {/* Parameters */}
                <Card className="p-4 flex-shrink-0">
                  <h2 className="text-sm font-semibold mb-3 flex-shrink-0">Parameters</h2>
                  <div className="max-h-96 overflow-y-auto">
                    <ParameterForm 
                      onGenerate={handleGenerateExercise}
                      isGenerating={isGenerating}
                      onReset={handleReset}
                      hasExercise={!!currentMusicXML}
                    />
                  </div>
                </Card>

                {/* Playback Controls */}
                <Card className="p-4 flex-shrink-0">
                  <h2 className="text-sm font-semibold mb-3">Playback</h2>
                  <PlaybackControls
                    isPlaying={isPlaying}
                    mode={mode}
                    onModeChange={setMode}
                    onStartPlayback={handleStartPlayback}
                    onStopPlayback={stopPlayback}
                    onDownload={handleDownloadMusicXML}
                    hasExercise={!!currentMusicXML}
                  />
                </Card>

                {/* Recording Controls */}
                <Card className="p-4 flex-1 flex flex-col">
                  <h2 className="text-sm font-semibold mb-3 flex-shrink-0">Recording</h2>
                  <div className="flex-1 flex flex-col min-h-0">
                    <RecordingControls
                      isRecording={isRecording}
                      duration={recordingDuration}
                      onStartRecording={handleStartRecording}
                      onStopRecording={handleStopRecording}
                      hasRecording={!!audioBlob}
                      onClearRecording={handleClearAll}
                    />
                    
                    {/* Combined Audio Controls */}
                    {combinedAudioUrl && (
                      <div className="mt-4 pt-3 border-t flex-shrink-0">
                        <h3 className="text-xs font-medium mb-2">Combined Audio</h3>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handlePlayCombined}
                            disabled={isCombiningAudio}
                            className="flex-1"
                          >
                            {isPlayingCombined ? (
                              <><Pause className="h-3 w-3 mr-1" /> Pause</>
                            ) : (
                              <><Play className="h-3 w-3 mr-1" /> Play Combined</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDownloadCombined}
                            disabled={isCombiningAudio}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Download
                          </Button>
                        </div>
                        {isCombiningAudio && (
                          <div className="text-xs text-muted-foreground mt-2">
                            Combining audio...
                          </div>
                        )}
                      </div>
                    )}
                    
                    {gradingResults && (
                      <div className="mt-4 pt-3 border-t flex-shrink-0 space-y-3">
                        <h3 className="text-xs font-medium mb-2">Results</h3>
                        <div className="text-xs">
                          <GradingResults results={gradingResults} />
                        </div>
                        <div className="text-xs">
                          <ErrorVisualization results={gradingResults} />
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Right Column - Score Display (2/3 width on desktop, full width on mobile) */}
              <div className="lg:col-span-2 col-span-1 order-first lg:order-last">
                <Card className="p-4 lg:p-6 h-[600px] lg:h-full flex flex-col">
                  <h2 className="text-base font-semibold mb-3 flex-shrink-0">Musical Score</h2>
                  
                  {/* Pitch Pipe Component */}
                  <div className="mb-4 flex-shrink-0">
                    <PitchPipe />
                  </div>
                  
                  <div className="flex-1 min-h-0">
                    <ScoreDisplay
                      musicXML={currentMusicXML}
                      onGradeRecording={handleGradeRecording}
                      hasRecording={!!audioBlob}
                      isGrading={isGrading}
                    />
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="library" className="mt-6">
            <ScoreLibraryManager 
              onScoreSelect={(score) => {
                setSelectedScore(score);
                if (score.xml_content) {
                  setCurrentMusicXML(score.xml_content);
                  setActiveTab('practice');
                }
              }}
              selectedScoreId={selectedScore?.id}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ScoreHistoryView selectedScoreId={selectedScore?.id} />
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
      </div>
    </div>
  );
};