import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  BookOpen,
  FileText,
  GraduationCap,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Eye,
  Users,
  Trophy,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAllStudentAssignments } from '@/hooks/useAllStudentAssignments';
import { useMus240Progress } from '@/hooks/useMus240Progress';
import { useStudentGroupInfo } from '@/hooks/useStudentGroupInfo';
import { mus240Assignments } from '@/data/mus240Assignments';
import backgroundImage from '@/assets/mus240-background.jpg';

export const MySubmissionsComprehensive: React.FC = () => {
  const navigate = useNavigate();
  const { assignments, loading: assignmentsLoading } = useAllStudentAssignments();
  const { 
    gradeSummary, 
    participationGrade, 
    submissions,
    attendanceStats,
    loading: progressLoading,
    getLetterGradeColor
  } = useMus240Progress();
  const { groupInfo, loading: groupLoading } = useStudentGroupInfo();

  // Categorize assignments
  const categorized = useMemo(() => {
    const journals = assignments.filter(a => a.assignment_type === 'listening-journal');
    const essays = assignments.filter(a => 
      a.assignment_type === 'essay' || 
      a.assignment_type === 'reflection-paper' ||
      a.assignment_type === 'research-proposal' ||
      a.assignment_type === 'annotated-bibliography'
    );
    const exams = assignments.filter(a => a.assignment_type === 'exam');
    const upcoming = assignments.filter(a => {
      if (a.is_submitted) return false;
      const dueDate = new Date(a.assignment_due_date);
      return dueDate >= new Date();
    });
    const overdue = assignments.filter(a => {
      if (a.is_submitted) return false;
      const dueDate = new Date(a.assignment_due_date);
      return dueDate < new Date();
    });

    return { journals, essays, exams, upcoming, overdue };
  }, [assignments]);

  // Calculate overall grade (total points / 760 total)
  const overallGrade = useMemo(() => {
    if (!gradeSummary) return null;
    
    const assignmentPoints = gradeSummary.assignment_points || 0;
    const participationPoints = participationGrade?.points_earned || 0;
    const totalPoints = assignmentPoints + participationPoints;
    const totalPossible = 760; // 260 journals (13×20) + 150 research papers (3×50) + 150 AI group (20+30+100) + 100 midterm + 50 final essay + 50 participation
    const percentage = (totalPoints / totalPossible) * 100;
    
    let letterGrade = 'F';
    if (percentage >= 97) letterGrade = 'A+';
    else if (percentage >= 93) letterGrade = 'A';
    else if (percentage >= 90) letterGrade = 'A-';
    else if (percentage >= 87) letterGrade = 'B+';
    else if (percentage >= 83) letterGrade = 'B';
    else if (percentage >= 80) letterGrade = 'B-';
    else if (percentage >= 77) letterGrade = 'C+';
    else if (percentage >= 73) letterGrade = 'C';
    else if (percentage >= 70) letterGrade = 'C-';
    else if (percentage >= 67) letterGrade = 'D+';
    else if (percentage >= 63) letterGrade = 'D';
    else if (percentage >= 60) letterGrade = 'D-';

    return {
      totalPoints,
      totalPossible,
      percentage: percentage.toFixed(1),
      letterGrade,
      assignmentPoints,
      participationPoints
    };
  }, [gradeSummary, participationGrade]);


  // Get assignment details helper
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

  const gradedSubmissions = submissions?.filter(s => s.grade !== null) || [];
  const pendingSubmissions = submissions?.filter(s => s.grade === null) || [];

  const handleAssignmentClick = (assignment: any) => {
    if (assignment.assignment_type === 'exam') {
      navigate('/classes/mus240/midterm');
    } else {
      navigate(`/classes/mus240/assignments/${assignment.assignment_id}`);
    }
  };

  if (assignmentsLoading || progressLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  const renderAssignmentCard = (assignment: any) => (
    <Card key={assignment.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{assignment.assignment_title}</h4>
              {assignment.grade !== undefined ? (
                <Badge variant="default">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  Graded: {assignment.letter_grade || `${assignment.grade}%`}
                </Badge>
              ) : assignment.is_submitted ? (
                <Badge variant="secondary">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Submitted
                </Badge>
              ) : (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  Not Started
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span>Due: {new Date(assignment.assignment_due_date).toLocaleDateString()}</span>
              <span>{assignment.assignment_points} points</span>
              {assignment.submitted_at && (
                <span>Submitted: {new Date(assignment.submitted_at).toLocaleDateString()}</span>
              )}
            </div>

            {assignment.feedback && (
              <p className="text-sm bg-muted/50 p-2 rounded">
                {assignment.feedback.slice(0, 100)}
                {assignment.feedback.length > 100 && '...'}
              </p>
            )}
          </div>

          <Button
            size="sm"
            variant={assignment.is_submitted ? "outline" : "default"}
            onClick={() => handleAssignmentClick(assignment)}
          >
            {assignment.is_submitted ? (
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
      </CardContent>
    </Card>
  );

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative -mt-8"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/20"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
        {/* Hero Header */}
        <div className="text-center mb-8 pt-8">
          <div className="inline-flex items-center gap-3 mb-4 px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
            <TrendingUp className="h-6 w-6 text-amber-300" />
            <span className="text-white/90 font-medium text-xl">My Grades & Submissions</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-2 bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-2xl">
            Your Performance
          </h1>
        </div>

        {/* Overall Course Grade Card - Now with background image styling */}
        {overallGrade && (
          <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-600" />
                Overall Course Grade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Letter Grade</p>
                  <Badge variant="outline" className={`text-3xl px-4 py-2 ${getLetterGradeColor(overallGrade.letterGrade)} border-2`}>
                    {overallGrade.letterGrade}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Percentage</p>
                  <p className="text-3xl font-semibold">{overallGrade.percentage}%</p>
                  <Progress value={Number(overallGrade.percentage)} className="mt-2" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Points</p>
                  <p className="text-3xl font-semibold">{overallGrade.totalPoints}/{overallGrade.totalPossible}</p>
                  <p className="text-xs mt-1">
                    Assignments: {overallGrade.assignmentPoints} | Participation: {overallGrade.participationPoints}
                  </p>
                </div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <p className="font-semibold text-sm">Grading Formula:</p>
                  <p>• Journals: 260 pts (13×20)</p>
                  <p>• Research: 150 pts (3×50)</p>
                  <p>• AI Group: 150 pts</p>
                  <p>• Midterm: 100 pts</p>
                  <p>• Final Essay: 50 pts</p>
                  <p>• Participation: 50 pts</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Assignments</CardTitle>
              <FileText className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gradeSummary?.assignment_points || 0}</div>
              <p className="text-xs text-muted-foreground">
                / {gradeSummary?.assignment_possible || 500} points
              </p>
              <Progress value={((gradeSummary?.assignment_points || 0) / (gradeSummary?.assignment_possible || 500)) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Participation</CardTitle>
              <Users className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{participationGrade?.points_earned || 0}</div>
              <p className="text-xs text-muted-foreground">
                / {participationGrade?.points_possible || 50} points
              </p>
              <Progress value={((participationGrade?.points_earned || 0) / (participationGrade?.points_possible || 50)) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Attendance</CardTitle>
              <Calendar className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{attendanceStats?.attendanceRate.toFixed(1) || 0}%</div>
              <p className="text-xs text-muted-foreground">
                {attendanceStats?.present || 0} / {attendanceStats?.total || 0} sessions
              </p>
              <Progress value={attendanceStats?.attendanceRate || 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">Completed</CardTitle>
              <CheckCircle className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {assignments.filter(a => a.is_submitted).length}/{assignments.length}
              </div>
              <p className="text-xs text-muted-foreground">Assignments</p>
              <Progress 
                value={(assignments.filter(a => a.is_submitted).length / assignments.length) * 100} 
                className="mt-2" 
              />
            </CardContent>
          </Card>
        </div>

        {/* Group Information */}
        {groupInfo && !groupLoading && (
          <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600" />
                My Research Group
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <h4 className="font-semibold">{groupInfo.group_name}</h4>
                <p className="text-sm text-muted-foreground">{groupInfo.project_topic}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span>Members: {groupInfo.member_count}/{groupInfo.max_members}</span>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/classes/mus240/groups')}
                  >
                    View Group Page
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Urgent Alerts */}
        {categorized.overdue.length > 0 && (
          <Card className="border-red-200 bg-red-50/95 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                <p className="font-semibold">
                  You have {categorized.overdue.length} overdue assignment(s)
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content - Two Column Layout */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column - Assignment Breakdown */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-amber-600" />
                Assignment Breakdown
              </CardTitle>
              <CardDescription>
                Your performance on individual assignments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {gradedSubmissions.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {gradedSubmissions.map((submission) => {
                    const details = getAssignmentDetails(submission.assignment_id);
                    return (
                      <div key={submission.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
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
                      <Clock className="h-4 w-4 text-amber-600" />
                      Pending Grading ({pendingSubmissions.length})
                    </h4>
                    <div className="space-y-2">
                      {pendingSubmissions.map((submission) => {
                        const details = getAssignmentDetails(submission.assignment_id);
                        return (
                          <div key={submission.id} className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200">
                            <span className="text-sm">
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

          {/* Right Column - Attendance & Participation */}
          <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-600" />
                Attendance & Participation
              </CardTitle>
              <CardDescription>
                Your class attendance and participation record
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{attendanceStats?.present || 0}</div>
                  <div className="text-sm text-green-600">Present</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-700">{attendanceStats?.excused || 0}</div>
                  <div className="text-sm text-yellow-600">Excused</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{attendanceStats?.unexcused || 0}</div>
                  <div className="text-sm text-red-600">Unexcused</div>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-amber-600" />
                  Participation Grade
                </h4>
                {participationGrade ? (
                  <div className="p-3 bg-gray-50 rounded-lg border">
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

        {/* Categorized Assignments Tabs */}
        <Card className="bg-white/95 backdrop-blur-sm border border-white/30">
          <CardHeader>
            <CardTitle>All Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all">All ({assignments.length})</TabsTrigger>
                <TabsTrigger value="journals">Journals ({categorized.journals.length})</TabsTrigger>
                <TabsTrigger value="essays">Essays ({categorized.essays.length})</TabsTrigger>
                <TabsTrigger value="exams">Exams ({categorized.exams.length})</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming ({categorized.upcoming.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3">
                {assignments.map(renderAssignmentCard)}
              </TabsContent>

              <TabsContent value="journals" className="space-y-3">
                {categorized.journals.map(renderAssignmentCard)}
              </TabsContent>

              <TabsContent value="essays" className="space-y-3">
                {categorized.essays.map(renderAssignmentCard)}
              </TabsContent>

              <TabsContent value="exams" className="space-y-3">
                {categorized.exams.map(renderAssignmentCard)}
              </TabsContent>

              <TabsContent value="upcoming" className="space-y-3">
                {categorized.upcoming.map(renderAssignmentCard)}
                {categorized.upcoming.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <p className="text-muted-foreground">No upcoming assignments</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};