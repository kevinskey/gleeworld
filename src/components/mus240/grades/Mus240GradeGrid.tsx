import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { 
  FileText, MessageSquare, Users, Calculator, 
  Check, X, Clock, Minus, RefreshCw, Download,
  GraduationCap, BarChart3
} from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { calculateLetterGrade, getLetterGradeColor } from '@/utils/grading';
import { format, parseISO } from 'date-fns';

const MUS240_COURSE_ID = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';

// MUS240 Grade Weights from Syllabus
const GRADE_WEIGHTS = {
  assignments: 35, // Essays
  midterm: 15,
  finalExam: 20,
  groupProject: 15,
  participation: 15 // Polls 25%, Discussions 25%, Attendance 50%
};

interface Mus240GradeGridProps {
  studentId?: string; // If provided, show only this student (for student view)
}

export const Mus240GradeGrid: React.FC<Mus240GradeGridProps> = ({ studentId }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const targetStudentId = studentId || user?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mus240-grade-grid', targetStudentId],
    queryFn: async () => {
      if (!targetStudentId) return null;

      // Fetch all assignments for this course
      const { data: assignments } = await supabase
        .from('gw_course_assignments')
        .select('id, title, due_date, points, assignment_type')
        .eq('course_id', MUS240_COURSE_ID)
        .eq('is_published', true)
        .order('due_date', { ascending: true });

      // Fetch student's submissions
      const assignmentIds = assignments?.map(a => a.id) || [];
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, grade, status, submitted_at')
        .eq('student_id', targetStudentId)
        .in('assignment_id', assignmentIds.length > 0 ? assignmentIds : ['none']);

      // Fetch journal grades
      const { data: journalGrades } = await supabase
        .from('mus240_journal_grades')
        .select('id, graded_at, overall_score, instructor_score, entry_id, mus240_journal_entries(session_id, class_journal_sessions(title, session_date))')
        .eq('student_id', targetStudentId);

      // Fetch midterm submission
      const { data: midtermSubmission } = await supabase
        .from('mus240_midterm_submissions')
        .select('grade, is_submitted')
        .eq('user_id', targetStudentId)
        .eq('is_submitted', true)
        .maybeSingle();

      // Fetch final exam submission
      const FINAL_EXAM_TEST_ID = '5efe7df8-6eb6-4611-b2d6-61ddf0319c7e';
      const { data: finalSubmission } = await supabase
        .from('test_submissions')
        .select('total_score, percentage')
        .eq('test_id', FINAL_EXAM_TEST_ID)
        .eq('student_id', targetStudentId)
        .maybeSingle();

      // Fetch discussion prompts and grades
      const { data: discussionPrompts } = await supabase
        .from('discussion_prompts')
        .select('id, title, created_at')
        .eq('course_id', MUS240_COURSE_ID)
        .order('created_at', { ascending: true });

      const discussionIds = discussionPrompts?.map(d => d.id) || [];
      const { data: discussionGrades } = await supabase
        .from('discussion_grades')
        .select('discussion_id, total_score')
        .eq('student_id', targetStudentId)
        .in('discussion_id', discussionIds.length > 0 ? discussionIds : ['none']);

      // Fetch polls and responses
      const { data: polls } = await supabase
        .from('mus240_polls')
        .select('id, title, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      const pollIds = polls?.map(p => p.id) || [];
      const { data: pollResponses } = await supabase
        .from('mus240_poll_responses')
        .select('poll_id')
        .eq('student_id', targetStudentId)
        .in('poll_id', pollIds.length > 0 ? pollIds : ['none']);

      // Fetch attendance sessions and records
      const { data: attendanceSessions } = await supabase
        .from('gw_attendance_sessions')
        .select('id, title, opens_at')
        .eq('course_id', MUS240_COURSE_ID)
        .order('opens_at', { ascending: true });

      const sessionIds = attendanceSessions?.map(s => s.id) || [];
      const { data: attendanceRecords } = await supabase
        .from('gw_attendance_records')
        .select('attendance_session_id, status')
        .eq('student_profile_id', targetStudentId)
        .in('attendance_session_id', sessionIds.length > 0 ? sessionIds : ['none']);

      return {
        assignments: assignments || [],
        submissions: submissions || [],
        journalGrades: journalGrades || [],
        midtermSubmission,
        finalSubmission,
        discussionPrompts: discussionPrompts || [],
        discussionGrades: discussionGrades || [],
        polls: polls || [],
        pollResponses: pollResponses || [],
        attendanceSessions: attendanceSessions || [],
        attendanceRecords: attendanceRecords || []
      };
    },
    enabled: !!targetStudentId
  });

  // Calculate grades
  const gradeCalculations = useMemo(() => {
    if (!data) return null;

    const submissionMap = new Map(data.submissions.map(s => [s.assignment_id, s]));
    const discussionGradeMap = new Map(data.discussionGrades.map(d => [d.discussion_id, d.total_score]));
    const pollResponseSet = new Set(data.pollResponses.map(p => p.poll_id));
    const attendanceMap = new Map(data.attendanceRecords.map(a => [a.attendance_session_id, a.status]));

    // Essays
    let gradedEssayPoints = 0;
    let earnedEssayPoints = 0;
    let gradedEssayCount = 0;
    const essayItems = data.assignments.map(a => {
      const submission = submissionMap.get(a.id);
      const isGraded = submission?.status === 'graded' && submission.grade !== null;
      if (isGraded) {
        gradedEssayPoints += a.points || 0;
        earnedEssayPoints += submission.grade;
        gradedEssayCount++;
      }
      return {
        id: a.id,
        name: a.title,
        dueDate: a.due_date,
        maxPoints: a.points || 0,
        earnedPoints: isGraded ? submission.grade : null,
        status: isGraded ? 'graded' : submission?.status || 'not_submitted'
      };
    });

    // Journals  
    let gradedJournalPoints = 0;
    let earnedJournalPoints = 0;
    const journalItems = data.journalGrades.map((j: any, idx: number) => {
      const score = j.instructor_score ?? j.overall_score ?? 0;
      gradedJournalPoints += 20;
      earnedJournalPoints += score;
      const session = j.mus240_journal_entries?.class_journal_sessions;
      return {
        id: j.id,
        name: session?.title || `Journal ${idx + 1}`,
        date: session?.session_date || j.graded_at,
        maxPoints: 20,
        earnedPoints: score,
        status: 'graded'
      };
    });

    // Discussions
    const discussionItems = data.discussionPrompts.map((d, idx) => ({
      id: d.id,
      name: d.title,
      week: idx + 1,
      maxPoints: 100,
      earnedPoints: discussionGradeMap.get(d.id) ?? null,
      status: discussionGradeMap.has(d.id) ? 'graded' : 'not_submitted'
    }));

    // Polls
    const pollItems = data.polls.map(p => ({
      id: p.id,
      name: p.title || 'Poll',
      date: p.created_at,
      completed: pollResponseSet.has(p.id)
    }));

    // Attendance
    const attendanceItems = data.attendanceSessions.map(s => ({
      id: s.id,
      date: s.opens_at,
      title: s.title,
      status: attendanceMap.get(s.id) || null
    }));

    // Calculate weighted scores
    const totalGradedMax = gradedEssayPoints + gradedJournalPoints;
    const totalGradedEarned = earnedEssayPoints + earnedJournalPoints;
    const hasGradedAssignments = totalGradedMax > 0;
    const assignmentPercent = hasGradedAssignments ? (totalGradedEarned / totalGradedMax) * 100 : 100;
    const assignmentWeighted = (assignmentPercent / 100) * GRADE_WEIGHTS.assignments;

    // Midterm
    const midtermScore = data.midtermSubmission?.grade ?? null;
    const midtermWeighted = midtermScore !== null ? (midtermScore / 100) * GRADE_WEIGHTS.midterm : 0;

    // Final
    const finalScore = data.finalSubmission?.total_score ?? null;
    const finalWeighted = finalScore !== null ? (finalScore / 100) * GRADE_WEIGHTS.finalExam : 0;

    // Participation components
    const pollsCompleted = data.pollResponses.length;
    const pollsTotal = data.polls.length;
    const pollPercent = pollsTotal > 0 ? (pollsCompleted / pollsTotal) * 100 : 100;

    const discussionsGraded = data.discussionGrades.length;
    const discussionAvg = discussionsGraded > 0 
      ? data.discussionGrades.reduce((sum, d) => sum + (d.total_score || 0), 0) / discussionsGraded 
      : 100;

    const presentCount = data.attendanceRecords.filter(a => a.status === 'present' || a.status === 'excused').length;
    const totalSessions = data.attendanceSessions.filter(s => new Date(s.opens_at) < new Date()).length;
    const attendancePercent = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 100;

    // Participation weighted: Polls 25%, Discussions 25%, Attendance 50%
    const participationPercent = (pollPercent * 0.25) + (discussionAvg * 0.25) + (attendancePercent * 0.5);
    const participationWeighted = (participationPercent / 100) * GRADE_WEIGHTS.participation;

    // Calculate deductions (starting from 100%)
    const assignmentDeduction = hasGradedAssignments ? GRADE_WEIGHTS.assignments - assignmentWeighted : 0;
    const midtermDeduction = midtermScore !== null ? GRADE_WEIGHTS.midterm - midtermWeighted : 0;
    const finalDeduction = finalScore !== null ? GRADE_WEIGHTS.finalExam - finalWeighted : 0;
    const hasParticipation = data.pollResponses.length > 0 || data.discussionGrades.length > 0 || data.attendanceRecords.length > 0;
    const participationDeduction = hasParticipation ? GRADE_WEIGHTS.participation - participationWeighted : 0;

    const totalDeductions = assignmentDeduction + midtermDeduction + finalDeduction + participationDeduction;
    const currentGrade = Math.max(0, 100 - totalDeductions);
    const letterGrade = calculateLetterGrade(currentGrade, 100);

    return {
      essayItems,
      journalItems,
      discussionItems,
      pollItems,
      attendanceItems,
      gradedEssayCount,
      totalEssays: data.assignments.length,
      pollsCompleted,
      pollsTotal,
      discussionsGraded,
      discussionsTotal: data.discussionPrompts.length,
      presentCount,
      totalSessions,
      assignmentPercent,
      pollPercent,
      discussionAvg,
      attendancePercent,
      participationPercent,
      midtermScore,
      finalScore,
      currentGrade,
      letterGrade,
      totalDeductions
    };
  }, [data]);

  if (isLoading) {
    return <LoadingSpinner size="md" text="Loading grades..." />;
  }

  if (!data || !gradeCalculations) {
    return <div className="text-center text-muted-foreground py-8">No grade data available</div>;
  }

  const { 
    essayItems, journalItems, discussionItems, pollItems, attendanceItems,
    currentGrade, letterGrade, totalDeductions
  } = gradeCalculations;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Grade Summary Hero */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold",
                  getLetterGradeColor(letterGrade)
                )}>
                  {letterGrade}
                </div>
                <div>
                  <div className="text-3xl font-bold">{currentGrade.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">
                    Total Deductions: -{totalDeductions.toFixed(1)}%
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Grid View */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Grade Details
                </CardTitle>
              </div>
              <TabsList className="grid grid-cols-4 w-full max-w-lg">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                <TabsTrigger value="assignments" className="text-xs sm:text-sm">Essays</TabsTrigger>
                <TabsTrigger value="discussions" className="text-xs sm:text-sm">Discussions</TabsTrigger>
                <TabsTrigger value="participation" className="text-xs sm:text-sm">Participation</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-0">
              {/* Overview Tab */}
              <TabsContent value="overview" className="m-0 p-4">
                <div className="grid gap-3">
                  {[
                    { 
                      name: `Essays (${gradeCalculations.gradedEssayCount}/${gradeCalculations.totalEssays})`,
                      weight: GRADE_WEIGHTS.assignments,
                      score: gradeCalculations.assignmentPercent,
                      icon: FileText
                    },
                    { 
                      name: 'Midterm Exam',
                      weight: GRADE_WEIGHTS.midterm,
                      score: gradeCalculations.midtermScore,
                      icon: Calculator
                    },
                    { 
                      name: 'Final Exam',
                      weight: GRADE_WEIGHTS.finalExam,
                      score: gradeCalculations.finalScore,
                      icon: Calculator
                    },
                    { 
                      name: 'Group Project',
                      weight: GRADE_WEIGHTS.groupProject,
                      score: null,
                      icon: Users
                    },
                    { 
                      name: 'Participation',
                      weight: GRADE_WEIGHTS.participation,
                      score: gradeCalculations.participationPercent,
                      icon: MessageSquare
                    }
                  ].map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <cat.icon className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <div className="font-medium">{cat.name}</div>
                        <div className="text-xs text-muted-foreground">{cat.weight}% of grade</div>
                      </div>
                      <div className="text-right">
                        {cat.score !== null ? (
                          <Badge className={cn(
                            cat.score >= 90 ? "bg-green-600" :
                            cat.score >= 80 ? "bg-blue-600" :
                            cat.score >= 70 ? "bg-yellow-600" : "bg-red-600"
                          )}>
                            {cat.score.toFixed(0)}%
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Graded</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Essays Tab */}
              <TabsContent value="assignments" className="m-0">
                <ScrollArea className="w-full">
                  <div className="min-w-max">
                    {/* Header */}
                    <div className="flex border-b bg-muted/50 sticky top-0 z-10">
                      <div className="w-48 min-w-48 p-2 font-semibold text-sm border-r">Assignment</div>
                      <div className="w-24 min-w-24 p-2 text-center font-semibold text-sm border-r">Due Date</div>
                      <div className="w-20 min-w-20 p-2 text-center font-semibold text-sm border-r">Status</div>
                      <div className="w-24 min-w-24 p-2 text-center font-semibold text-sm border-r">Score</div>
                      <div className="w-20 min-w-20 p-2 text-center font-semibold text-sm">%</div>
                    </div>
                    {/* Essay Rows */}
                    {essayItems.map((item, idx) => (
                      <div key={item.id} className={cn(
                        "flex border-b hover:bg-muted/30",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                      )}>
                        <div className="w-48 min-w-48 p-2 border-r font-medium truncate">{item.name}</div>
                        <div className="w-24 min-w-24 p-2 text-center text-sm text-muted-foreground border-r">
                          {item.dueDate ? format(parseISO(item.dueDate), 'M/d') : '-'}
                        </div>
                        <div className="w-20 min-w-20 p-2 text-center border-r">
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="w-24 min-w-24 p-2 text-center border-r">
                          {item.earnedPoints !== null 
                            ? <span className="font-medium">{item.earnedPoints}/{item.maxPoints}</span>
                            : <span className="text-muted-foreground">-/{item.maxPoints}</span>
                          }
                        </div>
                        <div className="w-20 min-w-20 p-2 text-center">
                          {item.earnedPoints !== null 
                            ? <span className={cn(
                                "font-semibold",
                                (item.earnedPoints / item.maxPoints) >= 0.9 ? "text-green-600" :
                                (item.earnedPoints / item.maxPoints) >= 0.7 ? "text-blue-600" : "text-orange-600"
                              )}>
                                {((item.earnedPoints / item.maxPoints) * 100).toFixed(0)}%
                              </span>
                            : '-'
                          }
                        </div>
                      </div>
                    ))}
                    {/* Journals Section */}
                    <div className="flex bg-primary/10 border-b">
                      <div className="p-2 font-semibold text-primary flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Journals ({journalItems.length} graded)
                      </div>
                    </div>
                    {journalItems.map((item, idx) => (
                      <div key={item.id} className={cn(
                        "flex border-b hover:bg-muted/30",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                      )}>
                        <div className="w-48 min-w-48 p-2 border-r font-medium truncate">{item.name}</div>
                        <div className="w-24 min-w-24 p-2 text-center text-sm text-muted-foreground border-r">
                          {item.date ? format(parseISO(item.date), 'M/d') : '-'}
                        </div>
                        <div className="w-20 min-w-20 p-2 text-center border-r">
                          <StatusBadge status="graded" />
                        </div>
                        <div className="w-24 min-w-24 p-2 text-center border-r font-medium">
                          {item.earnedPoints}/{item.maxPoints}
                        </div>
                        <div className="w-20 min-w-20 p-2 text-center font-semibold text-green-600">
                          {((item.earnedPoints / item.maxPoints) * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </TabsContent>

              {/* Discussions Tab */}
              <TabsContent value="discussions" className="m-0">
                <ScrollArea className="w-full">
                  <div className="min-w-max">
                    <div className="flex border-b bg-muted/50 sticky top-0 z-10">
                      <div className="w-64 min-w-64 p-2 font-semibold text-sm border-r">Discussion</div>
                      <div className="w-16 min-w-16 p-2 text-center font-semibold text-sm border-r">Week</div>
                      <div className="w-20 min-w-20 p-2 text-center font-semibold text-sm border-r">Status</div>
                      <div className="w-24 min-w-24 p-2 text-center font-semibold text-sm">Score</div>
                    </div>
                    {discussionItems.map((item, idx) => (
                      <div key={item.id} className={cn(
                        "flex border-b hover:bg-muted/30",
                        idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                      )}>
                        <div className="w-64 min-w-64 p-2 border-r font-medium truncate">{item.name}</div>
                        <div className="w-16 min-w-16 p-2 text-center text-sm text-muted-foreground border-r">
                          W{item.week || '-'}
                        </div>
                        <div className="w-20 min-w-20 p-2 text-center border-r">
                          <StatusBadge status={item.status} />
                        </div>
                        <div className="w-24 min-w-24 p-2 text-center">
                          {item.earnedPoints !== null 
                            ? <span className={cn(
                                "font-semibold",
                                item.earnedPoints >= 90 ? "text-green-600" :
                                item.earnedPoints >= 70 ? "text-blue-600" : "text-orange-600"
                              )}>
                                {item.earnedPoints}%
                              </span>
                            : '-'
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </TabsContent>

              {/* Participation Tab - Polls, Attendance combined */}
              <TabsContent value="participation" className="m-0">
                <div className="p-4 space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <div className="text-2xl font-bold">{gradeCalculations.pollsCompleted}/{gradeCalculations.pollsTotal}</div>
                      <div className="text-xs text-muted-foreground">Polls (25%)</div>
                      <Badge className="mt-1" variant={gradeCalculations.pollPercent >= 80 ? "default" : "outline"}>
                        {gradeCalculations.pollPercent.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <div className="text-2xl font-bold">{gradeCalculations.discussionsGraded}/{gradeCalculations.discussionsTotal}</div>
                      <div className="text-xs text-muted-foreground">Discussions (25%)</div>
                      <Badge className="mt-1" variant={gradeCalculations.discussionAvg >= 80 ? "default" : "outline"}>
                        {gradeCalculations.discussionAvg.toFixed(0)}%
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <div className="text-2xl font-bold">{gradeCalculations.presentCount}/{gradeCalculations.totalSessions}</div>
                      <div className="text-xs text-muted-foreground">Attendance (50%)</div>
                      <Badge className="mt-1" variant={gradeCalculations.attendancePercent >= 80 ? "default" : "outline"}>
                        {gradeCalculations.attendancePercent.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>

                  {/* Polls Grid */}
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Polls Completed
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {pollItems.map((poll, idx) => (
                        <Tooltip key={poll.id}>
                          <TooltipTrigger>
                            <div className={cn(
                              "w-8 h-8 rounded flex items-center justify-center text-sm font-semibold",
                              poll.completed 
                                ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                                : "bg-muted text-muted-foreground"
                            )}>
                              {poll.completed ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{poll.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {poll.date ? format(parseISO(poll.date), 'MMM d') : ''}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {pollItems.length === 0 && (
                        <span className="text-muted-foreground text-sm">No polls yet</span>
                      )}
                    </div>
                  </div>

                  {/* Attendance Grid */}
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Attendance Record
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {attendanceItems.map((session) => (
                        <Tooltip key={session.id}>
                          <TooltipTrigger>
                            <div className={cn(
                              "w-8 h-8 rounded flex items-center justify-center text-sm font-semibold",
                              session.status === 'present' ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" :
                              session.status === 'excused' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" :
                              session.status === 'late' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" :
                              session.status === 'absent' ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" :
                              "bg-muted text-muted-foreground"
                            )}>
                              {session.status === 'present' ? 'P' :
                               session.status === 'excused' ? 'E' :
                               session.status === 'late' ? 'L' :
                               session.status === 'absent' ? 'A' : '-'}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{session.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(session.date), 'MMM d, yyyy')}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {attendanceItems.length === 0 && (
                        <span className="text-muted-foreground text-sm">No attendance records yet</span>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </TooltipProvider>
  );
};

// Helper component for status badges
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'graded':
      return <Badge className="bg-green-600 text-xs">Graded</Badge>;
    case 'submitted':
      return <Badge variant="secondary" className="text-xs">Submitted</Badge>;
    case 'pending':
      return <Badge variant="outline" className="text-xs">Pending</Badge>;
    default:
      return <Badge variant="outline" className="text-muted-foreground text-xs">—</Badge>;
  }
};
