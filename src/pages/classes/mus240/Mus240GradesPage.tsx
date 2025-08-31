import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar, FileText, Users, TrendingUp, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useMus240Progress } from '@/hooks/useMus240Progress';
import { ASSIGNMENTS } from '@/data/mus240Assignments';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { ErrorState } from '@/components/shared/ErrorState';

export const Mus240GradesPage: React.FC = () => {
  const navigate = useNavigate();
  const { gradeSummary, participationGrade, submissions, attendanceStats, loading, error, getLetterGradeColor } = useMus240Progress();

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="text-center">Loading your grades...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <ErrorState 
          message={error} 
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  console.log('Mus240GradesPage - Grade Summary:', gradeSummary);
  console.log('Mus240GradesPage - Submissions:', submissions);
  console.log('Mus240GradesPage - Attendance Stats:', attendanceStats);

  console.log('Mus240GradesPage loaded - checking data...', { gradeSummary, submissions, attendanceStats });
  const assignmentPoints = gradeSummary?.assignment_points || 0;
  const participationPoints = gradeSummary?.participation_points || 0;
  const overallPoints = gradeSummary?.overall_points || 0;
  const overallPercentage = gradeSummary?.overall_percentage || 0;
  const letterGrade = gradeSummary?.letter_grade || 'N/A';

  // Get assignment details for submissions
  const getAssignmentDetails = (assignmentId: string) => {
    for (const week of ASSIGNMENTS) {
      for (const assignment of week.assignments) {
        if (assignment.id === assignmentId) {
          return { ...assignment, weekNumber: week.number, weekTitle: week.title };
        }
      }
    }
    return null;
  };

  const gradedSubmissions = submissions.filter(s => s.grade !== null);
  const pendingSubmissions = submissions.filter(s => s.grade === null);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">MUS 240 - Grades & Progress</h1>
          <p className="text-muted-foreground">Track your performance and progress in Music Listening</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/classes/mus240/assignments')}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          View Assignments
        </Button>
      </div>

      {/* Overall Grade Summary */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Grade</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant="outline" className={getLetterGradeColor(letterGrade)}>
                {letterGrade}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {overallPercentage.toFixed(1)}% ({overallPoints}/{gradeSummary?.overall_possible || 725} points)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assignments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignmentPoints}</div>
            <p className="text-xs text-muted-foreground">
              / {gradeSummary?.assignment_possible || 650} points ({((assignmentPoints / (gradeSummary?.assignment_possible || 650)) * 100).toFixed(1)}%)
            </p>
            <Progress value={((assignmentPoints / (gradeSummary?.assignment_possible || 650)) * 100)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participation</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{participationPoints}</div>
            <p className="text-xs text-muted-foreground">
              / {gradeSummary?.participation_possible || 75} points ({((participationPoints / (gradeSummary?.participation_possible || 75)) * 100).toFixed(1)}%)
            </p>
            <Progress value={((participationPoints / (gradeSummary?.participation_possible || 75)) * 100)} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceStats.attendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {attendanceStats.present} / {attendanceStats.total} sessions
            </p>
            <Progress value={attendanceStats.attendanceRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Assignment Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assignment Breakdown
            </CardTitle>
            <CardDescription>
              Your performance on individual assignments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gradedSubmissions.length > 0 ? (
              <div className="space-y-3">
                {gradedSubmissions.map((submission) => {
                  const details = getAssignmentDetails(submission.assignment_id);
                  return (
                    <div key={submission.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {details?.title || `Assignment ${submission.assignment_id}`}
                        </h4>
                        {details && (
                          <p className="text-sm text-muted-foreground">
                            Week {details.weekNumber}: {details.weekTitle}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">
                            Submitted: {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                          </span>
                          {submission.graded_at && (
                            <span className="text-sm text-muted-foreground">
                              • Graded: {format(new Date(submission.graded_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {submission.grade?.toFixed(1) || 0}/{details?.points || 0}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {(((submission.grade || 0) / (details?.points || 1)) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No graded assignments yet
              </div>
            )}

            {pendingSubmissions.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pending Grading ({pendingSubmissions.length})
                  </h4>
                  <div className="space-y-2">
                    {pendingSubmissions.map((submission) => {
                      const details = getAssignmentDetails(submission.assignment_id);
                      return (
                        <div key={submission.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                          <span className="text-sm">
                            {details?.title || `Assignment ${submission.assignment_id}`}
                          </span>
                          <Badge variant="secondary">Pending</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Attendance & Participation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance & Participation
            </CardTitle>
            <CardDescription>
              Your class attendance and participation record
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-success/10 rounded-lg">
                <div className="text-2xl font-bold text-success">{attendanceStats.present}</div>
                <div className="text-sm text-muted-foreground">Present</div>
              </div>
              <div className="p-3 bg-warning/10 rounded-lg">
                <div className="text-2xl font-bold text-warning">{attendanceStats.excused}</div>
                <div className="text-sm text-muted-foreground">Excused</div>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg">
                <div className="text-2xl font-bold text-destructive">{attendanceStats.unexcused}</div>
                <div className="text-sm text-muted-foreground">Unexcused</div>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participation Grade
              </h4>
              {participationGrade ? (
                <div className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span>Points Earned</span>
                    <span className="font-bold">
                      {participationGrade.points_earned} / {participationGrade.points_possible}
                    </span>
                  </div>
                  <Progress 
                    value={(participationGrade.points_earned / participationGrade.points_possible) * 100} 
                    className="mt-2" 
                  />
                  {participationGrade.notes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Note: {participationGrade.notes}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No participation grade recorded yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};