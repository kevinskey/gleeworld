import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Assignment {
  id: string;
  title: string;
  description: string;
  assignment_type: string;
  due_date: string;
  max_score: number;
  created_at: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  score: number | null;
  feedback: string | null;
  status: string;
  submitted_at: string;
}

export const AssignmentsList: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAssignments();
      fetchSubmissions();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('music_fundamentals_assignments')
        .select('*')
        .eq('is_active', true)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load assignments.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('music_fundamentals_submissions')
        .select('*')
        .eq('student_id', user.id);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const getAssignmentStatus = (assignment: Assignment) => {
    const submission = submissions.find(s => s.assignment_id === assignment.id);
    const dueDate = new Date(assignment.due_date);
    const now = new Date();
    const isOverdue = now > dueDate;

    if (submission) {
      if (submission.status === 'graded') return 'completed';
      if (submission.status === 'needs_revision') return 'revision';
      return 'submitted';
    }

    return isOverdue ? 'overdue' : 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'submitted': return 'secondary';
      case 'revision': return 'destructive';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'revision': 
      case 'overdue': return <AlertCircle className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getSubmissionForAssignment = (assignmentId: string) => {
    return submissions.find(s => s.assignment_id === assignmentId);
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day(s)`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} day(s)`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No assignments available</p>
          <p className="text-muted-foreground">Check back later for new assignments.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assignments.map((assignment) => {
        const status = getAssignmentStatus(assignment);
        const submission = getSubmissionForAssignment(assignment.id);
        
        return (
          <Card key={assignment.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2 mb-2">
                    {getStatusIcon(status)}
                    {assignment.title}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="outline">{assignment.assignment_type}</Badge>
                    <Badge variant={getStatusColor(status)}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                    <Badge variant="secondary">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatDueDate(assignment.due_date)}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Max Score</p>
                  <p className="text-lg font-bold">{assignment.max_score}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{assignment.description}</p>
              
              {submission && (
                <div className="space-y-3">
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Your Submission</span>
                      <span className="text-xs text-muted-foreground">
                        Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {submission.score !== null && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Score</span>
                          <span className="font-bold">
                            {submission.score}/{assignment.max_score}
                          </span>
                        </div>
                        <Progress 
                          value={(submission.score / assignment.max_score) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}
                    
                    {submission.feedback && (
                      <div className="mt-3">
                        <p className="text-sm font-medium mb-1">Feedback:</p>
                        <p className="text-sm text-muted-foreground bg-background p-2 rounded border">
                          {submission.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex gap-2 mt-4">
                <Button 
                  variant={submission ? "secondary" : "default"} 
                  size="sm"
                  disabled={status === 'overdue' && !submission}
                >
                  {submission ? 'View Submission' : 'Start Assignment'}
                </Button>
                {submission && submission.status === 'needs_revision' && (
                  <Button variant="outline" size="sm">
                    Revise Submission
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};