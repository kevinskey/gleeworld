import React from 'react';
import { Link } from 'react-router-dom';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, FileText, Users, TrendingUp, Clock, Music } from 'lucide-react';
import { useMus240Progress } from '@/hooks/useMus240Progress';
import { mus240Assignments } from '@/data/mus240Assignments';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import backgroundImage from '@/assets/mus240-background.jpg';
import { Mus240UserAvatar } from '@/components/mus240/Mus240UserAvatar';

export const Mus240GradesPage: React.FC = () => {
  const navigate = useNavigate();
  const { gradeSummary, participationGrade, submissions, attendanceStats, loading, error, getLetterGradeColor } = useMus240Progress();

  console.log('Mus240GradesPage - Debug:', {
    loading,
    error,
    gradeSummary,
    participationGrade,
    submissions,
    attendanceStats
  });

  if (loading) {
    return (
      <UniversalLayout showHeader={true} showFooter={false}>
        <div 
          className="min-h-screen bg-cover bg-center bg-no-repeat relative"
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20"></div>
          <main className="relative z-10 max-w-6xl mx-auto p-6">
            <div className="text-center text-white">Loading your grades...</div>
          </main>
        </div>
      </UniversalLayout>
    );
  }

  if (error) {
    return (
      <UniversalLayout showHeader={true} showFooter={false}>
        <div 
          className="min-h-screen bg-cover bg-center bg-no-repeat relative"
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20"></div>
          <main className="relative z-10 max-w-6xl mx-auto p-6">
            <div className="text-center text-destructive">Error: {error}</div>
          </main>
        </div>
      </UniversalLayout>
    );
  }

  const assignmentPoints = gradeSummary?.assignment_points || 0;
  const participationPoints = gradeSummary?.participation_points || 0;
  const overallPoints = gradeSummary?.overall_points || 0;
  const overallPercentage = gradeSummary?.overall_percentage || 0;
  const letterGrade = gradeSummary?.letter_grade || 'N/A';

  // Get assignment details for submissions
  const getAssignmentDetails = (assignmentId: string) => {
    for (const week of mus240Assignments) {
      for (const assignment of week.assignments) {
        if (assignment.id === assignmentId) {
          return { ...assignment, weekNumber: week.week, weekTitle: week.topic };
        }
      }
    }
    return null;
  };

  const gradedSubmissions = submissions.filter(s => s.grade !== null);
  const pendingSubmissions = submissions.filter(s => s.grade === null);

  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <Mus240UserAvatar />
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat relative"
        style={{
          backgroundImage: `url(${backgroundImage})`,
        }}
      >
        {/* Gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20"></div>
        
        <main className="relative z-10 max-w-6xl mx-auto p-6">
          {/* Header with back navigation */}
          <div className="mb-8">
            <Link 
              to="/mus-240" 
              className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to MUS 240
            </Link>
            
            <div className="text-center">
              <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                <TrendingUp className="h-6 w-6 md:h-7 md:w-7 text-amber-300" />
                <span className="text-white/90 font-medium text-xl md:text-2xl lg:text-xl xl:text-2xl">Grades & Progress</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold mb-2 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
                Your Performance
              </h1>
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl text-white/80 mb-6">Track your progress in MUS 240</h2>
              
              <Button 
                variant="secondary" 
                onClick={() => navigate('/classes/mus240/assignments')}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Assignments
              </Button>
            </div>
          </div>

          {/* Overall Grade Summary */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg sm:text-base md:text-xl lg:text-lg xl:text-xl font-medium text-gray-900">Overall Grade</CardTitle>
                <TrendingUp className="h-5 w-5 sm:h-4 sm:w-4 md:h-6 md:w-6 lg:h-5 lg:w-5 xl:h-6 xl:w-6 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge variant="outline" className={`${getLetterGradeColor(letterGrade)} border-2`}>
                    {letterGrade}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {overallPercentage.toFixed(1)}% ({overallPoints}/{gradeSummary?.overall_possible || 725} points)
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg sm:text-base md:text-xl lg:text-lg xl:text-xl font-medium text-gray-900">Assignments</CardTitle>
                <FileText className="h-5 w-5 sm:h-4 sm:w-4 md:h-6 md:w-6 lg:h-5 lg:w-5 xl:h-6 xl:w-6 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{assignmentPoints}</div>
                <p className="text-xs text-gray-600">
                  / {gradeSummary?.assignment_possible || 650} points ({((assignmentPoints / (gradeSummary?.assignment_possible || 650)) * 100).toFixed(1)}%)
                </p>
                <Progress value={((assignmentPoints / (gradeSummary?.assignment_possible || 650)) * 100)} className="mt-2" />
              </CardContent>
            </Card>

            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg sm:text-base md:text-xl lg:text-lg xl:text-xl font-medium text-gray-900">Participation</CardTitle>
                <Users className="h-5 w-5 sm:h-4 sm:w-4 md:h-6 md:w-6 lg:h-5 lg:w-5 xl:h-6 xl:w-6 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{participationPoints}</div>
                <p className="text-xs text-gray-600">
                  / {gradeSummary?.participation_possible || 75} points ({((participationPoints / (gradeSummary?.participation_possible || 75)) * 100).toFixed(1)}%)
                </p>
                <Progress value={((participationPoints / (gradeSummary?.participation_possible || 75)) * 100)} className="mt-2" />
              </CardContent>
            </Card>

            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg sm:text-base md:text-xl lg:text-lg xl:text-xl font-medium text-gray-900">Attendance</CardTitle>
                <Calendar className="h-5 w-5 sm:h-4 sm:w-4 md:h-6 md:w-6 lg:h-5 lg:w-5 xl:h-6 xl:w-6 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{attendanceStats.attendanceRate.toFixed(1)}%</div>
                <p className="text-xs text-gray-600">
                  {attendanceStats.present} / {attendanceStats.total} sessions
                </p>
                <Progress value={attendanceStats.attendanceRate} className="mt-2" />
              </CardContent>
            </Card>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Assignment Details */}
            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <FileText className="h-5 w-5 text-amber-600" />
                  Assignment Breakdown
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Your performance on individual assignments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {gradedSubmissions.length > 0 ? (
                  <div className="space-y-3">
                    {gradedSubmissions.map((submission) => {
                      const details = getAssignmentDetails(submission.assignment_id);
                      return (
                        <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {details?.title || `Assignment ${submission.assignment_id}`}
                            </h4>
                            {details && (
                              <p className="text-sm text-gray-600">
                                Week {details.weekNumber}: {details.weekTitle}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-gray-500">
                                Submitted: {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                              </span>
                              {submission.graded_at && (
                                <span className="text-sm text-gray-500">
                                  • Graded: {format(new Date(submission.graded_at), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              {submission.grade?.toFixed(1) || 0}/{details?.points || 0}
                            </div>
                            <div className="text-sm text-gray-600">
                              {(((submission.grade || 0) / (details?.points || 1)) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No graded assignments yet
                  </div>
                )}

                {pendingSubmissions.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-900">
                        <Clock className="h-4 w-4 text-amber-600" />
                        Pending Grading ({pendingSubmissions.length})
                      </h4>
                      <div className="space-y-2">
                        {pendingSubmissions.map((submission) => {
                          const details = getAssignmentDetails(submission.assignment_id);
                          return (
                            <div key={submission.id} className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200">
                              <span className="text-sm text-gray-900">
                                {details?.title || `Assignment ${submission.assignment_id}`}
                              </span>
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800">Pending</Badge>
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
            <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  Attendance & Participation
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Your class attendance and participation record
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl font-bold text-green-700">{attendanceStats.present}</div>
                    <div className="text-sm text-green-600">Present</div>
                  </div>
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="text-2xl font-bold text-yellow-700">{attendanceStats.excused}</div>
                    <div className="text-sm text-yellow-600">Excused</div>
                  </div>
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="text-2xl font-bold text-red-700">{attendanceStats.unexcused}</div>
                    <div className="text-sm text-red-600">Unexcused</div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2 text-gray-900">
                    <Users className="h-4 w-4 text-amber-600" />
                    Participation Grade
                  </h4>
                  {participationGrade ? (
                    <div className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900">Points Earned</span>
                        <span className="font-bold text-gray-900">
                          {participationGrade.points_earned} / {participationGrade.points_possible}
                        </span>
                      </div>
                      <Progress 
                        value={(participationGrade.points_earned / participationGrade.points_possible) * 100} 
                        className="mt-2" 
                      />
                      {participationGrade.notes && (
                        <p className="text-sm text-gray-600 mt-2">
                          Note: {participationGrade.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No participation grade recorded yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </UniversalLayout>
  );
};