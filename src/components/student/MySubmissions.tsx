import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  FileText, 
  MessageSquare, 
  GraduationCap, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Edit,
  Eye
} from 'lucide-react';
import { useStudentSubmissions } from '@/hooks/useStudentSubmissions';
import { useNavigate } from 'react-router-dom';

export const MySubmissions: React.FC = () => {
  const { submissions, loading, error } = useStudentSubmissions();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium">Failed to load submissions</p>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (submission: any) => {
    if (submission.grade) return <GraduationCap className="h-4 w-4" />;
    if (submission.is_published) return <CheckCircle className="h-4 w-4" />;
    if (submission.content) return <Edit className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  const getStatusVariant = (submission: any) => {
    if (submission.grade) return "default";
    if (submission.is_published) return "default";
    if (submission.content) return "secondary";
    const dueDate = new Date(submission.assignment_due_date + 'T12:00:00');
    return dueDate < new Date() ? "destructive" : "outline";
  };

  const getStatusText = (submission: any) => {
    if (submission.grade) return `Graded: ${submission.grade.letter_grade}`;
    if (submission.is_published) return "Published";
    if (submission.content) return "Draft";
    const dueDate = new Date(submission.assignment_due_date + 'T12:00:00');
    return dueDate < new Date() ? "Overdue" : "Not Started";
  };

  const calculateOverallProgress = () => {
    const totalAssignments = submissions.length;
    const completedAssignments = submissions.filter(s => s.is_published).length;
    const gradedAssignments = submissions.filter(s => s.grade).length;
    
    return {
      completion: totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0,
      graded: totalAssignments > 0 ? (gradedAssignments / totalAssignments) * 100 : 0,
      totalPoints: submissions.reduce((sum, s) => sum + (s.grade?.overall_score || 0), 0),
      possiblePoints: submissions.filter(s => s.grade).length * 100
    };
  };

  const progress = calculateOverallProgress();

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            MUS 240 Journal Submissions Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Completion Rate</span>
                <span className="text-sm text-muted-foreground">
                  {submissions.filter(s => s.is_published).length}/{submissions.length}
                </span>
              </div>
              <Progress value={progress.completion} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Graded</span>
                <span className="text-sm text-muted-foreground">
                  {submissions.filter(s => s.grade).length}/{submissions.length}
                </span>
              </div>
              <Progress value={progress.graded} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Score</span>
                <span className="text-sm text-muted-foreground">
                  {progress.possiblePoints > 0 
                    ? `${Math.round((progress.totalPoints / progress.possiblePoints) * 100)}%`
                    : 'N/A'
                  }
                </span>
              </div>
              <Progress 
                value={progress.possiblePoints > 0 ? (progress.totalPoints / progress.possiblePoints) * 100 : 0} 
                className="h-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <div className="grid gap-4">
        {submissions.map((submission) => (
          <Card key={submission.assignment_id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{submission.assignment_title}</h3>
                    <Badge variant={getStatusVariant(submission)} className="flex items-center gap-1">
                      {getStatusIcon(submission)}
                      {getStatusText(submission)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>Due: {new Date(submission.assignment_due_date + 'T12:00:00').toLocaleDateString()}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span>{submission.word_count} words</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      <span>{submission.comment_count} comments</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3 text-muted-foreground" />
                      <span>{submission.assignment_points} points</span>
                    </div>
                  </div>

                  {submission.grade && (
                    <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Grade: {submission.grade.overall_score}% ({submission.grade.letter_grade})</span>
                        <span className="text-xs text-muted-foreground">
                          Graded on {new Date(submission.grade.graded_at).toLocaleDateString()}
                        </span>
                      </div>
                      {submission.grade.feedback && (
                        <p className="text-sm text-muted-foreground">
                          {submission.grade.feedback.slice(0, 100)}
                          {submission.grade.feedback.length > 100 && '...'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    onClick={() => navigate(`/classes/mus240/assignments/${submission.assignment_id}`)}
                    size="sm"
                    variant={submission.content ? "outline" : "default"}
                  >
                    {submission.content ? (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </>
                    ) : (
                      <>
                        <Edit className="h-3 w-3 mr-1" />
                        Start
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {submissions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Assignments Yet</h3>
            <p className="text-muted-foreground">
              Journal assignments will appear here once they are available.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};