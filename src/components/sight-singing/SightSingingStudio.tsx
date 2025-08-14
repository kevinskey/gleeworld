import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ParameterForm } from './ParameterForm';
import { ScoreDisplay } from './ScoreDisplay';
import { PlaybackControls } from './PlaybackControls';
import { RecordingControls } from './RecordingControls';
import { GradingResults } from './GradingResults';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useTonePlayback } from './hooks/useTonePlayback';
import { useGrading } from './hooks/useGrading';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface ExerciseParameters {
  key: { tonic: string; mode: "major"|"minor" };
  time: { num: number; den: 1|2|4|8|16 };
  numMeasures: number;
  parts: Array<{ role: "S"|"A"; range: { min: string; max: string } }>;
  allowedDur: Array<"whole"|"half"|"quarter"|"eighth"|"16th">;
  allowDots: boolean;
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

  const { 
    isRecording, 
    recordingDuration, 
    audioBlob, 
    startRecording, 
    stopRecording, 
    clearRecording 
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

  const handleReset = () => {
    setCurrentScore(null);
    setCurrentMusicXML('');
    setCurrentExerciseId(null);
    setCurrentBpm(120);
    clearRecording();
    stopPlayback();
    
    toast({
      title: "Exercise Reset",
      description: "All exercise data has been cleared",
    });
  };

  const handleGenerateExercise = async (parameters: ExerciseParameters) => {
    setIsGenerating(true);
    setCurrentBpm(parameters.bpm);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-musicxml', {
        body: parameters
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

    try {
      await startRecording();
    } catch (error) {
      console.error('Recording error:', error);
      toast({
        title: "Recording Failed",
        description: "Failed to start recording.",
        variant: "destructive",
      });
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
    <div className="h-screen bg-background p-4 overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="text-center mb-4 flex-shrink-0">
          <h1 className="text-2xl font-bold text-foreground mb-1">Sight-Singing Studio</h1>
          <p className="text-sm text-muted-foreground">Generate, practice, and evaluate sight-singing exercises</p>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid gap-4 grid-cols-4 min-h-0">
          {/* Left Column - Parameters (1/4 width) */}
          <div className="col-span-1">
            <Card className="p-3 h-full flex flex-col">
              <h2 className="text-base font-semibold mb-2 flex-shrink-0">Parameters</h2>
              <div className="flex-1 overflow-y-auto min-h-0">
                <ParameterForm 
                  onGenerate={handleGenerateExercise}
                  isGenerating={isGenerating}
                  onReset={handleReset}
                  hasExercise={!!currentMusicXML}
                />
              </div>
            </Card>
          </div>

          {/* Middle Column - Score Display (2/4 width) */}
          <div className="col-span-2">
            <Card className="p-4 h-full flex flex-col">
              <h2 className="text-base font-semibold mb-2 flex-shrink-0">Musical Score</h2>
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

          {/* Right Column - Combined Controls (1/4 width) */}
          <div className="col-span-1 flex flex-col gap-3">
            {/* Playback Controls */}
            <Card className="p-3 flex-1 flex flex-col">
              <h2 className="text-base font-semibold mb-2 flex-shrink-0">Playback</h2>
              <div className="flex-1">
                <PlaybackControls
                  isPlaying={isPlaying}
                  mode={mode}
                  onModeChange={setMode}
                  onStartPlayback={handleStartPlayback}
                  onStopPlayback={stopPlayback}
                  onDownload={handleDownloadMusicXML}
                  hasExercise={!!currentMusicXML}
                />
              </div>
            </Card>

            {/* Recording & Results Combined */}
            <Card className="p-3 flex-1 flex flex-col">
              <h2 className="text-base font-semibold mb-2 flex-shrink-0">Recording</h2>
              <div className="flex-1 flex flex-col space-y-2">
                <RecordingControls
                  isRecording={isRecording}
                  duration={recordingDuration}
                  onStartRecording={handleStartRecording}
                  onStopRecording={stopRecording}
                  hasRecording={!!audioBlob}
                  onClearRecording={clearRecording}
                />
                
                {gradingResults && (
                  <div className="pt-2 border-t flex-shrink-0">
                    <h3 className="text-xs font-medium mb-1">Results</h3>
                    <div className="text-xs">
                      <GradingResults results={gradingResults} />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};