import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, AlertCircle, FileText, Users, MessageSquare, Calculator, Music, Award, ClipboardCheck, BookOpen, Target } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { calculateLetterGrade, getLetterGradeColor } from '@/utils/grading';
import { getCourseGradingConfig } from '@/config/courseGradingConfig';
import { ACADEMY_COURSES } from '@/config/academyCourses';

interface StudentGradeSpreadsheetProps {
  courseId: string;
}

interface GradeCategoryStatus {
  component: string;
  weight: number;
  description?: string;
  earnedPoints: number;
  maxPoints: number;
  itemCount: number;
  gradedCount: number;
  status: 'graded' | 'partial' | 'pending';
  deduction: number;
}

export const StudentGradeSpreadsheet: React.FC<StudentGradeSpreadsheetProps> = ({
  courseId
}) => {
  const { user } = useAuth();
  
  // Get course-specific grading configuration from syllabus
  const gradingConfig = getCourseGradingConfig(courseId);
  const courseInfo = ACADEMY_COURSES.find(c => c.id === courseId);
  
  const { data, isLoading } = useQuery({
    queryKey: ['student-grade-spreadsheet-universal', courseId, user?.id],
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

      // Fetch attendance records using gw_attendance_records
      const { data: attendanceSessions } = await supabase
        .from('gw_attendance_sessions')
        .select('id')
        .eq('course_id', courseId)
        .lte('opens_at', new Date().toISOString());

      const sessionIds = attendanceSessions?.map(s => s.id) || [];

      // Get student profile ID
      const { data: profile } = await supabase
        .from('gw_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      let attendanceRecords: any[] = [];
      if (profile?.id && sessionIds.length > 0) {
        const { data: records } = await supabase
          .from('gw_attendance_records')
          .select('status, attendance_session_id')
          .eq('student_profile_id', profile.id)
          .in('attendance_session_id', sessionIds);
        attendanceRecords = records || [];
      }

      // Fetch polls answered (if applicable)
      const { data: pollsAnswered } = await supabase
        .from('mus240_poll_responses')
        .select('poll_id')
        .eq('student_id', user.id);

      const { data: totalPolls } = await supabase
        .from('mus240_polls')
        .select('id')
        .eq('is_active', true);

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

      return {
        assignments: assignments || [],
        submissions: submissions || [],
        totalSessions: sessionIds.length,
        attendanceRecords,
        pollsAnswered: pollsAnswered || [],
        totalPolls: totalPolls || [],
        discussionPrompts: discussionPrompts || [],
        discussionGrades: discussionGrades || []
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

  // Calculate assignment stats
  const submissionMap = new Map(data.submissions.map(s => [s.assignment_id, s]));
  let totalAssignmentPoints = 0;
  let earnedAssignmentPoints = 0;
  let gradedAssignmentCount = 0;

  data.assignments.forEach(assignment => {
    const submission = submissionMap.get(assignment.id);
    const isGraded = submission?.status === 'graded' && submission.grade !== null;
    if (isGraded) {
      totalAssignmentPoints += assignment.points || 0;
      earnedAssignmentPoints += submission.grade;
      gradedAssignmentCount++;
    }
  });

  // Calculate attendance stats
  const presentCount = data.attendanceRecords.filter(a => a.status === 'present' || a.status === 'excused').length;
  const totalSessions = data.totalSessions;
  const attendanceRate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 100;

  // Calculate participation stats
  const uniquePolls = new Set(data.pollsAnswered.map(p => p.poll_id)).size;
  const totalPollCount = data.totalPolls.length;
  const pollRate = totalPollCount > 0 ? (uniquePolls / totalPollCount) * 100 : 100;

  const discussionCount = data.discussionGrades.length;
  const discussionTotal = data.discussionGrades.reduce((sum, d) => sum + (d.total_score || 0), 0);
  const discussionAvg = discussionCount > 0 ? discussionTotal / discussionCount : 100;

  // Build category statuses based on syllabus grading breakdown
  const categoryStatuses: GradeCategoryStatus[] = gradingConfig.components.map(comp => {
    const componentLower = comp.component.toLowerCase();
    
    // Match component to actual data
    if (componentLower.includes('attendance') || componentLower.includes('participation')) {
      // This is an attendance/participation category
      const hasData = totalSessions > 0;
      const lostPercent = hasData ? (100 - attendanceRate) / 100 : 0;
      return {
        component: comp.component,
        weight: comp.weight,
        description: comp.description,
        earnedPoints: presentCount,
        maxPoints: totalSessions,
        itemCount: totalSessions,
        gradedCount: totalSessions,
        status: hasData ? 'graded' : 'pending',
        deduction: hasData ? lostPercent * comp.weight : 0
      };
    } else if (componentLower.includes('concert') || componentLower.includes('performance')) {
      // Concert/performance - typically not yet graded
      return {
        component: comp.component,
        weight: comp.weight,
        description: comp.description,
        earnedPoints: 0,
        maxPoints: 100,
        itemCount: 0,
        gradedCount: 0,
        status: 'pending',
        deduction: 0
      };
    } else if (componentLower.includes('sectional') || componentLower.includes('rehearsal')) {
      // Sectional/rehearsal - based on attendance
      const hasData = totalSessions > 0;
      return {
        component: comp.component,
        weight: comp.weight,
        description: comp.description,
        earnedPoints: presentCount,
        maxPoints: totalSessions,
        itemCount: totalSessions,
        gradedCount: hasData ? totalSessions : 0,
        status: hasData ? 'graded' : 'pending',
        deduction: hasData ? ((100 - attendanceRate) / 100) * comp.weight : 0
      };
    } else if (componentLower.includes('uniform') || componentLower.includes('professional')) {
      // Uniform/professionalism - typically no deductions unless noted
      return {
        component: comp.component,
        weight: comp.weight,
        description: comp.description,
        earnedPoints: comp.weight,
        maxPoints: comp.weight,
        itemCount: 1,
        gradedCount: 1,
        status: 'graded',
        deduction: 0
      };
    } else if (componentLower.includes('assignment') || componentLower.includes('essay') || componentLower.includes('journal') || componentLower.includes('weekly')) {
      // Assignments/essays
      const hasGraded = gradedAssignmentCount > 0;
      const lostPercent = hasGraded && totalAssignmentPoints > 0 
        ? (totalAssignmentPoints - earnedAssignmentPoints) / totalAssignmentPoints 
        : 0;
      return {
        component: comp.component,
        weight: comp.weight,
        description: comp.description,
        earnedPoints: earnedAssignmentPoints,
        maxPoints: totalAssignmentPoints || 100,
        itemCount: data.assignments.length,
        gradedCount: gradedAssignmentCount,
        status: hasGraded ? (gradedAssignmentCount === data.assignments.length ? 'graded' : 'partial') : 'pending',
        deduction: hasGraded ? lostPercent * comp.weight : 0
      };
    } else if (componentLower.includes('midterm') || componentLower.includes('final') || componentLower.includes('exam') || componentLower.includes('jury')) {
      // Exams - typically not yet graded
      return {
        component: comp.component,
        weight: comp.weight,
        description: comp.description,
        earnedPoints: 0,
        maxPoints: 100,
        itemCount: 1,
        gradedCount: 0,
        status: 'pending',
        deduction: 0
      };
    } else if (componentLower.includes('project') || componentLower.includes('paper') || componentLower.includes('research')) {
      // Projects/papers
      return {
        component: comp.component,
        weight: comp.weight,
        description: comp.description,
        earnedPoints: 0,
        maxPoints: 100,
        itemCount: 1,
        gradedCount: 0,
        status: 'pending',
        deduction: 0
      };
    } else if (componentLower.includes('video') || componentLower.includes('upload') || componentLower.includes('practicum')) {
      // Videos/uploads/practicum - based on assignments
      const hasGraded = gradedAssignmentCount > 0;
      const lostPercent = hasGraded && totalAssignmentPoints > 0 
        ? (totalAssignmentPoints - earnedAssignmentPoints) / totalAssignmentPoints 
        : 0;
      return {
        component: comp.component,
        weight: comp.weight,
        description: comp.description,
        earnedPoints: earnedAssignmentPoints,
        maxPoints: totalAssignmentPoints || 100,
        itemCount: data.assignments.length,
        gradedCount: gradedAssignmentCount,
        status: hasGraded ? 'partial' : 'pending',
        deduction: hasGraded ? lostPercent * comp.weight : 0
      };
    } else {
      // Default: generic category
      return {
        component: comp.component,
        weight: comp.weight,
        description: comp.description,
        earnedPoints: 0,
        maxPoints: 100,
        itemCount: 0,
        gradedCount: 0,
        status: 'pending',
        deduction: 0
      };
    }
  });

  // Calculate total deductions
  const totalDeductions = categoryStatuses.reduce((sum, cat) => sum + cat.deduction, 0);
  const currentGrade = Math.max(0, 100 - totalDeductions);
  const letterGrade = calculateLetterGrade(currentGrade, 100);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'graded':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'graded':
        return <Badge variant="default" className="bg-green-600">Complete</Badge>;
      case 'partial':
        return <Badge variant="secondary">In Progress</Badge>;
      default:
        return <Badge variant="outline" className="text-muted-foreground">Pending</Badge>;
    }
  };

  const getCategoryIcon = (component: string) => {
    const lower = component.toLowerCase();
    if (lower.includes('attendance') || lower.includes('participation')) return <Users className="h-5 w-5" />;
    if (lower.includes('concert') || lower.includes('performance')) return <Music className="h-5 w-5" />;
    if (lower.includes('sectional') || lower.includes('rehearsal')) return <MessageSquare className="h-5 w-5" />;
    if (lower.includes('uniform') || lower.includes('professional')) return <Award className="h-5 w-5" />;
    if (lower.includes('exam') || lower.includes('midterm') || lower.includes('final') || lower.includes('jury')) return <Calculator className="h-5 w-5" />;
    if (lower.includes('project') || lower.includes('paper')) return <ClipboardCheck className="h-5 w-5" />;
    if (lower.includes('video') || lower.includes('upload')) return <FileText className="h-5 w-5" />;
    if (lower.includes('journal') || lower.includes('listening')) return <BookOpen className="h-5 w-5" />;
    return <Target className="h-5 w-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Course Header */}
      <div className="text-center mb-4">
        <h2 className="text-lg font-semibold text-muted-foreground">
          {gradingConfig.courseCode} Grading Breakdown
        </h2>
        <p className="text-sm text-muted-foreground">
          Based on the official course syllabus
        </p>
      </div>

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
              {categoryStatuses.map((cat, index) => (
                <TableRow key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(cat.component)}
                      <div>
                        <div>{cat.component}</div>
                        {cat.description && (
                          <div className="text-xs text-muted-foreground">{cat.description}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-slate-700 dark:text-slate-300">{cat.weight}%</TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      {getStatusBadge(cat.status)}
                      {cat.itemCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {cat.gradedCount}/{cat.itemCount}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {cat.status !== 'pending' ? (
                      <span className={cn(cat.deduction > 0 ? "text-red-600" : "text-green-600")}>
                        {cat.deduction > 0 ? `-${cat.deduction.toFixed(2)}%` : '0.00%'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              
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

      {/* Attendance Detail Card */}
      {totalSessions > 0 && (
        <Card className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Attendance Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                <div className="text-sm text-muted-foreground">Present</div>
              </div>
              <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                <div className="text-2xl font-bold">{totalSessions}</div>
                <div className="text-sm text-muted-foreground">Total Sessions</div>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <div className="text-2xl font-bold text-blue-600">{attendanceRate.toFixed(0)}%</div>
                <div className="text-sm text-muted-foreground">Attendance Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignments Detail Card */}
      {data.assignments.length > 0 && (
        <Card className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Assignments ({gradedAssignmentCount}/{data.assignments.length} graded)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 dark:bg-slate-800">
                    <TableHead className="min-w-[40px]"></TableHead>
                    <TableHead className="font-bold min-w-[200px]">Assignment</TableHead>
                    <TableHead className="text-center font-bold min-w-[100px]">Due Date</TableHead>
                    <TableHead className="text-center font-bold min-w-[80px]">Status</TableHead>
                    <TableHead className="text-center font-bold min-w-[100px]">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.assignments.map(assignment => {
                    const submission = submissionMap.get(assignment.id);
                    const isGraded = submission?.status === 'graded' && submission.grade !== null;
                    const status = isGraded ? 'graded' : submission?.status === 'submitted' ? 'partial' : 'pending';
                    
                    return (
                      <TableRow key={assignment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                        <TableCell>{getStatusIcon(status)}</TableCell>
                        <TableCell className="font-medium">{assignment.title}</TableCell>
                        <TableCell className="text-center text-sm text-muted-foreground">
                          {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(status)}</TableCell>
                        <TableCell className="text-center">
                          {isGraded ? (
                            <span className={cn(
                              "font-semibold",
                              submission.grade / (assignment.points || 100) >= 0.9 ? "text-green-600" :
                              submission.grade / (assignment.points || 100) >= 0.7 ? "text-blue-600" : "text-orange-600"
                            )}>
                              {submission.grade} / {assignment.points || 100}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">- / {assignment.points || 100}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grade Scale Reference */}
      <Card className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
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
            ].map(item => (
              <div 
                key={item.grade} 
                className={cn(
                  "p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
                  letterGrade === item.grade && "ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-900/50"
                )}
              >
                <div className="font-bold text-slate-900 dark:text-slate-100">{item.grade}</div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{item.range}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
