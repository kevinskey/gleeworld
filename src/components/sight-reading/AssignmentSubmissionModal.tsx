import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Square, Play, Upload, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  points_possible: number;
  notes: string;
  assignment_type: string;
}

interface AssignmentSubmissionModalProps {
  assignment: Assignment | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmissionComplete: () => void;
  user: {
    id: string;
    email?: string;
    full_name?: string;
  } | null;
}

export const AssignmentSubmissionModal: React.FC<AssignmentSubmissionModalProps> = ({
  assignment,
  isOpen,
  onClose,
  onSubmissionComplete,
  user
}) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  if (!assignment) return null;

  // Parse exercise config from notes
  const exerciseConfig = (() => {
    try {
      const match = assignment.notes?.match(/Exercise Config: ({.*})/);
      return match ? JSON.parse(match[1]) : {
        key: 'C',
        time_signature: '4/4',
        tempo: 120,
        difficulty: 'intermediate',
        num_measures: 8
      };
    } catch {
      return {
        key: 'C',
        time_signature: '4/4', 
        tempo: 120,
        difficulty: 'intermediate',
        num_measures: 8
      };
    }
  })();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const playRecording = () => {
    if (recordedBlob) {
      const audio = new Audio(URL.createObjectURL(recordedBlob));
      audio.play();
    }
  };

  const submitRecording = async () => {
    if (!recordedBlob || !user) {
      toast({
        title: "Error",
        description: "No recording available or user not authenticated",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert blob to base64 for API submission
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Remove data:audio/webm;base64, prefix
        };
        reader.readAsDataURL(recordedBlob);
      });

      console.log('Submitting recording for AI grading...');

      // Call the AI grading edge function
      const { data: gradingResult, error: gradingError } = await supabase.functions.invoke('grade-sight-reading', {
        body: {
          assignment_id: assignment.id,
          user_id: user.id,
          audio_data: base64Audio,
          exercise_data: {
            notes: [], // Could be populated from exercise config
            key: exerciseConfig.key,
            time_signature: exerciseConfig.time_signature,
            tempo: exerciseConfig.tempo
          }
        }
      });

      if (gradingError) {
        throw gradingError;
      }

      console.log('AI grading result:', gradingResult);

      toast({
        title: "Assignment Submitted!",
        description: `Your recording has been submitted and graded. Score: ${gradingResult.grade}%`
      });

      onSubmissionComplete();
      onClose();

    } catch (error) {
      console.error('Error submitting recording:', error);
      toast({
        title: "Submission Error", 
        description: "Failed to submit recording. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Submit Assignment: {assignment.title}</DialogTitle>
          <DialogDescription>
            Record your sight reading performance for AI evaluation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assignment Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Due Date:</span>
                <span className="text-sm">{format(new Date(assignment.due_date), 'PPp')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Points Possible:</span>
                <span className="text-sm">{assignment.points_possible}</span>
              </div>
              {assignment.description && (
                <div>
                  <span className="text-sm font-medium">Instructions:</span>
                  <p className="text-sm text-muted-foreground mt-1">{assignment.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exercise Configuration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Exercise Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-sm font-medium">Key</div>
                  <div className="text-lg">{exerciseConfig.key} Major</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Time</div>
                  <div className="text-lg">{exerciseConfig.time_signature}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Tempo</div>
                  <div className="text-lg">{exerciseConfig.tempo} BPM</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Difficulty</div>
                  <Badge className={getDifficultyColor(exerciseConfig.difficulty)}>
                    {exerciseConfig.difficulty}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recording Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Record Your Performance</CardTitle>
              <CardDescription>
                Record yourself sight-reading the exercise for AI evaluation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recording Controls */}
              <div className="flex items-center justify-center space-x-4">
                {!isRecording && !recordedBlob && (
                  <Button onClick={startRecording} className="w-32">
                    <Mic className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                )}

                {isRecording && (
                  <Button onClick={stopRecording} variant="destructive" className="w-32">
                    <Square className="h-4 w-4 mr-2" />
                    Stop Recording
                  </Button>
                )}

                {recordedBlob && !isRecording && (
                  <div className="flex space-x-2">
                    <Button onClick={playRecording} variant="outline">
                      <Play className="h-4 w-4 mr-2" />
                      Play Recording
                    </Button>
                    <Button onClick={startRecording} variant="outline">
                      <Mic className="h-4 w-4 mr-2" />
                      Record Again
                    </Button>
                  </div>
                )}
              </div>

              {/* Recording Status */}
              {isRecording && (
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 text-red-600">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="font-medium">Recording: {formatTime(recordingDuration)}</span>
                  </div>
                </div>
              )}

              {recordedBlob && !isRecording && (
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Recording ready for submission</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {recordedBlob && (
                <div className="flex justify-center">
                  <Button 
                    onClick={submitRecording} 
                    disabled={isSubmitting}
                    className="w-48"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Submitting...' : 'Submit for AI Grading'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};