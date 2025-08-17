import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Music, 
  FileText, 
  Headphones, 
  Download, 
  Upload, 
  Play, 
  Pause,
  Calendar,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAssignments } from '@/hooks/useAssignments';
import { RecordingControls } from '../sight-singing/RecordingControls';
import { ScoreDisplay } from '../sight-singing/ScoreDisplay';
import { useAudioRecorder } from '../sight-singing/hooks/useAudioRecorder';

interface AssignmentSubmissionDialogProps {
  assignment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
  };
}

export const AssignmentSubmissionDialog: React.FC<AssignmentSubmissionDialogProps> = ({
  assignment,
  open,
  onOpenChange,
  user,
}) => {
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState('assignment');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { submitAssignment, getSubmissionForAssignment } = useAssignments();
  
  const { 
    isRecording, 
    recordingDuration, 
    audioBlob, 
    startRecording, 
    stopRecording, 
    clearRecording 
  } = useAudioRecorder();

  const handleSubmit = async () => {
    if (!assignment) return;

    try {
      setSubmitting(true);
      
      let recordingUrl = '';
      if (audioBlob) {
        // Here you would upload the audio blob to storage
        // For now, we'll create a placeholder URL
        recordingUrl = URL.createObjectURL(audioBlob);
      }

      await submitAssignment(assignment.id, {
        recording_url: recordingUrl,
        notes: notes.trim() || undefined,
      });

      toast({
        title: 'Assignment Submitted',
        description: 'Your assignment has been submitted successfully.',
      });

      onOpenChange(false);
      setNotes('');
      clearRecording();
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your assignment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!assignment) return null;

  const submission = getSubmissionForAssignment(assignment.id);
  const dueDate = new Date(assignment.due_date);
  const isOverdue = dueDate < new Date() && (!submission || submission.status !== 'submitted');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sight_reading':
        return <Music className="h-4 w-4" />;
      case 'practice_exercise':
        return <Play className="h-4 w-4" />;
      case 'section_notes':
        return <FileText className="h-4 w-4" />;
      case 'pdf_resource':
        return <Download className="h-4 w-4" />;
      case 'audio_resource':
        return <Headphones className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            {getTypeIcon(assignment.assignment_type)}
            <DialogTitle>{assignment.title}</DialogTitle>
          </div>
          <DialogDescription>
            {assignment.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assignment Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Due: {format(dueDate, 'MMM dd, yyyy at h:mm a')}
                  </span>
                  {isOverdue && (
                    <Badge variant="destructive" className="ml-2">Overdue</Badge>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Points: {assignment.points_possible || 100}</span>
                </div>
              </div>

              {assignment.notes && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">{assignment.notes}</p>
                </div>
              )}

              {assignment.sheet_music && (
                <div className="space-y-2">
                  <h4 className="font-medium">Sheet Music:</h4>
                  <div className="flex items-center space-x-2">
                    <Music className="h-4 w-4 text-muted-foreground" />
                    <span>{assignment.sheet_music.title}</span>
                    {assignment.sheet_music.composer && (
                      <span className="text-muted-foreground">by {assignment.sheet_music.composer}</span>
                    )}
                  </div>
                </div>
              )}

              {assignment.pdf_url && (
                <div className="space-y-2">
                  <h4 className="font-medium">PDF Resource:</h4>
                  <Button variant="outline" size="sm" onClick={() => window.open(assignment.pdf_url, '_blank')}>
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              )}

              {assignment.audio_url && (
                <div className="space-y-2">
                  <h4 className="font-medium">Audio Resource:</h4>
                  <audio controls className="w-full">
                    <source src={assignment.audio_url} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="assignment">Assignment</TabsTrigger>
              <TabsTrigger value="practice">Practice</TabsTrigger>
              <TabsTrigger value="submit">Submit</TabsTrigger>
            </TabsList>

            <TabsContent value="assignment" className="space-y-4">
              {assignment.sheet_music_id && (
                <Card>
                  <CardHeader>
                    <CardTitle>Sheet Music</CardTitle>
                    <CardDescription>
                      Practice sight reading this piece before recording your submission.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* ScoreDisplay would go here if we have the MusicXML */}
                    <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
                      <div className="text-center">
                        <Music className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Sheet music will be displayed here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="practice" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Practice Recording</CardTitle>
                  <CardDescription>
                    Record yourself practicing before submitting your final answer.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecordingControls
                    isRecording={isRecording}
                    recordingDuration={recordingDuration}
                    audioBlob={audioBlob}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    onClearRecording={clearRecording}
                    showMetronome={false}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="submit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Final Submission</CardTitle>
                  <CardDescription>
                    Record your final performance and add any notes for your instructor.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <RecordingControls
                    isRecording={isRecording}
                    recordingDuration={recordingDuration}
                    audioBlob={audioBlob}
                    onStartRecording={startRecording}
                    onStopRecording={stopRecording}
                    onClearRecording={clearRecording}
                    showMetronome={false}
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes for Instructor (Optional)</label>
                    <Textarea
                      placeholder="Add any notes about your performance, challenges you faced, or questions you have..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={!audioBlob || submitting}
                      className="min-w-32"
                    >
                      {submitting ? (
                        <>Submitting...</>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Submit Assignment
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};