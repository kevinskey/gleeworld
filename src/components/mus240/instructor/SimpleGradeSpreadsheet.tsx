import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Search, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export const SimpleGradeSpreadsheet: React.FC = () => {
  const [students, setStudents] = useState<StudentGradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    try {
      setLoading(true);

      // Get enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from('mus240_enrollments')
        .select('student_id, gw_profiles(user_id, full_name)')
        .eq('enrollment_status', 'enrolled');

      if (enrollError) throw enrollError;

      const studentIds = enrollments?.map((e: any) => e.student_id) || [];
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

      // Midterm scores by student
      const midtermByStudent = new Map<string, number>();
      midterms.forEach((m: any) => {
        midtermByStudent.set(m.user_id, m.grade || 0);
      });

      // Final exam scores by student  
      const finalByStudent = new Map<string, number>();
      finals.forEach((f: any) => {
        finalByStudent.set(f.student_id, f.total_score || 0);
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
      const studentGrades: StudentGradeRow[] = enrollments!.map((enrollment: any) => {
        const studentId = enrollment.student_id;
        const studentName = enrollment.gw_profiles?.full_name || 'Unknown';

        // Assignments (journals): earned / 200 max, capped at 100%
        const journalPoints = Math.min(journalsByStudent.get(studentId) || 0, 200);
        const assignmentsPct = (journalPoints / 200) * GRADE_WEIGHTS.assignments;

        // Midterm: earned / 100 max
        const midtermScore = midtermByStudent.get(studentId) || 0;
        const midtermPct = (midtermScore / 100) * GRADE_WEIGHTS.midterm;

        // Final Exam: earned / 100 max
        const finalScore = finalByStudent.get(studentId) || 0;
        const finalExamPct = (finalScore / 100) * GRADE_WEIGHTS.finalExam;

        // AI Project: Everyone gets 100% (full 25%)
        const aiProjectPct = GRADE_WEIGHTS.aiProject;

        // Polls: curved based on max polls answered by any student
        const pollsAnswered = pollCountByStudent.get(studentId)?.size || 0;
        const pollsPct = maxPollsAnswered > 0 
          ? (pollsAnswered / maxPollsAnswered) * GRADE_WEIGHTS.polls 
          : 0;

        // Final grade: sum of all percentages
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

      // Sort by final grade descending
      studentGrades.sort((a, b) => b.final_grade_pct - a.final_grade_pct);
      setStudents(studentGrades);
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
      s.assignments_pct,
      s.midterm_pct,
      s.final_exam_pct,
      s.ai_project_pct,
      s.polls_pct,
      s.final_grade_pct
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

  const filteredStudents = students.filter(s =>
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                  <TableHead className="text-foreground">Student Name</TableHead>
                  <TableHead className="text-center text-foreground">Assignments ({GRADE_WEIGHTS.assignments}%)</TableHead>
                  <TableHead className="text-center text-foreground">Midterm ({GRADE_WEIGHTS.midterm}%)</TableHead>
                  <TableHead className="text-center text-foreground">Final Exam ({GRADE_WEIGHTS.finalExam}%)</TableHead>
                  <TableHead className="text-center text-foreground">AI Project ({GRADE_WEIGHTS.aiProject}%)</TableHead>
                  <TableHead className="text-center text-foreground">Polls ({GRADE_WEIGHTS.polls}%)</TableHead>
                  <TableHead className="text-center text-foreground font-bold">Final Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium text-foreground">{student.student_name}</TableCell>
                    <TableCell className="text-center text-foreground">{student.assignments_pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-center text-foreground">{student.midterm_pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-center text-foreground">{student.final_exam_pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-center text-foreground">{student.ai_project_pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-center text-foreground">{student.polls_pct.toFixed(1)}%</TableCell>
                    <TableCell className="text-center font-bold text-foreground">{student.final_grade_pct.toFixed(1)}%</TableCell>
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
