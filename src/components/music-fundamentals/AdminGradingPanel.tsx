import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileAudio, FileText, Music, User, Calendar, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  submission_type: string;
  file_url: string | null;
  file_name: string | null;
  content: string | null;
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  status: string;
  assignment_title?: string;
  student_email?: string;
}

interface Assignment {
  id: string;
  title: string;
  assignment_type: string;
  max_score: number;
  due_date: string;
}

export const AdminGradingPanel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [score, setScore] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [status, setStatus] = useState<string>('graded');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignment, setFilterAssignment] = useState<string>('all');

  useEffect(() => {
    fetchSubmissions();
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('music_fundamentals_assignments')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      // Fetch submissions with assignment and student info
      const { data: submissionsData, error } = await supabase
        .from('music_fundamentals_submissions')
        .select(`
          *,
          music_fundamentals_assignments(title, max_score)
        `)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Get student emails from auth metadata (simplified approach)
      const enrichedSubmissions = submissionsData?.map(sub => ({
        ...sub,
        assignment_title: sub.music_fundamentals_assignments?.title,
        student_email: `student-${sub.student_id.slice(0, 8)}@email.com` // Placeholder
      })) || [];

      setSubmissions(enrichedSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load submissions.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async () => {
    if (!selectedSubmission || !user) return;

    try {
      const { error } = await supabase
        .from('music_fundamentals_submissions')
        .update({
          score: score ? parseInt(score) : null,
          feedback,
          status,
          graded_by: user.id,
          graded_at: new Date().toISOString()
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      toast({
        title: "Submission Graded",
        description: "The submission has been graded successfully."
      });

      // Refresh submissions
      fetchSubmissions();
      setSelectedSubmission(null);
      setScore('');
      setFeedback('');
      setStatus('graded');

    } catch (error) {
      console.error('Error grading submission:', error);
      toast({
        title: "Grading Failed",
        description: "Failed to save the grade. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'default';
      case 'needs_revision': return 'destructive';
      default: return 'secondary';
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'audio': return <FileAudio className="h-4 w-4" />;
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'musicxml': return <Music className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (filterStatus !== 'all' && sub.status !== filterStatus) return false;
    if (filterAssignment !== 'all' && sub.assignment_id !== filterAssignment) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="graded">Graded</SelectItem>
                  <SelectItem value="needs_revision">Needs Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assignment</Label>
              <Select value={filterAssignment} onValueChange={setFilterAssignment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignments</SelectItem>
                  {assignments.map(assignment => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      {assignment.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="submissions" className="w-full">
        <TabsList>
          <TabsTrigger value="submissions">Submissions ({filteredSubmissions.length})</TabsTrigger>
          <TabsTrigger value="grading">Grading Panel</TabsTrigger>
        </TabsList>

        <TabsContent value="submissions" className="space-y-4">
          {filteredSubmissions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">No submissions found</p>
                <p className="text-muted-foreground">No submissions match your current filters.</p>
              </CardContent>
            </Card>
          ) : (
            filteredSubmissions.map(submission => (
              <Card key={submission.id} className="cursor-pointer hover:bg-muted/50" 
                    onClick={() => setSelectedSubmission(submission)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getFileIcon(submission.submission_type)}
                      <div>
                        <p className="font-medium">{submission.assignment_title}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-3 w-3" />
                          {submission.student_email}
                          <Calendar className="h-3 w-3 ml-2" />
                          {new Date(submission.submitted_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {submission.score !== null && (
                        <Badge variant="outline">
                          <Star className="h-3 w-3 mr-1" />
                          {submission.score}/100
                        </Badge>
                      )}
                      <Badge variant={getStatusColor(submission.status)}>
                        {submission.status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="grading">
          {selectedSubmission ? (
            <Card>
              <CardHeader>
                <CardTitle>Grade Submission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {getFileIcon(selectedSubmission.submission_type)}
                    <span className="font-medium">{selectedSubmission.assignment_title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Student: {selectedSubmission.student_email}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Submitted: {new Date(selectedSubmission.submitted_at).toLocaleString()}
                  </p>
                  
                  {selectedSubmission.file_url && (
                    <div className="mt-3">
                      <Button variant="outline" size="sm" asChild>
                        <a href={selectedSubmission.file_url} target="_blank" rel="noopener noreferrer">
                          View File: {selectedSubmission.file_name}
                        </a>
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="score">Score (out of 100)</Label>
                    <Input
                      id="score"
                      type="number"
                      min="0"
                      max="100"
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder="Enter score..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="graded">Graded</SelectItem>
                        <SelectItem value="needs_revision">Needs Revision</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback">Feedback</Label>
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide detailed feedback for the student..."
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleGradeSubmission}>
                    Save Grade
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedSubmission(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium">Select a submission to grade</p>
                <p className="text-muted-foreground">
                  Choose a submission from the list to start grading.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};