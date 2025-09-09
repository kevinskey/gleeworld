import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Play, 
  Download, 
  Award, 
  Clock, 
  User,
  FileAudio,
  Eye,
  Edit,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AssignmentGradingViewProps {
  assignment: any;
  submissions: any[];
  onBack: () => void;
}

export const AssignmentGradingView: React.FC<AssignmentGradingViewProps> = ({
  assignment,
  submissions,
  onBack
}) => {
  const { toast } = useToast();
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ grade: '', feedback: '' });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'graded':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Graded</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">Submitted</Badge>;
      default:
        return <Badge variant="secondary">In Progress</Badge>;
    }
  };

  const handleEditSubmission = (submission: any) => {
    setSelectedSubmission(submission);
    setEditData({
      grade: submission.grade?.toString() || '',
      feedback: submission.feedback || ''
    });
    setIsEditing(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedSubmission) return;

    try {
      // Here you would typically call an API to update the submission
      // For now, we'll just show a success message
      toast({
        title: "Grade Updated",
        description: "The submission grade has been updated successfully.",
      });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update the grade. Please try again.",
        variant: "destructive",
      });
    }
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(error => {
      toast({
        title: "Playback Failed",
        description: "Unable to play the audio file.",
        variant: "destructive",
      });
    });
  };

  const downloadAudio = (audioUrl: string, studentName: string) => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `${studentName}-${assignment.title}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const avgGrade = submissions.filter(s => s.grade !== null).length > 0 
    ? submissions.filter(s => s.grade !== null).reduce((sum, s) => sum + (s.grade || 0), 0) / submissions.filter(s => s.grade !== null).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Assignments
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{assignment.title}</h2>
          <p className="text-muted-foreground">
            Due: {new Date(assignment.due_date).toLocaleDateString()} • {submissions.length} submissions
          </p>
        </div>
      </div>

      {/* Assignment Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Graded</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {submissions.filter(s => s.status === 'graded').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {submissions.filter(s => s.status === 'submitted').length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {avgGrade.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Submissions List */}
        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>
              Review and grade student submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {submissions.length === 0 ? (
                  <div className="text-center py-8">
                    <FileAudio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">No Submissions</h3>
                    <p className="text-sm text-muted-foreground">
                      No students have submitted this assignment yet.
                    </p>
                  </div>
                ) : (
                  submissions.map((submission) => (
                    <Card 
                      key={submission.id} 
                      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedSubmission?.id === submission.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Student {submission.student_id.slice(0, 8)}</span>
                              {getStatusBadge(submission.status)}
                            </div>
                            
                            <div className="text-sm text-muted-foreground">
                              Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                            </div>
                            
                            {submission.grade !== null && (
                              <div className="text-sm font-medium text-green-600">
                                Grade: {submission.grade}%
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-1">
                            {submission.audio_url && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playAudio(submission.audio_url);
                                  }}
                                >
                                  <Play className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadAudio(submission.audio_url, `Student-${submission.student_id.slice(0, 8)}`);
                                  }}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Submission Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Submission Details</CardTitle>
              {selectedSubmission && !isEditing && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleEditSubmission(selectedSubmission)}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-3 w-3" />
                  Edit Grade
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {!selectedSubmission ? (
              <div className="text-center py-8">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground">No Submission Selected</h3>
                <p className="text-sm text-muted-foreground">
                  Select a submission from the list to view details.
                </p>
              </div>
            ) : isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade (0-100)</Label>
                  <Input
                    id="grade"
                    type="number"
                    min="0"
                    max="100"
                    value={editData.grade}
                    onChange={(e) => setEditData({...editData, grade: e.target.value})}
                    placeholder="Enter grade"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={editData.feedback}
                    onChange={(e) => setEditData({...editData, feedback: e.target.value})}
                    placeholder="Provide feedback to the student..."
                    rows={4}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSaveGrade} className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Save Grade
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Student ID</div>
                    <div className="font-mono text-sm">{selectedSubmission.student_id}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Status</div>
                    <div>{getStatusBadge(selectedSubmission.status)}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-muted-foreground">Submitted</div>
                    <div className="text-sm">{new Date(selectedSubmission.submitted_at).toLocaleString()}</div>
                  </div>
                  
                  {selectedSubmission.grade !== null && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-muted-foreground">Grade</div>
                      <div className="text-lg font-semibold text-green-600">{selectedSubmission.grade}%</div>
                    </div>
                  )}
                </div>
                
                {selectedSubmission.notes && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Student Notes</div>
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      {selectedSubmission.notes}
                    </div>
                  </div>
                )}
                
                {selectedSubmission.feedback && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">Instructor Feedback</div>
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      {selectedSubmission.feedback}
                    </div>
                  </div>
                )}
                
                {selectedSubmission.grading_results && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">AI Evaluation</div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <div className="text-lg font-semibold text-blue-600">
                          {selectedSubmission.grading_results.pitchAccuracy}%
                        </div>
                        <div className="text-xs text-muted-foreground">Pitch</div>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <div className="text-lg font-semibold text-green-600">
                          {selectedSubmission.grading_results.rhythmAccuracy}%
                        </div>
                        <div className="text-xs text-muted-foreground">Rhythm</div>
                      </div>
                      <div className="text-center p-2 bg-muted/50 rounded">
                        <div className="text-lg font-semibold text-purple-600">
                          {selectedSubmission.grading_results.overallScore}%
                        </div>
                        <div className="text-xs text-muted-foreground">Overall</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};