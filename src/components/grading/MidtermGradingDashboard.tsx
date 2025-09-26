import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useMidtermGrading } from '@/hooks/useMidtermGrading';
import { Bot, User, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

export const MidtermGradingDashboard: React.FC = () => {
  const { 
    submissions, 
    grades, 
    isLoadingSubmissions, 
    isLoadingGrades,
    gradeWithAI,
    updateGrade,
    isGradingWithAI,
    isUpdatingGrade
  } = useMidtermGrading();

  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);
  const [editingGrade, setEditingGrade] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState<string>('');

  if (isLoadingSubmissions || isLoadingGrades) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading grading dashboard...</p>
        </div>
      </div>
    );
  }

  const getSubmissionGrades = (submissionId: string) => {
    return grades?.filter(grade => grade.submission_id === submissionId) || [];
  };

  const calculateTotalScore = (submissionId: string) => {
    const submissionGrades = getSubmissionGrades(submissionId);
    const totalAI = submissionGrades.reduce((sum, grade) => sum + (grade.ai_score || 0), 0);
    const totalInstructor = submissionGrades.reduce((sum, grade) => sum + (grade.instructor_score || grade.ai_score || 0), 0);
    return { totalAI, totalInstructor, totalGrades: submissionGrades.length };
  };

  const handleAIGrade = async (submissionId: string) => {
    await gradeWithAI.mutateAsync(submissionId);
  };

  const handleUpdateGrade = async (gradeId: string) => {
    await updateGrade.mutateAsync({
      gradeId,
      instructor_score: gradeScore,
      instructor_feedback: gradeFeedback
    });
    setEditingGrade(null);
    setGradeScore(0);
    setGradeFeedback('');
  };

  const startEditing = (grade: any) => {
    setEditingGrade(grade.id);
    setGradeScore(grade.instructor_score || grade.ai_score || 0);
    setGradeFeedback(grade.instructor_feedback || '');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Midterm Grading Dashboard</h1>
          <p className="text-muted-foreground">Review and grade submitted midterm exams</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {submissions?.length || 0} Submissions
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {submissions?.map((submission) => {
          const submissionGrades = getSubmissionGrades(submission.id);
          const { totalAI, totalInstructor, totalGrades } = calculateTotalScore(submission.id);
          const hasAIGrades = submissionGrades.some(g => g.ai_score !== null);
          const needsReview = submissionGrades.some(g => g.needs_review);

          return (
            <Card key={submission.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{submission.profile?.full_name || 'Unknown Student'}</span>
                  {needsReview ? (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </CardTitle>
                <CardDescription>
                  Submitted {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Completion Time:</span>
                  <Badge variant="secondary">
                    {submission.total_time_minutes} minutes
                  </Badge>
                </div>

                {hasAIGrades ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>AI Score:</span>
                      <span className="font-medium">{totalAI.toFixed(1)} pts</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Final Score:</span>
                      <span className="font-bold text-primary">{totalInstructor.toFixed(1)} pts</span>
                    </div>
                    <Progress value={(totalInstructor / 90) * 100} className="h-2" />
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">Not yet graded</p>
                    <Button 
                      onClick={() => handleAIGrade(submission.id)}
                      disabled={isGradingWithAI}
                      size="sm"
                      className="w-full"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      {isGradingWithAI ? 'Grading...' : 'Grade with AI'}
                    </Button>
                  </div>
                )}

                <Button
                  variant="outline"
                  onClick={() => setSelectedSubmission(submission.id)}
                  className="w-full"
                >
                  Review Details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedSubmission && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Detailed Grading View</CardTitle>
            <CardDescription>
              Review and adjust grades for individual questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="questions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="questions">Question Grades</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>
              
              <TabsContent value="questions" className="space-y-4">
                {getSubmissionGrades(selectedSubmission).map((grade) => (
                  <Card key={grade.id}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-lg">
                        <span className="capitalize">{grade.question_id.replace('_', ' ')}</span>
                        <div className="flex items-center gap-2">
                          {grade.ai_score !== null && (
                            <Badge variant="secondary">
                              <Bot className="h-3 w-3 mr-1" />
                              AI: {grade.ai_score}
                            </Badge>
                          )}
                          {grade.instructor_score !== null && (
                            <Badge variant="default">
                              <User className="h-3 w-3 mr-1" />
                              Final: {grade.instructor_score}
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Student Answer:</h4>
                        <p className="text-sm bg-muted p-3 rounded border-l-4 border-border">
                          {grade.student_answer}
                        </p>
                      </div>

                      {grade.ai_feedback && (
                        <div>
                          <h4 className="font-medium mb-2 flex items-center">
                            <Bot className="h-4 w-4 mr-1" />
                            AI Feedback:
                          </h4>
                          <p className="text-sm bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                            {grade.ai_feedback}
                          </p>
                        </div>
                      )}

                      {editingGrade === grade.id ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium mb-1 block">Score:</label>
                            <Input
                              type="number"
                              value={gradeScore}
                              onChange={(e) => setGradeScore(Number(e.target.value))}
                              min="0"
                              max="20"
                              step="0.5"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1 block">Instructor Feedback:</label>
                            <Textarea
                              value={gradeFeedback}
                              onChange={(e) => setGradeFeedback(e.target.value)}
                              placeholder="Provide detailed feedback for the student..."
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleUpdateGrade(grade.id)}
                              disabled={isUpdatingGrade}
                              size="sm"
                            >
                              Save Grade
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setEditingGrade(null)}
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          {grade.instructor_feedback && (
                            <div className="flex-1 mr-4">
                              <h4 className="font-medium mb-1 flex items-center text-sm">
                                <User className="h-3 w-3 mr-1" />
                                Instructor Feedback:
                              </h4>
                              <p className="text-sm bg-green-50 p-2 rounded border-l-4 border-green-500">
                                {grade.instructor_feedback}
                              </p>
                            </div>
                          )}
                          <Button
                            onClick={() => startEditing(grade)}
                            variant="outline"
                            size="sm"
                          >
                            {grade.instructor_score ? 'Edit Grade' : 'Add Grade'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="summary">
                <Card>
                  <CardHeader>
                    <CardTitle>Grading Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const submissionGrades = getSubmissionGrades(selectedSubmission);
                      const { totalAI, totalInstructor } = calculateTotalScore(selectedSubmission);
                      
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-4 bg-blue-50 rounded">
                              <div className="text-2xl font-bold text-blue-600">{totalAI.toFixed(1)}</div>
                              <div className="text-sm text-blue-600">AI Total Score</div>
                            </div>
                            <div className="text-center p-4 bg-green-50 rounded">
                              <div className="text-2xl font-bold text-green-600">{totalInstructor.toFixed(1)}</div>
                              <div className="text-sm text-green-600">Final Score</div>
                            </div>
                          </div>
                          
                          <div className="text-center">
                            <div className="text-4xl font-bold text-primary">
                              {((totalInstructor / 90) * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-muted-foreground">Overall Grade</div>
                          </div>
                          
                          <Progress value={(totalInstructor / 90) * 100} className="h-3" />
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};