import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  TrendingUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAllStudentAssignments } from '@/hooks/useAllStudentAssignments';
import { useMus240Progress } from '@/hooks/useMus240Progress';
import { useStudentGroupInfo } from '@/hooks/useStudentGroupInfo';

export const MySubmissionsComprehensive: React.FC = () => {
  const navigate = useNavigate();
  const { assignments, loading: assignmentsLoading } = useAllStudentAssignments();
  const { gradeSummary, participationGrade, loading: progressLoading } = useMus240Progress();
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

  // Calculate overall grade (total points / 550 total)
  const overallGrade = useMemo(() => {
    if (!gradeSummary) return null;
    
    const assignmentPoints = gradeSummary.assignment_points || 0;
    const participationPoints = participationGrade?.points_earned || 0;
    const totalPoints = assignmentPoints + participationPoints;
    const totalPossible = 550; // 100 journals + 150 research + 100 group + 100 midterm + 50 reflection + 50 participation
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

  const getLetterGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-green-600';
    if (grade.startsWith('B')) return 'text-blue-600';
    if (grade.startsWith('C')) return 'text-yellow-600';
    return 'text-red-600';
  };

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
    <div className="space-y-6">
      {/* Overall Course Grade */}
      {overallGrade && (
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Overall Course Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Letter Grade</p>
                <p className={`text-4xl font-bold ${getLetterGradeColor(overallGrade.letterGrade)}`}>
                  {overallGrade.letterGrade}
                </p>
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
                <p>• Journals: 100 pts (10×10)</p>
                <p>• Research: 150 pts</p>
                <p>• AI Group: 100 pts</p>
                <p>• Midterm: 100 pts</p>
                <p>• Final Essay: 50 pts</p>
                <p>• Participation: 50 pts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Group Information */}
      {groupInfo && !groupLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
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
        <Card className="border-red-200 bg-red-50">
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

      {/* Categorized Assignments */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({assignments.length})</TabsTrigger>
          <TabsTrigger value="journals">Journals ({categorized.journals.length})</TabsTrigger>
          <TabsTrigger value="essays">Essays ({categorized.essays.length})</TabsTrigger>
          <TabsTrigger value="exams">Exams ({categorized.exams.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({categorized.upcoming.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            All Assignments
          </h3>
          {assignments.map(renderAssignmentCard)}
        </TabsContent>

        <TabsContent value="journals" className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Listening Journals
          </h3>
          {categorized.journals.map(renderAssignmentCard)}
        </TabsContent>

        <TabsContent value="essays" className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Essays & Papers
          </h3>
          {categorized.essays.map(renderAssignmentCard)}
        </TabsContent>

        <TabsContent value="exams" className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Exams
          </h3>
          {categorized.exams.map(renderAssignmentCard)}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Assignments
          </h3>
          {categorized.upcoming.map(renderAssignmentCard)}
          {categorized.upcoming.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <p className="text-muted-foreground">No upcoming assignments</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};