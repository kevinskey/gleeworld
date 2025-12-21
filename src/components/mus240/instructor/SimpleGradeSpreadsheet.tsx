import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMus240SemesterSafe } from '@/contexts/Mus240SemesterContext';

// Grade weights as percentages of 100%
const GRADE_WEIGHTS = {
  assignments: 10,    // Journals
  midterm: 20,
  finalExam: 30,
  aiProject: 25,
  polls: 15,
};

const FINAL_EXAM_TEST_ID = '5efe7df8-6eb6-4611-b2d6-61ddf0319c7e';

interface StudentGradeRow {
  student_id: string;
  student_name: string;
  assignments_pct: number;
  midterm_pct: number;
  final_exam_pct: number;
  ai_project_pct: number;
  polls_pct: number;
  final_grade_pct: number;
}

type GradeField = 'assignments_pct' | 'midterm_pct' | 'final_exam_pct' | 'ai_project_pct' | 'polls_pct';
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
    // Clamp value to max weight for that field
    const maxValues: Record<GradeField, number> = {
      assignments_pct: GRADE_WEIGHTS.assignments,
      midterm_pct: GRADE_WEIGHTS.midterm,
      final_exam_pct: GRADE_WEIGHTS.finalExam,
      ai_project_pct: GRADE_WEIGHTS.aiProject,
      polls_pct: GRADE_WEIGHTS.polls,
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
    return (
      getEffectiveValue(student, 'assignments_pct') +
      getEffectiveValue(student, 'midterm_pct') +
      getEffectiveValue(student, 'final_exam_pct') +
      getEffectiveValue(student, 'ai_project_pct') +
      getEffectiveValue(student, 'polls_pct')
    );
  };

  // Calculate curved final grade - highest raw total gets 100%
  const calculateTotal = (student: StudentGradeRow): number => {
    const rawTotal = getRawTotal(student);
    const maxRawTotal = Math.max(...students.map(s => getRawTotal(s)));
    if (maxRawTotal <= 0) return 0;
    return (rawTotal / maxRawTotal) * 100;
  };

  useEffect(() => {
    fetchGrades();
  }, [currentSemester]);

  const fetchGrades = async () => {
    try {
      setLoading(true);

      // Get enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from('mus240_enrollments')
        .select('student_id, gw_profiles(user_id, full_name)')
        .eq('semester', currentSemester)
        .eq('enrollment_status', 'enrolled');

      if (enrollError) throw enrollError;

      // Deduplicate enrollments by student_id
      const seenIds = new Set<string>();
      const uniqueEnrollments = (enrollments || []).filter((e: any) => {
        if (seenIds.has(e.student_id)) return false;
        seenIds.add(e.student_id);
        return true;
      });

      const studentIds = uniqueEnrollments.map((e: any) => e.student_id);
      if (studentIds.length === 0) {
        setStudents([]);
        return;
      }

      // Fetch all grade data in parallel
      const [journalData, midtermData, finalExamData, pollsData, groupData] = await Promise.all([
        // Journals (assignments) - max 200 points (10 journals × 20 pts)
        supabase
          .from('mus240_journal_grades')
          .select('student_id, overall_score, instructor_score')
          .in('student_id', studentIds),
        
        // Midterm - max 100 points
        supabase
          .from('mus240_midterm_submissions')
          .select('user_id, grade')
          .in('user_id', studentIds)
          .eq('is_submitted', true),
        
        // Final Exam - from test_submissions
        supabase
          .from('test_submissions')
          .select('student_id, total_score')
          .eq('test_id', FINAL_EXAM_TEST_ID)
          .in('student_id', studentIds),
        
        // Polls - count of unique polls answered
        supabase
          .from('mus240_poll_responses')
          .select('student_id, poll_id')
          .in('student_id', studentIds),
        
        // AI Group membership
        supabase
          .from('mus240_group_memberships')
          .select('member_id')
          .in('member_id', studentIds)
      ]);

      // Process data
      const journals = journalData.data || [];
      const midterms = midtermData.data || [];
      const finals = finalExamData.data || [];
      const polls = pollsData.data || [];
      const groups = groupData.data || [];

      // Group journals by student
      const journalsByStudent = new Map<string, number>();
      journals.forEach((j: any) => {
        const score = j.instructor_score ?? j.overall_score ?? 0;
        const current = journalsByStudent.get(j.student_id) || 0;
        journalsByStudent.set(j.student_id, current + score);
      });

      // Find max journal score for curve (capped at 200)
      let maxJournalScore = 0;
      journalsByStudent.forEach((score) => {
        const capped = Math.min(score, 200);
        if (capped > maxJournalScore) maxJournalScore = capped;
      });

      // Midterm scores by student
      const midtermByStudent = new Map<string, number>();
      midterms.forEach((m: any) => {
        midtermByStudent.set(m.user_id, m.grade || 0);
      });

      // Find max midterm score for curve
      let maxMidtermScore = 0;
      midtermByStudent.forEach((score) => {
        if (score > maxMidtermScore) maxMidtermScore = score;
      });

      // Final exam scores by student  
      const finalByStudent = new Map<string, number>();
      finals.forEach((f: any) => {
        finalByStudent.set(f.student_id, f.total_score || 0);
      });

      // Find max final exam score for curve
      let maxFinalScore = 0;
      finalByStudent.forEach((score) => {
        if (score > maxFinalScore) maxFinalScore = score;
      });

      // Poll counts by student (unique polls)
      const pollCountByStudent = new Map<string, Set<string>>();
      polls.forEach((p: any) => {
        if (!pollCountByStudent.has(p.student_id)) {
          pollCountByStudent.set(p.student_id, new Set());
        }
        pollCountByStudent.get(p.student_id)!.add(p.poll_id);
      });

      // Find max polls answered for curve calculation
      let maxPollsAnswered = 0;
      pollCountByStudent.forEach((pollSet) => {
        if (pollSet.size > maxPollsAnswered) {
          maxPollsAnswered = pollSet.size;
        }
      });

      // Group membership set
      const inGroupSet = new Set(groups.map((g: any) => g.member_id));

      // Calculate grades for each student
      const studentGrades: StudentGradeRow[] = uniqueEnrollments.map((enrollment: any) => {
        const studentId = enrollment.student_id;
        const studentName = enrollment.gw_profiles?.full_name || 'Unknown';

        // Assignments (journals): curved based on max score
        const journalPoints = Math.min(journalsByStudent.get(studentId) || 0, 200);
        const assignmentsPct = maxJournalScore > 0 
          ? (journalPoints / maxJournalScore) * GRADE_WEIGHTS.assignments 
          : 0;

        // Midterm: curved based on max score
        const midtermScore = midtermByStudent.get(studentId) || 0;
        const midtermPct = maxMidtermScore > 0 
          ? (midtermScore / maxMidtermScore) * GRADE_WEIGHTS.midterm 
          : 0;

        // Final Exam: curved based on max score
        const finalScore = finalByStudent.get(studentId) || 0;
        const finalExamPct = maxFinalScore > 0 
          ? (finalScore / maxFinalScore) * GRADE_WEIGHTS.finalExam 
          : 0;

        // AI Project: Everyone gets 100% (full 25%)
        const aiProjectPct = GRADE_WEIGHTS.aiProject;

        // Polls: curved based on max polls answered by any student
        const pollsAnswered = pollCountByStudent.get(studentId)?.size || 0;
        const pollsPct = maxPollsAnswered > 0 
          ? (pollsAnswered / maxPollsAnswered) * GRADE_WEIGHTS.polls 
          : 0;

        // Final grade: sum of all percentages (will be curved after)
        const finalGradePct = assignmentsPct + midtermPct + finalExamPct + aiProjectPct + pollsPct;

        return {
          student_id: studentId,
          student_name: studentName,
          assignments_pct: Math.round(assignmentsPct * 100) / 100,
          midterm_pct: Math.round(midtermPct * 100) / 100,
          final_exam_pct: Math.round(finalExamPct * 100) / 100,
          ai_project_pct: Math.round(aiProjectPct * 100) / 100,
          polls_pct: Math.round(pollsPct * 100) / 100,
          final_grade_pct: Math.round(finalGradePct * 100) / 100,
        };
      });

      // Curve the final grade - find max and scale to 100%
      const maxFinalGrade = Math.max(...studentGrades.map(s => s.final_grade_pct));
      if (maxFinalGrade > 0) {
        studentGrades.forEach(s => {
          s.final_grade_pct = Math.round((s.final_grade_pct / maxFinalGrade) * 100 * 100) / 100;
        });
      }

      // Final deduplication check by student_id
      const uniqueGrades = studentGrades.filter((student, index, self) =>
        index === self.findIndex(s => s.student_id === student.student_id)
      );

      // Sort by final grade descending
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
    const headers = ['Student Name', 'Assignments (%)', 'Midterm (%)', 'Final Exam (%)', 'AI Project (%)', 'Polls (%)', 'Final Grade (%)'];
    const rows = filteredStudents.map(s => [
      s.student_name,
      getEffectiveValue(s, 'assignments_pct').toFixed(1),
      getEffectiveValue(s, 'midterm_pct').toFixed(1),
      getEffectiveValue(s, 'final_exam_pct').toFixed(1),
      getEffectiveValue(s, 'ai_project_pct').toFixed(1),
      getEffectiveValue(s, 'polls_pct').toFixed(1),
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
      // Default to ascending for names, descending for grades
      setSortDirection(field === 'student_name' ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" /> 
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const getLastName = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    return parts[parts.length - 1].toLowerCase();
  };

  const sortedAndFilteredStudents = useMemo(() => {
    const filtered = students.filter(s =>
      s.student_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      if (sortField === 'student_name') {
        // Sort by last name
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
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-48"
              />
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
          Final Exam {GRADE_WEIGHTS.finalExam}% | AI Project {GRADE_WEIGHTS.aiProject}% | 
          Polls {GRADE_WEIGHTS.polls}%
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="text-foreground cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('student_name')}
                  >
                    <div className="flex items-center">
                      <span>Student Name <span className="text-xs text-muted-foreground">(by last)</span></span> {getSortIcon('student_name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center text-foreground cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('assignments_pct')}
                  >
                    <div className="flex items-center justify-center">
                      Assignments ({GRADE_WEIGHTS.assignments}%) {getSortIcon('assignments_pct')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center text-foreground cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('midterm_pct')}
                  >
                    <div className="flex items-center justify-center">
                      Midterm ({GRADE_WEIGHTS.midterm}%) {getSortIcon('midterm_pct')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center text-foreground cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('final_exam_pct')}
                  >
                    <div className="flex items-center justify-center">
                      Final Exam ({GRADE_WEIGHTS.finalExam}%) {getSortIcon('final_exam_pct')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center text-foreground cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('ai_project_pct')}
                  >
                    <div className="flex items-center justify-center">
                      AI Project ({GRADE_WEIGHTS.aiProject}%) {getSortIcon('ai_project_pct')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center text-foreground cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('polls_pct')}
                  >
                    <div className="flex items-center justify-center">
                      Polls ({GRADE_WEIGHTS.polls}%) {getSortIcon('polls_pct')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center text-foreground font-bold cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('final_grade')}
                  >
                    <div className="flex items-center justify-center">
                      Final Grade {getSortIcon('final_grade')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium text-foreground">{student.student_name}</TableCell>
                    <TableCell className="text-center p-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max={GRADE_WEIGHTS.assignments}
                        value={getEffectiveValue(student, 'assignments_pct').toFixed(1)}
                        onChange={(e) => handleOverride(student.student_id, 'assignments_pct', parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-center text-sm mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-center p-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max={GRADE_WEIGHTS.midterm}
                        value={getEffectiveValue(student, 'midterm_pct').toFixed(1)}
                        onChange={(e) => handleOverride(student.student_id, 'midterm_pct', parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-center text-sm mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-center p-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max={GRADE_WEIGHTS.finalExam}
                        value={getEffectiveValue(student, 'final_exam_pct').toFixed(1)}
                        onChange={(e) => handleOverride(student.student_id, 'final_exam_pct', parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-center text-sm mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-center p-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max={GRADE_WEIGHTS.aiProject}
                        value={getEffectiveValue(student, 'ai_project_pct').toFixed(1)}
                        onChange={(e) => handleOverride(student.student_id, 'ai_project_pct', parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-center text-sm mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-center p-1">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max={GRADE_WEIGHTS.polls}
                        value={getEffectiveValue(student, 'polls_pct').toFixed(1)}
                        onChange={(e) => handleOverride(student.student_id, 'polls_pct', parseFloat(e.target.value) || 0)}
                        className="w-16 h-8 text-center text-sm mx-auto"
                      />
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
