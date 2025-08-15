import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { ParameterForm } from './ParameterForm';
import { ScoreDisplay } from './ScoreDisplay';
import { PlaybackControls } from './PlaybackControls';
import { RecordingControls } from './RecordingControls';
import { GradingResults } from './GradingResults';
import { ErrorVisualization } from './ErrorVisualization';
import { PerformanceReport } from './PerformanceReport';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useTonePlayback } from './hooks/useTonePlayback';
import { useGrading } from './hooks/useGrading';
import { useMetronome } from './hooks/useMetronome';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export const SightSingingStudio: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentScore, setCurrentScore] = useState<ScoreJSON | null>(null);
  const [currentMusicXML, setCurrentMusicXML] = useState<string>('');
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);
  const [currentBpm, setCurrentBpm] = useState(120);
  const [activeTab, setActiveTab] = useState<'practice' | 'report'>('practice');
  const [parameters, setParameters] = useState<ExerciseParameters | null>(null);

  const { 
    isRecording, 
    recordingDuration, 
    audioBlob, 
    startRecording, 
    stopRecording, 
    clearRecording,
    setMetronomeCallback 
  } = useAudioRecorder();

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
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'practice' | 'report')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="practice">Practice Studio</TabsTrigger>
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
                      onClearRecording={clearRecording}
                    />
                    
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
                <Card className="p-6 min-h-[500px] lg:h-full flex flex-col">
                  <h2 className="text-base font-semibold mb-2 flex-shrink-0">Musical Score</h2>
                  <div className="flex-1 min-h-[400px]">
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