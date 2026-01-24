import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertCircle, FileText, Users, MessageSquare, Calendar, Calculator } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { calculateLetterGrade, getLetterGradeColor } from '@/utils/grading';

// MUS240 Grade Weights from Syllabus
const GRADE_WEIGHTS = {
  assignments: 35,
  midterm: 15,
  finalExam: 20,
  groupProject: 15,
  participation: 15
};

interface StudentGradeSpreadsheetProps {
  courseId: string;
}

interface GradeItem {
  id: string;
  category: 'assignment' | 'midterm' | 'final' | 'group_project' | 'participation';
  name: string;
  dueDate: string | null;
  maxPoints: number;
  earnedPoints: number | null;
  status: 'graded' | 'submitted' | 'pending' | 'not_submitted';
  weight: number;
  weightedScore: number;
}

export const StudentGradeSpreadsheet: React.FC<StudentGradeSpreadsheetProps> = ({ courseId }) => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['student-grade-spreadsheet', courseId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch all assignments for this course
      const { data: assignments } = await supabase
        .from('gw_course_assignments')
        .select('id, title, due_date, points, assignment_type')
        .eq('course_id', courseId)
        .eq('is_published', true)
        .order('due_date', { ascending: true });

      // Fetch student's submissions
      const assignmentIds = assignments?.map(a => a.id) || [];
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, grade, status, submitted_at')
        .eq('student_id', user.id)
        .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['none']);

      // Fetch journal grades
      const { data: journalGrades } = await supabase
        .from('mus240_journal_grades')
        .select('id, graded_at, overall_score, instructor_score')
        .eq('student_id', user.id);

      // Fetch midterm submission
      const { data: midtermSubmission } = await supabase
        .from('mus240_midterm_submissions')
        .select('grade, is_submitted')
        .eq('user_id', user.id)
        .eq('is_submitted', true)
        .maybeSingle();

      // Fetch final exam submission
      const FINAL_EXAM_TEST_ID = '5efe7df8-6eb6-4611-b2d6-61ddf0319c7e';
      const { data: finalSubmission } = await supabase
        .from('test_submissions')
        .select('total_score, percentage')
        .eq('test_id', FINAL_EXAM_TEST_ID)
        .eq('student_id', user.id)
        .maybeSingle();

      // Fetch discussion grades
      const { data: discussionPrompts } = await supabase
        .from('discussion_prompts')
        .select('id, title')
        .eq('course_id', courseId);
      
      const discussionIds = discussionPrompts?.map(d => d.id) || [];
      const { data: discussionGrades } = await supabase
        .from('discussion_grades')
        .select('discussion_id, total_score')
        .eq('student_id', user.id)
        .in('discussion_id', discussionIds.length > 0 ? discussionIds : ['none']);

      // Fetch polls answered
      const { data: pollsAnswered } = await supabase
        .from('mus240_poll_responses')
        .select('poll_id')
        .eq('student_id', user.id);

      // Fetch total polls for course
      const { data: totalPolls } = await supabase
        .from('mus240_polls')
        .select('id')
        .eq('is_active', true);

      // Fetch attendance
      const { data: attendance } = await supabase
        .from('attendance')
        .select('status, event_id')
        .eq('user_id', user.id);

      return {
        assignments: assignments || [],
        submissions: submissions || [],
        journalGrades: journalGrades || [],
        midtermSubmission,
        finalSubmission,
        discussionPrompts: discussionPrompts || [],
        discussionGrades: discussionGrades || [],
        pollsAnswered: pollsAnswered || [],
        totalPolls: totalPolls || [],
        attendance: attendance || []
      };
    },
    enabled: !!user?.id
  });

  if (isLoading) {
    return <LoadingSpinner size="md" text="Loading grades..." />;
  }

  if (!data) {
    return <div className="text-center text-muted-foreground py-8">No grade data available</div>;
  }

  // Build grade items list
  const gradeItems: GradeItem[] = [];
  const submissionMap = new Map(data.submissions.map(s => [s.assignment_id, s]));

  // Add regular assignments
  let totalAssignmentPoints = 0;
  let earnedAssignmentPoints = 0;
  data.assignments.forEach(assignment => {
    const submission = submissionMap.get(assignment.id);
    totalAssignmentPoints += assignment.points || 0;
    if (submission?.status === 'graded' && submission.grade !== null) {
      earnedAssignmentPoints += submission.grade;
    }
    gradeItems.push({
      id: assignment.id,
      category: 'assignment',
      name: assignment.title,
      dueDate: assignment.due_date,
      maxPoints: assignment.points || 0,
      earnedPoints: submission?.status === 'graded' ? submission.grade : null,
      status: submission?.status === 'graded' ? 'graded' : 
              submission?.status === 'submitted' ? 'submitted' : 
              submission ? 'pending' : 'not_submitted',
      weight: 0,
      weightedScore: 0
    });
  });

  // Add journal entries
  let totalJournalPoints = 0;
  let earnedJournalPoints = 0;
  data.journalGrades.forEach((journal: any, index: number) => {
    const score = journal.instructor_score ?? journal.overall_score ?? 0;
    totalJournalPoints += 20; // Assuming 20 points per journal
    earnedJournalPoints += score;
    gradeItems.push({
      id: journal.id,
      category: 'assignment',
      name: `Journal Entry ${index + 1}`,
      dueDate: journal.graded_at,
      maxPoints: 20,
      earnedPoints: score,
      status: 'graded',
      weight: 0,
      weightedScore: 0
    });
  });

  // Calculate assignment weighted score
  const totalAssignmentMax = totalAssignmentPoints + totalJournalPoints;
  const totalAssignmentEarned = earnedAssignmentPoints + earnedJournalPoints;
  const assignmentsWeightedScore = totalAssignmentMax > 0 
    ? (totalAssignmentEarned / totalAssignmentMax) * GRADE_WEIGHTS.assignments 
    : 0;

  // Add Midterm
  const midtermMaxPoints = 100;
  const midtermEarned = data.midtermSubmission?.grade || null;
  const midtermWeightedScore = midtermEarned !== null 
    ? (midtermEarned / midtermMaxPoints) * GRADE_WEIGHTS.midterm 
    : 0;
  gradeItems.push({
    id: 'midterm',
    category: 'midterm',
    name: 'Midterm Exam',
    dueDate: null,
    maxPoints: midtermMaxPoints,
    earnedPoints: midtermEarned,
    status: midtermEarned !== null ? 'graded' : 'not_submitted',
    weight: GRADE_WEIGHTS.midterm,
    weightedScore: midtermWeightedScore
  });

  // Add Final Exam
  const finalMaxPoints = 100;
  const finalEarned = data.finalSubmission?.total_score || null;
  const finalWeightedScore = finalEarned !== null 
    ? (finalEarned / finalMaxPoints) * GRADE_WEIGHTS.finalExam 
    : 0;
  gradeItems.push({
    id: 'final',
    category: 'final',
    name: 'Final Exam',
    dueDate: null,
    maxPoints: finalMaxPoints,
    earnedPoints: finalEarned,
    status: finalEarned !== null ? 'graded' : 'not_submitted',
    weight: GRADE_WEIGHTS.finalExam,
    weightedScore: finalWeightedScore
  });

  // Add Group Project (placeholder - would need actual project data)
  gradeItems.push({
    id: 'group_project',
    category: 'group_project',
    name: 'Group Project',
    dueDate: null,
    maxPoints: 100,
    earnedPoints: null,
    status: 'pending',
    weight: GRADE_WEIGHTS.groupProject,
    weightedScore: 0
  });

  // Calculate Participation (Polls + Discussions + Attendance)
  const uniquePolls = new Set(data.pollsAnswered.map(p => p.poll_id)).size;
  const totalPollCount = data.totalPolls.length;
  const pollScore = totalPollCount > 0 ? (uniquePolls / totalPollCount) * 5 : 0;

  const discussionTotal = data.discussionGrades.reduce((sum, d) => sum + (d.total_score || 0), 0);
  const discussionCount = data.discussionGrades.length;
  const discussionAvg = discussionCount > 0 ? discussionTotal / discussionCount : 0;
  const discussionScore = (discussionAvg / 100) * 5;

  const presentCount = data.attendance.filter(a => a.status === 'present' || a.status === 'excused').length;
  const totalAttendance = data.attendance.length;
  const attendanceRate = totalAttendance > 0 ? presentCount / totalAttendance : 1;
  const attendanceScore = attendanceRate * 5;

  const participationWeightedScore = pollScore + discussionScore + attendanceScore;

  // Add participation breakdown items
  gradeItems.push({
    id: 'polls',
    category: 'participation',
    name: `Polls (${uniquePolls}/${totalPollCount} completed)`,
    dueDate: null,
    maxPoints: 5,
    earnedPoints: Math.round(pollScore * 10) / 10,
    status: 'graded',
    weight: 5,
    weightedScore: pollScore
  });

  gradeItems.push({
    id: 'discussions',
    category: 'participation',
    name: `Discussion Participation (${discussionCount} graded)`,
    dueDate: null,
    maxPoints: 5,
    earnedPoints: Math.round(discussionScore * 10) / 10,
    status: discussionCount > 0 ? 'graded' : 'pending',
    weight: 5,
    weightedScore: discussionScore
  });

  gradeItems.push({
    id: 'attendance',
    category: 'participation',
    name: `Attendance (${presentCount}/${totalAttendance} sessions)`,
    dueDate: null,
    maxPoints: 5,
    earnedPoints: Math.round(attendanceScore * 10) / 10,
    status: 'graded',
    weight: 5,
    weightedScore: attendanceScore
  });

  // Calculate totals
  const totalWeightedScore = assignmentsWeightedScore + midtermWeightedScore + finalWeightedScore + participationWeightedScore;
  const letterGrade = calculateLetterGrade(totalWeightedScore, 100);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'graded': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'submitted': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'graded': return <Badge variant="default" className="bg-green-600">Graded</Badge>;
      case 'submitted': return <Badge variant="secondary">Submitted</Badge>;
      case 'pending': return <Badge variant="outline">Pending</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground">Not Submitted</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'assignment': return <FileText className="h-4 w-4" />;
      case 'midterm': return <Calculator className="h-4 w-4" />;
      case 'final': return <Calculator className="h-4 w-4" />;
      case 'group_project': return <Users className="h-4 w-4" />;
      case 'participation': return <MessageSquare className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Group items by category for summary
  const categorySummary = [
    { 
      name: 'Assignments & Journals', 
      weight: GRADE_WEIGHTS.assignments, 
      earned: Math.round(assignmentsWeightedScore * 100) / 100,
      icon: <FileText className="h-5 w-5" />
    },
    { 
      name: 'Midterm Exam', 
      weight: GRADE_WEIGHTS.midterm, 
      earned: Math.round(midtermWeightedScore * 100) / 100,
      icon: <Calculator className="h-5 w-5" />
    },
    { 
      name: 'Final Exam', 
      weight: GRADE_WEIGHTS.finalExam, 
      earned: Math.round(finalWeightedScore * 100) / 100,
      icon: <Calculator className="h-5 w-5" />
    },
    { 
      name: 'Group Project', 
      weight: GRADE_WEIGHTS.groupProject, 
      earned: 0,
      icon: <Users className="h-5 w-5" />
    },
    { 
      name: 'Participation', 
      weight: GRADE_WEIGHTS.participation, 
      earned: Math.round(participationWeightedScore * 100) / 100,
      icon: <MessageSquare className="h-5 w-5" />
    }
  ];

  return (
    <div className="space-y-6">
      {/* Grade Summary Card */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Grade Calculation Summary
            </span>
            <div className={cn("text-3xl font-bold px-4 py-2 rounded-lg", getLetterGradeColor(letterGrade))}>
              {Math.round(totalWeightedScore * 10) / 10}% ({letterGrade})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold">Category</TableHead>
                <TableHead className="text-center font-bold">Weight</TableHead>
                <TableHead className="text-center font-bold">Points Earned</TableHead>
                <TableHead className="text-right font-bold">Weighted Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorySummary.map((cat, index) => (
                <TableRow key={index} className="hover:bg-muted/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {cat.icon}
                      {cat.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{cat.weight}%</TableCell>
                  <TableCell className="text-center">
                    {cat.earned.toFixed(1)} / {cat.weight}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {cat.earned.toFixed(2)}%
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-primary/10 font-bold border-t-2">
                <TableCell colSpan={2}>TOTAL GRADE</TableCell>
                <TableCell className="text-center">
                  {(Math.round(totalWeightedScore * 10) / 10).toFixed(1)} / 100
                </TableCell>
                <TableCell className="text-right text-lg">
                  {(Math.round(totalWeightedScore * 10) / 10).toFixed(1)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detailed Grade Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-[40px]"></TableHead>
                  <TableHead className="font-bold min-w-[200px]">Assignment</TableHead>
                  <TableHead className="text-center font-bold min-w-[100px]">Due Date</TableHead>
                  <TableHead className="text-center font-bold min-w-[80px]">Status</TableHead>
                  <TableHead className="text-center font-bold min-w-[100px]">Points</TableHead>
                  <TableHead className="text-center font-bold min-w-[80px]">Score %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Assignments Section */}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={6} className="font-bold text-primary">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      ASSIGNMENTS & JOURNALS ({GRADE_WEIGHTS.assignments}% of grade)
                    </div>
                  </TableCell>
                </TableRow>
                {gradeItems.filter(item => item.category === 'assignment').map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell>{getStatusIcon(item.status)}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-center">
                      {item.earnedPoints !== null ? (
                        <span className={cn(
                          "font-semibold",
                          item.earnedPoints / item.maxPoints >= 0.9 ? "text-green-600" :
                          item.earnedPoints / item.maxPoints >= 0.7 ? "text-blue-600" :
                          "text-orange-600"
                        )}>
                          {item.earnedPoints} / {item.maxPoints}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">- / {item.maxPoints}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.earnedPoints !== null ? (
                        <span className="font-medium">
                          {((item.earnedPoints / item.maxPoints) * 100).toFixed(1)}%
                        </span>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-blue-500/10 border-t">
                  <TableCell colSpan={4} className="font-semibold text-right">
                    Assignments Subtotal ({GRADE_WEIGHTS.assignments}% weight):
                  </TableCell>
                  <TableCell className="text-center font-bold">
                    {totalAssignmentEarned} / {totalAssignmentMax}
                  </TableCell>
                  <TableCell className="text-center font-bold text-primary">
                    = {assignmentsWeightedScore.toFixed(2)}%
                  </TableCell>
                </TableRow>

                {/* Exams Section */}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={6} className="font-bold text-primary">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      EXAMS ({GRADE_WEIGHTS.midterm + GRADE_WEIGHTS.finalExam}% of grade)
                    </div>
                  </TableCell>
                </TableRow>
                {gradeItems.filter(item => item.category === 'midterm' || item.category === 'final').map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell>{getStatusIcon(item.status)}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">-</TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-center">
                      {item.earnedPoints !== null ? (
                        <span className="font-semibold">{item.earnedPoints} / {item.maxPoints}</span>
                      ) : (
                        <span className="text-muted-foreground">- / {item.maxPoints}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-bold text-primary">
                      = {item.weightedScore.toFixed(2)}% (of {item.weight}%)
                    </TableCell>
                  </TableRow>
                ))}

                {/* Group Project Section */}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={6} className="font-bold text-primary">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      GROUP PROJECT ({GRADE_WEIGHTS.groupProject}% of grade)
                    </div>
                  </TableCell>
                </TableRow>
                {gradeItems.filter(item => item.category === 'group_project').map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell>{getStatusIcon(item.status)}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">-</TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-center text-muted-foreground">- / {item.maxPoints}</TableCell>
                    <TableCell className="text-center text-muted-foreground">-</TableCell>
                  </TableRow>
                ))}

                {/* Participation Section */}
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={6} className="font-bold text-primary">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      PARTICIPATION ({GRADE_WEIGHTS.participation}% of grade)
                    </div>
                  </TableCell>
                </TableRow>
                {gradeItems.filter(item => item.category === 'participation').map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/20">
                    <TableCell>{getStatusIcon(item.status)}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">-</TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">{item.earnedPoints?.toFixed(1)} / {item.maxPoints}</span>
                    </TableCell>
                    <TableCell className="text-center font-bold text-primary">
                      = {item.weightedScore.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-purple-500/10 border-t">
                  <TableCell colSpan={4} className="font-semibold text-right">
                    Participation Subtotal ({GRADE_WEIGHTS.participation}% weight):
                  </TableCell>
                  <TableCell className="text-center font-bold">
                    {participationWeightedScore.toFixed(1)} / 15
                  </TableCell>
                  <TableCell className="text-center font-bold text-primary">
                    = {participationWeightedScore.toFixed(2)}%
                  </TableCell>
                </TableRow>

                {/* Final Total Row */}
                <TableRow className="bg-primary/20 border-t-4 border-primary">
                  <TableCell colSpan={4} className="font-bold text-lg">
                    FINAL COURSE GRADE
                  </TableCell>
                  <TableCell className="text-center font-bold text-lg">
                    {totalWeightedScore.toFixed(1)} / 100
                  </TableCell>
                  <TableCell className={cn("text-center font-bold text-xl", getLetterGradeColor(letterGrade))}>
                    {totalWeightedScore.toFixed(1)}% ({letterGrade})
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Grade Scale Reference */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Grade Scale Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 sm:grid-cols-11 gap-1 text-center text-xs sm:text-sm">
            {[
              { grade: 'A', range: '95-100' },
              { grade: 'A-', range: '90-94' },
              { grade: 'B+', range: '87-89' },
              { grade: 'B', range: '83-86' },
              { grade: 'B-', range: '80-82' },
              { grade: 'C+', range: '77-79' },
              { grade: 'C', range: '73-76' },
              { grade: 'C-', range: '70-72' },
              { grade: 'D+', range: '65-69' },
              { grade: 'D', range: '60-64' },
              { grade: 'F', range: '0-59' }
            ].map((item) => (
              <div 
                key={item.grade} 
                className={cn(
                  "p-2 rounded-lg bg-muted/50 border",
                  letterGrade === item.grade && "ring-2 ring-primary bg-primary/20"
                )}
              >
                <div className="font-bold">{item.grade}</div>
                <div className="text-xs text-muted-foreground">{item.range}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
