import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Mic, MicOff, Download, Share2, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ParameterForm } from './ParameterForm';
import { ScoreDisplay } from './ScoreDisplay';
import { PlaybackControls } from './PlaybackControls';
import { RecordingControls } from './RecordingControls';
import { EvaluationDisplay } from './EvaluationDisplay';
import { RecordingsList } from './RecordingsList';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { useMetronome } from './hooks/useMetronome';
import { useTonePlayback } from './hooks/useTonePlayback';
import { supabase } from '@/integrations/supabase/client';

export interface ExerciseParameters {
  keySignature: string;
  timeSignature: string;
  tempo: number;
  measures: number;
  register: 'soprano' | 'alto' | 'tenor' | 'bass';
  pitchRangeMin: string;
  pitchRangeMax: string;
  motionTypes: string[];
  noteLengths: string[];
  difficultyLevel: number;
  title?: string;
}

export interface GeneratedExercise {
  id?: string;
  musicXML: string;
  parameters: ExerciseParameters;
}

export interface Recording {
  id: string;
  exerciseId: string;
  audioUrl: string;
  duration: number;
  createdAt: string;
}

export interface Evaluation {
  id: string;
  recordingId: string;
  pitchAccuracy: number;
  rhythmAccuracy: number;
  perMeasureData: any[];
  feedback: string;
  strengths?: string[];
  areasForImprovement?: string[];
}

export const SightSingingStudio: React.FC = () => {
  const { toast } = useToast();
  
  // State management
  const [currentStep, setCurrentStep] = useState<'parameters' | 'score' | 'record' | 'evaluate'>('parameters');
  const [generatedExercise, setGeneratedExercise] = useState<GeneratedExercise | null>(null);
  const [currentRecording, setCurrentRecording] = useState<Recording | null>(null);
  const [currentEvaluation, setCurrentEvaluation] = useState<Evaluation | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  
  // Audio hooks
  const {
    isRecording,
    recordingDuration,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording
  } = useAudioRecorder();
  
  const {
    isPlaying: metronomeIsPlaying,
    startMetronome,
    stopMetronome,
    volume: metronomeVolume,
    setVolume: setMetronomeVolume
  } = useMetronome();
  
  const {
    isPlaying: playbackIsPlaying,
    startPlayback,
    stopPlayback,
    mode: playbackMode,
    setMode: setPlaybackMode
  } = useTonePlayback();

  // Load recordings on mount
  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('sight_singing_recordings')
        .select(`
          id,
          exercise_id,
          audio_file_path,
          duration_seconds,
          created_at,
          sight_singing_exercises(title)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedRecordings: Recording[] = data.map(record => ({
        id: record.id,
        exerciseId: record.exercise_id,
        audioUrl: `https://oopmlreysjzuxzylyheb.supabase.co/storage/v1/object/public/sight-singing-recordings/${record.audio_file_path}`,
        duration: record.duration_seconds,
        createdAt: record.created_at
      }));

      setRecordings(formattedRecordings);
    } catch (error) {
      console.error('Error loading recordings:', error);
      toast({
        title: "Error",
        description: "Failed to load recordings",
        variant: "destructive"
      });
    }
  };

  const handleGenerateExercise = async (parameters: ExerciseParameters) => {
    setIsGenerating(true);
    try {
      // First test the OpenAI API
      console.log('Testing OpenAI API...');
      const testResponse = await supabase.functions.invoke('test-openai');
      console.log('Test response:', testResponse);
      
      if (testResponse.error) {
        throw new Error(`API Test Failed: ${testResponse.error.message}`);
      }

      console.log('OpenAI API test successful, generating exercise...');
      const { data, error } = await supabase.functions.invoke('generate-musicxml', {
        body: parameters
      });

      if (error) throw error;

      const exercise: GeneratedExercise = {
        musicXML: data.musicXML,
        parameters
      };

      setGeneratedExercise(exercise);
      setCurrentStep('score');
      
      toast({
        title: "Exercise Generated!",
        description: "Your sight-singing exercise is ready to practice.",
      });
    } catch (error) {
      console.error('Error generating exercise:', error);
      toast({
        title: "Generation Failed",
        description: `Failed to generate exercise: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartRecording = async () => {
    if (!generatedExercise) return;

    // Start with 4-click count-off
    const clickInterval = (60 / generatedExercise.parameters.tempo) * 1000; // ms per beat
    let clickCount = 0;

    const countOff = setInterval(() => {
      // Play metronome click
      clickCount++;
      
      if (clickCount >= 4) {
        clearInterval(countOff);
        // Start actual recording after count-off
        startRecording();
      }
    }, clickInterval);

    toast({
      title: "Recording Starting...",
      description: "4-click count-off, then recording begins",
    });
  };

  const handleStopRecording = async () => {
    if (!audioBlob || !generatedExercise) return;

    try {
      // Convert audio blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...uint8Array));

      // Store recording
      const { data, error } = await supabase.functions.invoke('store-recording', {
        body: {
          exerciseId: generatedExercise.id,
          audioBase64: base64,
          durationSeconds: recordingDuration
        }
      });

      if (error) throw error;

      const newRecording: Recording = {
        id: data.recordingId,
        exerciseId: generatedExercise.id!,
        audioUrl: data.publicUrl,
        duration: recordingDuration,
        createdAt: new Date().toISOString()
      };

      setCurrentRecording(newRecording);
      setRecordings(prev => [newRecording, ...prev]);
      setCurrentStep('evaluate');

      toast({
        title: "Recording Saved!",
        description: "Ready for evaluation",
      });
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save recording. Please try again.",
        variant: "destructive"
      });
    }
    
    stopRecording();
  };

  const handleEvaluateRecording = async () => {
    if (!currentRecording || !generatedExercise || !audioBlob) return;

    setIsEvaluating(true);
    try {
      // Convert audio blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...uint8Array));

      const { data, error } = await supabase.functions.invoke('evaluate-singing', {
        body: {
          musicXML: generatedExercise.musicXML,
          audioBase64: base64,
          exerciseId: generatedExercise.id,
          recordingId: currentRecording.id
        }
      });

      if (error) throw error;

      const evaluation: Evaluation = {
        id: data.id || 'temp-id',
        recordingId: currentRecording.id,
        pitchAccuracy: data.pitch_accuracy,
        rhythmAccuracy: data.rhythm_accuracy,
        perMeasureData: data.per_measure || [],
        feedback: data.feedback,
        strengths: data.strengths || [],
        areasForImprovement: data.areas_for_improvement || []
      };

      setCurrentEvaluation(evaluation);

      toast({
        title: "Evaluation Complete!",
        description: `Pitch: ${evaluation.pitchAccuracy}% | Rhythm: ${evaluation.rhythmAccuracy}%`,
      });
    } catch (error) {
      console.error('Error evaluating recording:', error);
      toast({
        title: "Evaluation Failed",
        description: "Failed to evaluate recording. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleShare = async () => {
    if (!currentRecording || !currentEvaluation || !generatedExercise) return;

    try {
      const shareToken = `${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from('sight_singing_shares')
        .insert({
          exercise_id: generatedExercise.id,
          recording_id: currentRecording.id,
          evaluation_id: currentEvaluation.id,
          share_token: shareToken,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      const shareUrl = `${window.location.origin}/sight-singing/share/${shareToken}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(shareUrl);
      
      toast({
        title: "Share Link Created!",
        description: "Link copied to clipboard",
      });
    } catch (error) {
      console.error('Error creating share link:', error);
      toast({
        title: "Share Failed",
        description: "Failed to create share link",
        variant: "destructive"
      });
    }
  };

  const resetStudio = () => {
    setCurrentStep('parameters');
    setGeneratedExercise(null);
    setCurrentRecording(null);
    setCurrentEvaluation(null);
    clearRecording();
    stopMetronome();
    stopPlayback();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Sight-Singing Studio</h1>
          <p className="text-muted-foreground">
            Generate, practice, record, and evaluate sight-singing exercises
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {currentStep !== 'parameters' && (
            <Button variant="outline" onClick={resetStudio}>
              <RotateCcw className="h-4 w-4 mr-2" />
              New Exercise
            </Button>
          )}
          
          {currentEvaluation && (
            <Button onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Results
            </Button>
          )}
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-4">
        {['parameters', 'score', 'record', 'evaluate'].map((step, index) => (
          <div key={step} className="flex items-center">
            <Badge 
              variant={currentStep === step ? 'default' : 
                      ['parameters', 'score', 'record', 'evaluate'].indexOf(currentStep) > index ? 'secondary' : 'outline'}
            >
              {index + 1}. {step.charAt(0).toUpperCase() + step.slice(1)}
            </Badge>
            {index < 3 && <div className="w-8 h-0.5 bg-border mx-2" />}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {currentStep === 'parameters' && (
            <ParameterForm
              onGenerate={handleGenerateExercise}
              isGenerating={isGenerating}
            />
          )}

          {currentStep === 'score' && generatedExercise && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Exercise</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScoreDisplay musicXML={generatedExercise.musicXML} />
                
                <div className="flex items-center gap-4">
                  <PlaybackControls
                    musicXML={generatedExercise.musicXML}
                    tempo={generatedExercise.parameters.tempo}
                    timeSignature={generatedExercise.parameters.timeSignature}
                    isPlaying={playbackIsPlaying}
                    onPlay={startPlayback}
                    onStop={stopPlayback}
                    mode={playbackMode}
                    onModeChange={setPlaybackMode}
                  />
                  
                  <Button onClick={() => setCurrentStep('record')}>
                    <Mic className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 'record' && generatedExercise && (
            <Card>
              <CardHeader>
                <CardTitle>Recording Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScoreDisplay musicXML={generatedExercise.musicXML} />
                
                <RecordingControls
                  isRecording={isRecording}
                  duration={recordingDuration}
                  onStartRecording={handleStartRecording}
                  onStopRecording={handleStopRecording}
                  hasRecording={!!audioBlob}
                  onClearRecording={clearRecording}
                />

                {audioBlob && (
                  <div className="flex items-center gap-4">
                    <Button onClick={() => setCurrentStep('evaluate')}>
                      Evaluate Recording
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 'evaluate' && currentRecording && (
            <Card>
              <CardHeader>
                <CardTitle>Evaluation Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!currentEvaluation ? (
                  <div className="text-center py-8">
                    <Button
                      onClick={handleEvaluateRecording}
                      disabled={isEvaluating}
                      size="lg"
                    >
                      {isEvaluating ? 'Evaluating...' : 'Analyze Performance'}
                    </Button>
                  </div>
                ) : (
                  <EvaluationDisplay evaluation={currentEvaluation} />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metronome Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Metronome</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant={metronomeIsPlaying ? "destructive" : "default"}
                  size="sm"
                  onClick={metronomeIsPlaying ? stopMetronome : () => startMetronome(generatedExercise?.parameters.tempo || 120)}
                >
                  {metronomeIsPlaying ? (
                    <>
                      <Square className="h-3 w-3 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      Start
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMetronomeVolume(metronomeVolume > 0 ? 0 : 0.5)}
                >
                  {metronomeVolume > 0 ? (
                    <Volume2 className="h-3 w-3" />
                  ) : (
                    <VolumeX className="h-3 w-3" />
                  )}
                </Button>
              </div>
              
              {generatedExercise && (
                <div className="text-xs text-muted-foreground">
                  Tempo: {generatedExercise.parameters.tempo} BPM
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Recordings */}
          <RecordingsList
            recordings={recordings}
            onPlayRecording={(recording) => {
              // Play recording logic
              const audio = new Audio(recording.audioUrl);
              audio.play();
            }}
            onDeleteRecording={async (recordingId) => {
              try {
                const { error } = await supabase
                  .from('sight_singing_recordings')
                  .delete()
                  .eq('id', recordingId);

                if (error) throw error;

                setRecordings(prev => prev.filter(r => r.id !== recordingId));
                
                toast({
                  title: "Recording Deleted",
                  description: "Recording has been removed",
                });
              } catch (error) {
                console.error('Error deleting recording:', error);
                toast({
                  title: "Delete Failed",
                  description: "Failed to delete recording",
                  variant: "destructive"
                });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};