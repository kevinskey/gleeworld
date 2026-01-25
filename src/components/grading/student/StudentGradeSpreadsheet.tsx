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
  // 10 Essays
  midterm: 15,
  finalExam: 20,
  groupProject: 15,
  participation: 15
};

// Course structure constants
const TOTAL_ESSAYS = 10;
const TOTAL_GROUP_PROJECTS = 1;
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
export const StudentGradeSpreadsheet: React.FC<StudentGradeSpreadsheetProps> = ({
  courseId
}) => {
  const {
    user
  } = useAuth();
  const {
    data,
    isLoading
  } = useQuery({
    queryKey: ['student-grade-spreadsheet', courseId, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch all assignments for this course
      const {
        data: assignments
      } = await supabase.from('gw_course_assignments').select('id, title, due_date, points, assignment_type').eq('course_id', courseId).eq('is_published', true).order('due_date', {
        ascending: true
      });

      // Fetch student's submissions
      const assignmentIds = assignments?.map(a => a.id) || [];
      const {
        data: submissions
      } = await supabase.from('assignment_submissions').select('assignment_id, grade, status, submitted_at').eq('student_id', user.id).in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['none']);

      // Fetch journal grades
      const {
        data: journalGrades
      } = await supabase.from('mus240_journal_grades').select('id, graded_at, overall_score, instructor_score').eq('student_id', user.id);

      // Fetch midterm submission
      const {
        data: midtermSubmission
      } = await supabase.from('mus240_midterm_submissions').select('grade, is_submitted').eq('user_id', user.id).eq('is_submitted', true).maybeSingle();

      // Fetch final exam submission
      const FINAL_EXAM_TEST_ID = '5efe7df8-6eb6-4611-b2d6-61ddf0319c7e';
      const {
        data: finalSubmission
      } = await supabase.from('test_submissions').select('total_score, percentage').eq('test_id', FINAL_EXAM_TEST_ID).eq('student_id', user.id).maybeSingle();

      // Fetch discussion grades
      const {
        data: discussionPrompts
      } = await supabase.from('discussion_prompts').select('id, title').eq('course_id', courseId);
      const discussionIds = discussionPrompts?.map(d => d.id) || [];
      const {
        data: discussionGrades
      } = await supabase.from('discussion_grades').select('discussion_id, total_score').eq('student_id', user.id).in('discussion_id', discussionIds.length > 0 ? discussionIds : ['none']);

      // Fetch polls answered
      const {
        data: pollsAnswered
      } = await supabase.from('mus240_poll_responses').select('poll_id').eq('student_id', user.id);

      // Fetch total polls for course
      const {
        data: totalPolls
      } = await supabase.from('mus240_polls').select('id').eq('is_active', true);

      // Fetch attendance records for this student
      const {
        data: attendance
      } = await supabase.from('attendance').select('status, event_id').eq('user_id', user.id);

      // Fetch total class sessions for this course from events table
      // MUS-240 class sessions are titled "Survey of African American Music Class"
      const {
        data: classSessions
      } = await supabase
        .from('events')
        .select('id')
        .or(`course_id.eq.${courseId},title.ilike.%Survey of African American Music%`)
        .lte('start_date', new Date().toISOString()); // Only count past sessions

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
        attendance: attendance || [],
        totalClassSessions: classSessions?.length || 0
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

  // Add regular assignments - track graded vs total separately
  let gradedAssignmentPoints = 0; // Max points for GRADED assignments only
  let earnedAssignmentPoints = 0; // Points earned on GRADED assignments
  data.assignments.forEach(assignment => {
    const submission = submissionMap.get(assignment.id);
    const isGraded = submission?.status === 'graded' && submission.grade !== null;
    if (isGraded) {
      gradedAssignmentPoints += assignment.points || 0;
      earnedAssignmentPoints += submission.grade;
    }
    gradeItems.push({
      id: assignment.id,
      category: 'assignment',
      name: assignment.title,
      dueDate: assignment.due_date,
      maxPoints: assignment.points || 0,
      earnedPoints: isGraded ? submission.grade : null,
      status: isGraded ? 'graded' : submission?.status === 'submitted' ? 'submitted' : submission ? 'pending' : 'not_submitted',
      weight: 0,
      weightedScore: 0
    });
  });

  // Add journal entries (journals are always graded when they appear here)
  let gradedJournalPoints = 0;
  let earnedJournalPoints = 0;
  data.journalGrades.forEach((journal: any, index: number) => {
    const score = journal.instructor_score ?? journal.overall_score ?? 0;
    gradedJournalPoints += 20; // Assuming 20 points per journal
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

  // Calculate assignment weighted score - ONLY from graded items
  // If nothing is graded yet, no deduction (student keeps full weight)
  const totalGradedAssignmentMax = gradedAssignmentPoints + gradedJournalPoints;
  const totalGradedAssignmentEarned = earnedAssignmentPoints + earnedJournalPoints;
  const hasGradedAssignments = totalGradedAssignmentMax > 0;

  // Deduction = (points lost / max points) * weight
  // If nothing graded, deduction = 0 (assumed 100%)
  const assignmentLostPercentage = hasGradedAssignments ? (totalGradedAssignmentMax - totalGradedAssignmentEarned) / totalGradedAssignmentMax : 0;
  const assignmentsWeightedScore = hasGradedAssignments ? totalGradedAssignmentEarned / totalGradedAssignmentMax * GRADE_WEIGHTS.assignments : GRADE_WEIGHTS.assignments; // Full credit if nothing graded yet

  // Add Midterm
  const midtermMaxPoints = 100;
  const midtermEarned = data.midtermSubmission?.grade || null;
  const midtermWeightedScore = midtermEarned !== null ? midtermEarned / midtermMaxPoints * GRADE_WEIGHTS.midterm : 0;
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
  const finalWeightedScore = finalEarned !== null ? finalEarned / finalMaxPoints * GRADE_WEIGHTS.finalExam : 0;
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

  // Calculate Participation (Polls 25%, Discussions 25%, Attendance 50%)
  // Weighted within 15%: Polls 3.75%, Discussions 3.75%, Attendance 7.5%
  const uniquePolls = new Set(data.pollsAnswered.map(p => p.poll_id)).size;
  const totalPollCount = data.totalPolls.length;
  // Polls: only count if there are polls to answer
  const hasPollActivity = totalPollCount > 0;
  const pollScore = hasPollActivity ? uniquePolls / totalPollCount * 3.75 : 0;
  
  const discussionTotal = data.discussionGrades.reduce((sum, d) => sum + (d.total_score || 0), 0);
  const discussionCount = data.discussionGrades.length;
  const discussionAvg = discussionCount > 0 ? discussionTotal / discussionCount : 0;
  const discussionScore = discussionAvg / 100 * 3.75;
  
  const presentCount = data.attendance.filter(a => a.status === 'present' || a.status === 'excused').length;
  const absentCount = data.attendance.filter(a => a.status === 'absent').length;
  // Use total class sessions from events table instead of just recorded attendance
  const totalSessions = data.totalClassSessions || 0;
  // Attendance: only calculate if there are sessions that have occurred
  const hasAttendanceActivity = totalSessions > 0;
  // Calculate attendance rate based on present/excused vs total sessions
  const attendanceRate = hasAttendanceActivity ? presentCount / totalSessions : 0;
  const attendanceScore = hasAttendanceActivity ? attendanceRate * 7.5 : 0;
  
  // Only count participation components that have activity
  const participationWeightedScore = 
    (hasPollActivity ? pollScore : 3.75) + // Assume 100% if no polls yet
    (discussionCount > 0 ? discussionScore : 3.75) + // Assume 100% if no discussions yet
    (hasAttendanceActivity ? attendanceScore : 7.5); // Assume 100% if no attendance yet

  // Add participation breakdown items
  gradeItems.push({
    id: 'polls',
    category: 'participation',
    name: `Polls (${uniquePolls}/${totalPollCount} completed)`,
    dueDate: null,
    maxPoints: 3.75,
    earnedPoints: hasPollActivity ? Math.round(pollScore * 10) / 10 : 0,
    status: hasPollActivity ? 'graded' : 'pending',
    weight: 3.75,
    weightedScore: hasPollActivity ? pollScore : 0
  });
  gradeItems.push({
    id: 'discussions',
    category: 'participation',
    name: `Discussion Participation (${discussionCount} graded)`,
    dueDate: null,
    maxPoints: 3.75,
    earnedPoints: Math.round(discussionScore * 10) / 10,
    status: discussionCount > 0 ? 'graded' : 'pending',
    weight: 3.75,
    weightedScore: discussionScore
  });
  gradeItems.push({
    id: 'attendance',
    category: 'participation',
    name: `Attendance (${presentCount}/${totalSessions} sessions)`,
    dueDate: null,
    maxPoints: 7.5,
    earnedPoints: hasAttendanceActivity ? Math.round(attendanceScore * 10) / 10 : 0,
    status: hasAttendanceActivity ? 'graded' : 'pending',
    weight: 7.5,
    weightedScore: hasAttendanceActivity ? attendanceScore : 0
  });

  // Calculate deductions (starting from 100%)
  // ONLY graded items contribute deductions - ungraded = 0 deduction (assumed 100%)
  const assignmentDeduction = hasGradedAssignments ? assignmentLostPercentage * GRADE_WEIGHTS.assignments : 0;
  const midtermDeduction = midtermEarned !== null ? GRADE_WEIGHTS.midterm - midtermWeightedScore : 0;
  const finalDeduction = finalEarned !== null ? GRADE_WEIGHTS.finalExam - finalWeightedScore : 0;
  // Participation: only count if there's any activity
  const hasParticipation = data.pollsAnswered.length > 0 || data.discussionGrades.length > 0 || data.attendance.length > 0;
  const participationDeduction = hasParticipation ? GRADE_WEIGHTS.participation - participationWeightedScore : 0;

  // Total deductions
  const totalDeductions = assignmentDeduction + midtermDeduction + finalDeduction + participationDeduction;

  // Final grade = 100 - total deductions
  const currentGrade = Math.max(0, 100 - totalDeductions);
  const letterGrade = calculateLetterGrade(currentGrade, 100);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'graded':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'submitted':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'graded':
        return <Badge variant="default" className="bg-green-600">Graded</Badge>;
      case 'submitted':
        return <Badge variant="secondary">Submitted</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Not Submitted</Badge>;
    }
  };
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'assignment':
        return <FileText className="h-4 w-4" />;
      case 'midterm':
        return <Calculator className="h-4 w-4" />;
      case 'final':
        return <Calculator className="h-4 w-4" />;
      case 'group_project':
        return <Users className="h-4 w-4" />;
      case 'participation':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Count graded essays
  const gradedEssayCount = gradeItems.filter(item => item.category === 'assignment' && item.status === 'graded').length;

  // Group items by category for summary - DEDUCTIVE MODEL
  const categorySummary = [{
    name: `Essays (${gradedEssayCount}/${TOTAL_ESSAYS} graded)`,
    weight: GRADE_WEIGHTS.assignments,
    deduction: hasGradedAssignments ? Math.round(assignmentDeduction * 100) / 100 : null,
    icon: <FileText className="h-5 w-5" />,
    status: hasGradedAssignments ? 'active' : 'pending'
  }, {
    name: 'Midterm Exam',
    weight: GRADE_WEIGHTS.midterm,
    deduction: midtermEarned !== null ? Math.round(midtermDeduction * 100) / 100 : null,
    icon: <Calculator className="h-5 w-5" />,
    status: midtermEarned !== null ? 'active' : 'pending'
  }, {
    name: 'Final Exam',
    weight: GRADE_WEIGHTS.finalExam,
    deduction: finalEarned !== null ? Math.round(finalDeduction * 100) / 100 : null,
    icon: <Calculator className="h-5 w-5" />,
    status: finalEarned !== null ? 'active' : 'pending'
  }, {
    name: `Group Project (0/${TOTAL_GROUP_PROJECTS} graded)`,
    weight: GRADE_WEIGHTS.groupProject,
    deduction: null,
    icon: <Users className="h-5 w-5" />,
    status: 'pending'
  }, {
    name: 'Participation',
    weight: GRADE_WEIGHTS.participation,
    deduction: hasParticipation ? Math.round(participationDeduction * 100) / 100 : null,
    icon: <MessageSquare className="h-5 w-5" />,
    status: hasParticipation ? 'active' : 'pending'
  }];
  return <div className="space-y-6">
      {/* Grade Summary Card - DEDUCTIVE MODEL */}
      <Card className="border-2 border-primary/20 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-slate-900 dark:text-slate-100">
            <span className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Grade Calculation (Starting at 100%)
            </span>
            <div className={cn("text-3xl font-bold px-4 py-2 rounded-lg", getLetterGradeColor(letterGrade))}>
              {Math.round(currentGrade * 10) / 10}% ({letterGrade})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Starting Point */}
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-green-800 dark:text-green-200">Starting Grade</span>
              <span className="text-2xl font-bold text-green-700 dark:text-green-300">100%</span>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-slate-100 dark:bg-slate-800">
                <TableHead className="font-bold text-slate-900 dark:text-slate-100">Category</TableHead>
                <TableHead className="text-center font-bold text-slate-900 dark:text-slate-100">Weight</TableHead>
                <TableHead className="text-center font-bold text-slate-900 dark:text-slate-100">Status</TableHead>
                <TableHead className="text-right font-bold text-red-600 dark:text-red-400">Deduction</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorySummary.map((cat, index) => <TableRow key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      {cat.icon}
                      {cat.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-slate-700 dark:text-slate-300">{cat.weight}%</TableCell>
                  <TableCell className="text-center">
                    {cat.status === 'pending' ? <Badge variant="outline" className="text-muted-foreground">Not Graded</Badge> : <Badge variant="default" className="bg-green-600">Graded</Badge>}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {cat.deduction !== null ? <span className={cn(cat.deduction > 0 ? "text-red-600" : "text-green-600")}>
                        {cat.deduction > 0 ? `-${cat.deduction.toFixed(2)}%` : '0.00%'}
                      </span> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>)}
              {/* Total Deductions Row */}
              <TableRow className="bg-red-50 dark:bg-red-950/30 border-t-2">
                <TableCell colSpan={3} className="font-bold text-red-700 dark:text-red-300">
                  TOTAL DEDUCTIONS
                </TableCell>
                <TableCell className="text-right text-lg font-bold text-red-600">
                  -{Math.round(totalDeductions * 100) / 100}%
                </TableCell>
              </TableRow>
              {/* Final Grade Row */}
              <TableRow className="bg-primary/10 font-bold border-t-2">
                <TableCell colSpan={3} className="text-lg">
                  CURRENT GRADE (100% − Deductions)
                </TableCell>
                <TableCell className="text-right text-xl">
                  <span className={cn("px-3 py-1 rounded", getLetterGradeColor(letterGrade))}>
                    {Math.round(currentGrade * 10) / 10}%
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100 text-lg">
            <FileText className="h-5 w-5" />
            Detailed Grade Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 dark:bg-slate-800">
                  <TableHead className="min-w-[40px]"></TableHead>
                  <TableHead className="font-bold min-w-[200px] text-slate-900 dark:text-slate-100">Assignment</TableHead>
                  <TableHead className="text-center font-bold min-w-[100px] text-slate-900 dark:text-slate-100">Due Date</TableHead>
                  <TableHead className="text-center font-bold min-w-[80px] text-slate-900 dark:text-slate-100">Status</TableHead>
                  <TableHead className="text-center font-bold min-w-[100px] text-slate-900 dark:text-slate-100">Points</TableHead>
                  <TableHead className="text-center font-bold min-w-[80px] text-slate-900 dark:text-slate-100">Score %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Essays Section */}
                <TableRow className="bg-slate-200 dark:bg-slate-700">
                  <TableCell colSpan={6} className="font-bold text-blue-700 dark:text-blue-300">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      ESSAYS — {gradedEssayCount}/{TOTAL_ESSAYS} graded ({GRADE_WEIGHTS.assignments}% of grade)
                    </div>
                  </TableCell>
                </TableRow>
                {gradeItems.filter(item => item.category === 'assignment').map(item => <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <TableCell>{getStatusIcon(item.status)}</TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">{item.name}</TableCell>
                    <TableCell className="text-center text-sm text-slate-600 dark:text-slate-400">
                      {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-center">
                      {item.earnedPoints !== null ? <span className={cn("font-semibold", item.earnedPoints / item.maxPoints >= 0.9 ? "text-green-600 dark:text-green-400" : item.earnedPoints / item.maxPoints >= 0.7 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400")}>
                          {item.earnedPoints} / {item.maxPoints}
                        </span> : <span className="text-slate-500 dark:text-slate-400">- / {item.maxPoints}</span>}
                    </TableCell>
                    <TableCell className="text-center text-slate-700 dark:text-slate-300">
                      {item.earnedPoints !== null ? <span className="font-medium">
                          {(item.earnedPoints / item.maxPoints * 100).toFixed(1)}%
                        </span> : '-'}
                    </TableCell>
                  </TableRow>)}
                <TableRow className="bg-blue-100 dark:bg-blue-900/30 border-t">
                  <TableCell colSpan={4} className="font-semibold text-right text-slate-700 dark:text-slate-300">
                    Essays Subtotal ({gradedEssayCount}/{TOTAL_ESSAYS} graded, {GRADE_WEIGHTS.assignments}% weight):
                  </TableCell>
                  <TableCell className="text-center font-bold text-slate-900 dark:text-slate-100">
                    {hasGradedAssignments ? `${totalGradedAssignmentEarned} / ${totalGradedAssignmentMax} pts` : 'Not graded yet'}
                  </TableCell>
                  <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300">
                    {hasGradedAssignments ? `−${assignmentDeduction.toFixed(2)}% deduction` : '0% deduction'}
                  </TableCell>
                </TableRow>

                {/* Exams Section */}
                <TableRow className="bg-slate-200 dark:bg-slate-700">
                  <TableCell colSpan={6} className="font-bold text-blue-700 dark:text-blue-300">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      EXAMS ({GRADE_WEIGHTS.midterm + GRADE_WEIGHTS.finalExam}% of grade)
                    </div>
                  </TableCell>
                </TableRow>
                {gradeItems.filter(item => item.category === 'midterm' || item.category === 'final').map(item => <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <TableCell>{getStatusIcon(item.status)}</TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">{item.name}</TableCell>
                    <TableCell className="text-center text-sm text-slate-600 dark:text-slate-400">-</TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-center">
                      {item.earnedPoints !== null ? <span className="font-semibold text-slate-900 dark:text-slate-100">{item.earnedPoints} / {item.maxPoints}</span> : <span className="text-slate-500 dark:text-slate-400">- / {item.maxPoints}</span>}
                    </TableCell>
                    <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300">
                      = {item.weightedScore.toFixed(2)}% (of {item.weight}%)
                    </TableCell>
                  </TableRow>)}

                {/* Group Project Section */}
                <TableRow className="bg-slate-200 dark:bg-slate-700">
                  <TableCell colSpan={6} className="font-bold text-blue-700 dark:text-blue-300">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      GROUP PROJECT ({GRADE_WEIGHTS.groupProject}% of grade)
                    </div>
                  </TableCell>
                </TableRow>
                {gradeItems.filter(item => item.category === 'group_project').map(item => <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <TableCell>{getStatusIcon(item.status)}</TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">{item.name}</TableCell>
                    <TableCell className="text-center text-sm text-slate-600 dark:text-slate-400">-</TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-center text-slate-500 dark:text-slate-400">- / {item.maxPoints}</TableCell>
                    <TableCell className="text-center text-slate-500 dark:text-slate-400">-</TableCell>
                  </TableRow>)}

                {/* Participation Section */}
                <TableRow className="bg-slate-200 dark:bg-slate-700">
                  <TableCell colSpan={6} className="font-bold text-blue-700 dark:text-blue-300">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      PARTICIPATION ({GRADE_WEIGHTS.participation}% of grade)
                    </div>
                  </TableCell>
                </TableRow>
                {gradeItems.filter(item => item.category === 'participation').map(item => <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                    <TableCell>{getStatusIcon(item.status)}</TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">{item.name}</TableCell>
                    <TableCell className="text-center text-sm text-slate-600 dark:text-slate-400">-</TableCell>
                    <TableCell className="text-center">{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{item.earnedPoints?.toFixed(1)} / {item.maxPoints}</span>
                    </TableCell>
                    <TableCell className="text-center font-bold text-blue-700 dark:text-blue-300">
                      = {item.weightedScore.toFixed(2)}%
                    </TableCell>
                  </TableRow>)}
                <TableRow className="bg-purple-100 dark:bg-purple-900/30 border-t">
                  <TableCell colSpan={4} className="font-semibold text-right text-slate-700 dark:text-slate-300">
                    Participation Subtotal ({GRADE_WEIGHTS.participation}% weight):
                  </TableCell>
                  <TableCell className="text-center font-bold text-slate-900 dark:text-slate-100">
                    {participationWeightedScore.toFixed(1)} / 15
                  </TableCell>
                  <TableCell className="text-center font-bold text-purple-700 dark:text-purple-300">
                    = {participationWeightedScore.toFixed(2)}%
                  </TableCell>
                </TableRow>

                {/* Final Total Row */}
                <TableRow className="bg-green-100 dark:bg-green-900/30 border-t-4 border-green-500">
                  <TableCell colSpan={4} className="font-bold text-lg text-slate-900 dark:text-slate-100">
                    FINAL COURSE GRADE (100% − {totalDeductions.toFixed(1)}% deductions)
                  </TableCell>
                  <TableCell className="text-center font-bold text-lg text-slate-900 dark:text-slate-100">
                    {currentGrade.toFixed(1)} / 100
                  </TableCell>
                  <TableCell className={cn("text-center font-bold text-xl", getLetterGradeColor(letterGrade))}>
                    {currentGrade.toFixed(1)}% ({letterGrade})
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Grade Scale Reference */}
      <Card className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-slate-900 dark:text-slate-100">Grade Scale Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 sm:grid-cols-11 gap-1 text-center text-xs sm:text-sm">
            {[{
            grade: 'A',
            range: '95-100'
          }, {
            grade: 'A-',
            range: '90-94'
          }, {
            grade: 'B+',
            range: '87-89'
          }, {
            grade: 'B',
            range: '83-86'
          }, {
            grade: 'B-',
            range: '80-82'
          }, {
            grade: 'C+',
            range: '77-79'
          }, {
            grade: 'C',
            range: '73-76'
          }, {
            grade: 'C-',
            range: '70-72'
          }, {
            grade: 'D+',
            range: '65-69'
          }, {
            grade: 'D',
            range: '60-64'
          }, {
            grade: 'F',
            range: '0-59'
          }].map(item => <div key={item.grade} className={cn("p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700", letterGrade === item.grade && "ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/50")}>
                <div className="font-bold text-slate-900 dark:text-slate-100">{item.grade}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{item.range}</div>
              </div>)}
          </div>
        </CardContent>
      </Card>
    </div>;
};