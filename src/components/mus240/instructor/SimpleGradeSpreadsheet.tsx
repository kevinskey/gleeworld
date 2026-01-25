import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';

// Grade weights as percentages of 100% - MUS240 Syllabus
const GRADE_WEIGHTS = {
  assignments: 35,      // Journals and other assignments
  midterm: 15,
  finalExam: 20,
  groupProject: 15,
  participation: 15     // Polls + Discussions + Attendance combined
};
const FINAL_EXAM_TEST_ID = '5efe7df8-6eb6-4611-b2d6-61ddf0319c7e';
const MUS240_COURSE_ID = '23c4ee3c-7bbb-4534-8c0a-eecd88298d37';

interface StudentGradeRow {
  student_id: string;
  student_name: string;
  assignments_pct: number;
  midterm_pct: number;
  final_exam_pct: number;
  group_project_pct: number;
  participation_pct: number;
  final_grade_pct: number;
}
type GradeField = 'assignments_pct' | 'midterm_pct' | 'final_exam_pct' | 'group_project_pct' | 'participation_pct';
type SortField = 'student_name' | GradeField | 'final_grade';
type SortDirection = 'asc' | 'desc';

export const SimpleGradeSpreadsheet: React.FC = () => {
  const [students, setStudents] = useState<StudentGradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [overrides, setOverrides] = useState<Record<string, Partial<Record<GradeField, number>>>>({});
  const [sortField, setSortField] = useState<SortField>('final_grade');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { currentSemester } = useMus240SemesterSafe();

  const handleOverride = (studentId: string, field: GradeField, value: number) => {
    const maxValues: Record<GradeField, number> = {
      assignments_pct: GRADE_WEIGHTS.assignments,
      midterm_pct: GRADE_WEIGHTS.midterm,
      final_exam_pct: GRADE_WEIGHTS.finalExam,
      group_project_pct: GRADE_WEIGHTS.groupProject,
      participation_pct: GRADE_WEIGHTS.participation
    };
    const clampedValue = Math.min(Math.max(0, value), maxValues[field]);
    setOverrides(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: clampedValue
      }
    }));
  };

  const getEffectiveValue = (student: StudentGradeRow, field: GradeField): number => {
    return overrides[student.student_id]?.[field] ?? student[field];
  };

  const getRawTotal = (student: StudentGradeRow): number => {
    return getEffectiveValue(student, 'assignments_pct') + 
           getEffectiveValue(student, 'midterm_pct') + 
           getEffectiveValue(student, 'final_exam_pct') + 
           getEffectiveValue(student, 'group_project_pct') + 
           getEffectiveValue(student, 'participation_pct');
  };

  const calculateTotal = (student: StudentGradeRow): number => {
    const rawTotal = getRawTotal(student);
    const maxRawTotal = Math.max(...students.map(s => getRawTotal(s)));
    if (maxRawTotal <= 0) return 0;
    return rawTotal / maxRawTotal * 100;
  };

  useEffect(() => {
    fetchGrades();
  }, [currentSemester]);

  const fetchGrades = async () => {
    try {
      setLoading(true);

      const { data: enrollments, error: enrollError } = await supabase
        .from('gw_course_enrollments')
        .select('user_id')
        .eq('course_id', MUS240_COURSE_ID)
        .eq('semester', currentSemester)
        .eq('enrollment_status', 'enrolled');
      if (enrollError) throw enrollError;

      const seenIds = new Set<string>();
      const uniqueEnrollments = (enrollments || []).filter((e: any) => {
        if (!e.user_id || seenIds.has(e.user_id)) return false;
        seenIds.add(e.user_id);
        return true;
      });
      const studentIds = uniqueEnrollments.map((e: any) => e.user_id);
      if (studentIds.length === 0) {
        setStudents([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('gw_profiles')
        .select('user_id, full_name')
        .in('user_id', studentIds);
      
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      const { data: discussionPrompts } = await supabase
        .from('discussion_prompts')
        .select('id')
        .eq('course_id', MUS240_COURSE_ID);
      
      const discussionIds = (discussionPrompts || []).map((d: any) => d.id);

      const [journalData, midtermData, finalExamData, pollsData, discussionData, attendanceData, groupProjectData] = await Promise.all([
        supabase.from('mus240_journal_grades').select('student_id, overall_score, instructor_score').in('student_id', studentIds),
        supabase.from('mus240_midterm_submissions').select('user_id, grade').in('user_id', studentIds).eq('is_submitted', true),
        supabase.from('test_submissions').select('student_id, total_score').eq('test_id', FINAL_EXAM_TEST_ID).in('student_id', studentIds),
        supabase.from('mus240_poll_responses').select('student_id, poll_id').in('student_id', studentIds),
        discussionIds.length > 0 
          ? supabase.from('discussion_grades').select('student_id, total_score').in('discussion_id', discussionIds).in('student_id', studentIds)
          : Promise.resolve({ data: [] }),
        supabase.from('attendance').select('user_id, status').in('user_id', studentIds),
        supabase.from('assignment_submissions').select('student_id, grade, assignment_id, status')
          .in('student_id', studentIds)
          .eq('status', 'graded')
      ]);

      const journals = journalData.data || [];
      const midterms = midtermData.data || [];
      const finals = finalExamData.data || [];
      const polls = pollsData.data || [];
      const discussions = (discussionData as any)?.data || [];
      const attendance = attendanceData.data || [];
      const groupProjects = groupProjectData.data || [];

      const discussionsByStudent = new Map<string, { total: number; count: number }>();
      discussions.forEach((d: any) => {
        const existing = discussionsByStudent.get(d.student_id) || { total: 0, count: 0 };
        discussionsByStudent.set(d.student_id, {
          total: existing.total + (d.total_score || 0),
          count: existing.count + 1
        });
      });

      // Attendance tracking by student
      const attendanceByStudent = new Map<string, { present: number; total: number }>();
      attendance.forEach((a: any) => {
        const existing = attendanceByStudent.get(a.user_id) || { present: 0, total: 0 };
        attendanceByStudent.set(a.user_id, {
          present: existing.present + (a.status === 'present' || a.status === 'excused' ? 1 : 0),
          total: existing.total + 1
        });
      });

      // Group project scores by student
      const groupProjectByStudent = new Map<string, number>();
      groupProjects.forEach((gp: any) => {
        const current = groupProjectByStudent.get(gp.student_id) || 0;
        groupProjectByStudent.set(gp.student_id, Math.max(current, gp.grade || 0));
      });

      const journalsByStudent = new Map<string, number>();
      journals.forEach((j: any) => {
        const score = j.instructor_score ?? j.overall_score ?? 0;
        const current = journalsByStudent.get(j.student_id) || 0;
        journalsByStudent.set(j.student_id, current + score);
      });

      let maxJournalScore = 0;
      journalsByStudent.forEach(score => {
        const capped = Math.min(score, 200);
        if (capped > maxJournalScore) maxJournalScore = capped;
      });

      const midtermByStudent = new Map<string, number>();
      midterms.forEach((m: any) => {
        midtermByStudent.set(m.user_id, m.grade || 0);
      });

      let maxMidtermScore = 0;
      midtermByStudent.forEach(score => {
        if (score > maxMidtermScore) maxMidtermScore = score;
      });

      const finalByStudent = new Map<string, number>();
      finals.forEach((f: any) => {
        finalByStudent.set(f.student_id, f.total_score || 0);
      });

      let maxFinalScore = 0;
      finalByStudent.forEach(score => {
        if (score > maxFinalScore) maxFinalScore = score;
      });

      const pollCountByStudent = new Map<string, Set<string>>();
      polls.forEach((p: any) => {
        if (!pollCountByStudent.has(p.student_id)) {
          pollCountByStudent.set(p.student_id, new Set());
        }
        pollCountByStudent.get(p.student_id)!.add(p.poll_id);
      });

      let maxPollsAnswered = 0;
      pollCountByStudent.forEach(pollSet => {
        if (pollSet.size > maxPollsAnswered) {
          maxPollsAnswered = pollSet.size;
        }
      });

      // Calculate max group project score
      let maxGroupProjectScore = 0;
      groupProjectByStudent.forEach(score => {
        if (score > maxGroupProjectScore) maxGroupProjectScore = score;
      });

      const studentGrades: StudentGradeRow[] = uniqueEnrollments.map((enrollment: any) => {
        const studentId = enrollment.user_id;
        const studentName = profileMap.get(studentId)?.full_name || 'Unknown';

        // Assignments (35%) - based on journals
        const journalPoints = Math.min(journalsByStudent.get(studentId) || 0, 200);
        const assignmentsPct = maxJournalScore > 0 ? journalPoints / maxJournalScore * GRADE_WEIGHTS.assignments : 0;

        // Midterm (15%)
        const midtermScore = midtermByStudent.get(studentId) || 0;
        const midtermPct = maxMidtermScore > 0 ? midtermScore / maxMidtermScore * GRADE_WEIGHTS.midterm : 0;

        // Final Exam (20%)
        const finalScore = finalByStudent.get(studentId) || 0;
        const finalExamPct = maxFinalScore > 0 ? finalScore / maxFinalScore * GRADE_WEIGHTS.finalExam : 0;

        // Group Project (15%)
        const groupProjectScore = groupProjectByStudent.get(studentId) || 0;
        const groupProjectPct = maxGroupProjectScore > 0 ? groupProjectScore / maxGroupProjectScore * GRADE_WEIGHTS.groupProject : 0;

        // Participation (15%) = Polls (25%) + Discussions (25%) + Attendance (50%)
        // Weighted: Polls 3.75%, Discussions 3.75%, Attendance 7.5%
        const pollsAnswered = pollCountByStudent.get(studentId)?.size || 0;
        const pollsContrib = maxPollsAnswered > 0 ? (pollsAnswered / maxPollsAnswered) * 3.75 : 0;

        const discussionInfo = discussionsByStudent.get(studentId);
        const discussionAvg = discussionInfo && discussionInfo.count > 0 
          ? discussionInfo.total / discussionInfo.count 
          : 0;
        const discussionContrib = (discussionAvg / 100) * 3.75;

        const attendanceInfo = attendanceByStudent.get(studentId);
        const attendanceRate = attendanceInfo && attendanceInfo.total > 0
          ? attendanceInfo.present / attendanceInfo.total
          : 0; // Show 0 if no attendance records (data was reset)
        const attendanceContrib = attendanceInfo && attendanceInfo.total > 0 ? attendanceRate * 7.5 : 0;

        const participationPct = pollsContrib + discussionContrib + attendanceContrib;

        const finalGradePct = assignmentsPct + midtermPct + finalExamPct + groupProjectPct + participationPct;
        return {
          student_id: studentId,
          student_name: studentName,
          assignments_pct: Math.round(assignmentsPct * 100) / 100,
          midterm_pct: Math.round(midtermPct * 100) / 100,
          final_exam_pct: Math.round(finalExamPct * 100) / 100,
          group_project_pct: Math.round(groupProjectPct * 100) / 100,
          participation_pct: Math.round(participationPct * 100) / 100,
          final_grade_pct: Math.round(finalGradePct * 100) / 100
        };
      });

      const uniqueGrades = studentGrades.filter((student, index, self) => index === self.findIndex(s => s.student_id === student.student_id));
      uniqueGrades.sort((a, b) => b.final_grade_pct - a.final_grade_pct);
      setStudents(uniqueGrades);
    } catch (error) {
      console.error('Error fetching grades:', error);
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Assignments (35%)', 'Midterm (15%)', 'Final Exam (20%)', 'Group Project (15%)', 'Participation (15%)', 'Final Grade (%)'];
    const rows = filteredStudents.map(s => [
      s.student_name, 
      getEffectiveValue(s, 'assignments_pct').toFixed(1), 
      getEffectiveValue(s, 'midterm_pct').toFixed(1), 
      getEffectiveValue(s, 'final_exam_pct').toFixed(1), 
      getEffectiveValue(s, 'group_project_pct').toFixed(1), 
      getEffectiveValue(s, 'participation_pct').toFixed(1), 
      calculateTotal(s).toFixed(1)
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mus240_grades.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Grades exported');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'student_name' ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const getLastName = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    return parts[parts.length - 1].toLowerCase();
  };

  const sortedAndFilteredStudents = useMemo(() => {
    const filtered = students.filter(s => s.student_name.toLowerCase().includes(searchTerm.toLowerCase()));
    return filtered.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      if (sortField === 'student_name') {
        aVal = getLastName(a.student_name);
        bVal = getLastName(b.student_name);
      } else if (sortField === 'final_grade') {
        aVal = calculateTotal(a);
        bVal = calculateTotal(b);
      } else {
        aVal = getEffectiveValue(a, sortField);
        bVal = getEffectiveValue(b, sortField);
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [students, searchTerm, sortField, sortDirection, overrides]);

  const filteredStudents = sortedAndFilteredStudents;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground">Grade Spreadsheet</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 w-48" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchGrades} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          Weights: Assignments {GRADE_WEIGHTS.assignments}% | Midterm {GRADE_WEIGHTS.midterm}% | 
          Final Exam {GRADE_WEIGHTS.finalExam}% | Group Project {GRADE_WEIGHTS.groupProject}% | 
          Participation {GRADE_WEIGHTS.participation}%
        </div>
      </CardHeader>
      <CardContent className="text-primary-foreground">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('student_name')} className="cursor-pointer hover:bg-muted/50 min-w-[120px] text-primary-foreground">
                    <div className="flex items-center">
                      <span className="hidden sm:inline">Student Name <span className="text-xs text-muted-foreground">(by last)</span></span>
                      <span className="sm:hidden">Name</span>
                      {getSortIcon('student_name')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center text-foreground cursor-pointer hover:bg-muted/50 min-w-[80px]" onClick={() => handleSort('assignments_pct')}>
                    <div className="flex flex-col items-center justify-center text-primary-foreground">
                      <span className="hidden sm:inline">Assignments</span>
                      <span className="sm:hidden">Assign</span>
                      <span className="text-xs text-primary-foreground">({GRADE_WEIGHTS.assignments}%)</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center text-foreground cursor-pointer hover:bg-muted/50 min-w-[80px]" onClick={() => handleSort('midterm_pct')}>
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-primary-foreground">Midterm</span>
                      <span className="text-xs text-muted-foreground">({GRADE_WEIGHTS.midterm}%)</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center text-foreground cursor-pointer hover:bg-muted/50 min-w-[80px]" onClick={() => handleSort('final_exam_pct')}>
                    <div className="flex flex-col items-center justify-center text-primary-foreground">
                      <span className="hidden sm:inline">Final Exam</span>
                      <span className="sm:hidden">Final</span>
                      <span className="text-xs text-muted-foreground">({GRADE_WEIGHTS.finalExam}%)</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center text-foreground cursor-pointer hover:bg-muted/50 min-w-[80px]" onClick={() => handleSort('group_project_pct')}>
                    <div className="flex flex-col items-center justify-center">
                      <span className="hidden sm:inline text-primary-foreground">Group Project</span>
                      <span className="sm:hidden">Project</span>
                      <span className="text-xs text-muted-foreground">({GRADE_WEIGHTS.groupProject}%)</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center text-foreground cursor-pointer hover:bg-muted/50 min-w-[80px]" onClick={() => handleSort('participation_pct')}>
                    <div className="flex flex-col items-center justify-center">
                      <span className="hidden sm:inline text-primary-foreground">Participation</span>
                      <span className="sm:hidden">Part.</span>
                      <span className="text-xs text-muted-foreground">({GRADE_WEIGHTS.participation}%)</span>
                    </div>
                  </TableHead>
                  <TableHead className="text-center text-foreground font-bold cursor-pointer hover:bg-muted/50 min-w-[70px]" onClick={() => handleSort('final_grade')}>
                    <div className="flex flex-col items-center justify-center">
                      <span className="hidden sm:inline text-primary-foreground">Final Grade</span>
                      <span className="sm:hidden">Grade</span>
                      {getSortIcon('final_grade')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map(student => (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium text-foreground">{student.student_name}</TableCell>
                    <TableCell className="text-center p-1">
                      <Input type="number" step="0.1" min="0" max={GRADE_WEIGHTS.assignments} value={getEffectiveValue(student, 'assignments_pct').toFixed(1)} onChange={e => handleOverride(student.student_id, 'assignments_pct', parseFloat(e.target.value) || 0)} className="w-16 h-8 text-center text-sm mx-auto" />
                    </TableCell>
                    <TableCell className="text-center p-1">
                      <Input type="number" step="0.1" min="0" max={GRADE_WEIGHTS.midterm} value={getEffectiveValue(student, 'midterm_pct').toFixed(1)} onChange={e => handleOverride(student.student_id, 'midterm_pct', parseFloat(e.target.value) || 0)} className="w-16 h-8 text-center text-sm mx-auto" />
                    </TableCell>
                    <TableCell className="text-center p-1">
                      <Input type="number" step="0.1" min="0" max={GRADE_WEIGHTS.finalExam} value={getEffectiveValue(student, 'final_exam_pct').toFixed(1)} onChange={e => handleOverride(student.student_id, 'final_exam_pct', parseFloat(e.target.value) || 0)} className="w-16 h-8 text-center text-sm mx-auto" />
                    </TableCell>
                    <TableCell className="text-center p-1">
                      <Input type="number" step="0.1" min="0" max={GRADE_WEIGHTS.groupProject} value={getEffectiveValue(student, 'group_project_pct').toFixed(1)} onChange={e => handleOverride(student.student_id, 'group_project_pct', parseFloat(e.target.value) || 0)} className="w-16 h-8 text-center text-sm mx-auto" />
                    </TableCell>
                    <TableCell className="text-center p-1">
                      <Input type="number" step="0.1" min="0" max={GRADE_WEIGHTS.participation} value={getEffectiveValue(student, 'participation_pct').toFixed(1)} onChange={e => handleOverride(student.student_id, 'participation_pct', parseFloat(e.target.value) || 0)} className="w-16 h-8 text-center text-sm mx-auto" />
                    </TableCell>
                    <TableCell className="text-center font-bold text-foreground">{calculateTotal(student).toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
