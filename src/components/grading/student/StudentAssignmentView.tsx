import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Video } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { VideoRecordingSubmission } from '@/components/course/VideoRecordingSubmission';

interface StudentAssignmentViewProps {
  assignmentId: string;
}

export const StudentAssignmentView: React.FC<StudentAssignmentViewProps> = ({ assignmentId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const { data: assignment, isLoading: assignmentLoading } = useQuery({
    queryKey: ['gw-assignment', assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_assignments' as any)
        .select('*, gw_courses(*)')
        .eq('id', assignmentId)
        .single();

      if (error) throw error;
      return data as any;
    },
  });

  const { data: submission, isLoading: submissionLoading } = useQuery({
    queryKey: ['gw-student-submission', assignmentId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_assignment_submissions' as any)
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (submission?.notes) {
      setEditedContent(submission.notes);
    }
  }, [submission]);

  const isVideoAssignment = assignment?.assignment_type === 'exercise' || 
    assignment?.title?.toLowerCase().includes('conducting') ||
    assignment?.title?.toLowerCase().includes('video');

  const updateMutation = useMutation({
    mutationFn: async ({ content, recordingUrl }: { content?: string; recordingUrl?: string }) => {
      const updateData: any = {
        assignment_id: assignmentId,
        user_id: user?.id,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };
      
      if (content !== undefined) {
        updateData.notes = content;
      }
      if (recordingUrl) {
        updateData.recording_url = recordingUrl;
      }
      
      const { error } = await supabase
        .from('gw_assignment_submissions' as any)
        .upsert(updateData);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gw-student-submission', assignmentId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['gw-student-assignments'] });
      toast.success(submission ? 'Submission updated successfully' : 'Submission created successfully');
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error('Failed to save submission');
      console.error(error);
    },
  });

  const handleVideoUploaded = (videoUrl: string) => {
    updateMutation.mutate({ recordingUrl: videoUrl });
  };

  if (assignmentLoading || submissionLoading) {
    return <LoadingSpinner size="lg" text="Loading assignment..." />;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(`/grading/student/course/${assignment?.course_id}`)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{assignment?.title}</h1>
          <p className="text-muted-foreground">{assignment?.gw_courses?.course_name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Assignment Details</span>
            {submission && (
              <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>
                {submission.status}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Points:</h3>
            <p>{assignment?.points}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Due Date:</h3>
            <p>{assignment?.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No due date'}</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Description:</h3>
            <p className="text-muted-foreground">{assignment?.description || 'No description provided'}</p>
          </div>
          {isVideoAssignment && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">Video Submission Required</h3>
              </div>
              <VideoRecordingSubmission
                assignmentId={assignmentId}
                onVideoUploaded={handleVideoUploaded}
                existingVideoUrl={submission?.recording_url}
              />
            </div>
          )}
          
          {submission ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Your Notes (optional):</h3>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(!isEditing)}>
                  {isEditing ? 'Cancel' : 'Edit'}
                </Button>
              </div>
              
              {submission.recording_url && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Submitted video:</p>
                  <video 
                    src={submission.recording_url} 
                    controls 
                    className="w-full max-h-[300px] rounded-lg bg-black"
                  />
                </div>
              )}
              
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    rows={6}
                    className="w-full"
                    placeholder="Add any notes about your submission..."
                  />
                  <Button onClick={() => updateMutation.mutate({ content: editedContent })} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Saving...' : 'Update Notes'}
                  </Button>
                </div>
              ) : (
                <>
                  {submission.notes && (
                    <div className="p-4 bg-muted rounded-lg">
                      <pre className="whitespace-pre-wrap">{submission.notes}</pre>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    Submitted: {new Date(submission.submitted_at).toLocaleString()}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!isVideoAssignment && (
                <>
                  <p className="text-muted-foreground">You haven't submitted this assignment yet.</p>
                  <div className="space-y-2">
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      rows={10}
                      placeholder="Start your submission here..."
                      className="w-full"
                    />
                    <Button onClick={() => updateMutation.mutate({ content: editedContent })} disabled={updateMutation.isPending || !editedContent.trim()}>
                      {updateMutation.isPending ? 'Submitting...' : 'Submit'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
