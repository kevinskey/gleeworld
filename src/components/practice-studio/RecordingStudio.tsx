import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Upload, 
  Award,
  Clock,
  CheckCircle,
  AlertTriangle,
  Volume2
} from 'lucide-react';
import { useAudioRecorder } from '@/components/sight-singing/hooks/useAudioRecorder';
import { useGrading } from '@/components/sight-singing/hooks/useGrading';
import { useAssignments } from '@/hooks/useAssignments';
import { useToast } from '@/hooks/use-toast';
import { ScoreDisplay } from '@/components/sight-singing/ScoreDisplay';

interface RecordingStudioProps {
  assignment: any;
  onSubmissionComplete: () => void;
}

export const RecordingStudio: React.FC<RecordingStudioProps> = ({ 
  assignment, 
  onSubmissionComplete 
}) => {
  const { toast } = useToast();
  const { submitAssignment } = useAssignments();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [playbackAudio, setPlaybackAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  
  const {
    isRecording,
    recordingDuration,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  const {
    gradingResults,
    isGrading,
    gradeRecording
  } = useGrading();

  // Format recording duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle recording playback
  const handlePlayRecording = () => {
    if (!audioBlob) return;

    if (isPlayingRecording && playbackAudio) {
      playbackAudio.pause();
      setIsPlayingRecording(false);
      return;
    }

    const audio = new Audio(URL.createObjectURL(audioBlob));
    audio.onended = () => setIsPlayingRecording(false);
    audio.play();
    setPlaybackAudio(audio);
    setIsPlayingRecording(true);
  };

  // Handle AI grading
  const handleGradeRecording = async () => {
    if (!audioBlob) {
      toast({
        title: "Cannot Grade Recording",
        description: "Recording data is missing.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create a simple score structure for grading
      const scoreData = {
        key: { tonic: 'C', mode: 'major' as const },
        time: { num: 4, den: 4 as const },
        numMeasures: 4,
        parts: [{
          role: 'S' as const,
          range: { min: 'C4', max: 'C5' },
          measures: [[]]
        }],
        cadencePlan: []
      };
      
      await gradeRecording(audioBlob, scoreData, 120);
      
      toast({
        title: "Grading Complete",
        description: "Your recording has been evaluated by AI.",
      });
    } catch (error) {
      console.error('Grading error:', error);
      toast({
        title: "Grading Failed",
        description: "Unable to grade the recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle submission
  const handleSubmit = async () => {
    if (!audioBlob) {
      toast({
        title: "No Recording",
        description: "Please record your performance before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Convert audio blob to file
      const audioFile = new File([audioBlob], 'recording.wav', { type: 'audio/wav' });
      
      await submitAssignment(assignment.id, {
        notes: submissionNotes
      });
      
      toast({
        title: "Assignment Submitted",
        description: "Your recording has been submitted successfully.",
      });
      
      onSubmissionComplete();
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit assignment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (playbackAudio) {
        playbackAudio.pause();
        URL.revokeObjectURL(playbackAudio.src);
      }
    };
  }, [playbackAudio]);

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Recording Studio
          </CardTitle>
          <CardDescription>
            Record your sight-reading performance for {assignment.title}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Recording Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {isRecording ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  <span className="font-medium text-red-600">Recording...</span>
                </div>
              ) : audioBlob ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-green-600">Recording Ready</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">Ready to Record</span>
                </div>
              )}
              
              {(isRecording || audioBlob) && (
                <Badge variant="outline" className="ml-2">
                  {formatDuration(recordingDuration)}
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {!isRecording && !audioBlob && (
                <Button onClick={() => startRecording(120)} className="flex items-center gap-2">
                  <Mic className="h-4 w-4" />
                  Start Recording
                </Button>
              )}
              
              {isRecording && (
                <Button onClick={stopRecording} variant="destructive" className="flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  Stop Recording
                </Button>
              )}
              
              {audioBlob && !isRecording && (
                <>
                  <Button 
                    onClick={handlePlayRecording} 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    {isPlayingRecording ? (
                      <>
                        <Pause className="h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Play
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={clearRecording} 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Retake
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Grading */}
      {audioBlob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              AI Evaluation
            </CardTitle>
            <CardDescription>
              Get instant feedback on your performance
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {!gradingResults && !isGrading && (
              <Button 
                onClick={handleGradeRecording} 
                className="w-full flex items-center gap-2"
              >
                <Award className="h-4 w-4" />
                Grade My Performance
              </Button>
            )}
            
            {isGrading && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Analyzing your performance...</span>
                </div>
                <Progress value={33} className="w-full" />
              </div>
            )}
            
            {gradingResults && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center space-y-1">
                    <div className="text-2xl font-bold text-blue-600">
                      {gradingResults.pitchAcc || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Pitch Accuracy</div>
                  </div>
                  
                  <div className="text-center space-y-1">
                    <div className="text-2xl font-bold text-green-600">
                      {gradingResults.rhythmAcc || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Rhythm Accuracy</div>
                  </div>
                  
                  <div className="text-center space-y-1">
                    <div className="text-2xl font-bold text-purple-600">
                      {gradingResults.overall || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Score</div>
                  </div>
                </div>
                
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm font-medium mb-2">Grade: {gradingResults.letter || 'N/A'}</div>
                  <div className="text-sm text-muted-foreground">
                    AI evaluation based on pitch accuracy, rhythm precision, and overall musicality.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submission */}
      {audioBlob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Submit Assignment
            </CardTitle>
            <CardDescription>
              Submit your recording for final evaluation
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="Add any comments about your performance or challenges you faced..."
                rows={3}
              />
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                Once submitted, you cannot change your recording unless you have attempts remaining.
              </span>
            </div>
            
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting}
              className="w-full flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Submit Assignment
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};