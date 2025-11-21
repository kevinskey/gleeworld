import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface StudentGrade {
  student_id: string;
  student_name: string;
  student_email: string;
  journals_earned: number;
  journals_possible: number;
  ai_group_project: number;
  midterm: number;
  participation: number;
  final_essay: number;
  current_grade: number;
  projected_grade: number;
  letter_grade: string;
}

export const StudentGradesRoster: React.FC = () => {
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchStudentGrades();
  }, []);

  const fetchStudentGrades = async () => {
    try {
      setLoading(true);

      // Get all enrolled students  
      const result = await supabase
        .from('mus240_enrollments' as any)
        .select('student_id, gw_profiles(user_id, full_name, email)')
        .eq('status', 'enrolled');
      
      const enrollments: any[] = result.data || [];
      const enrollError = result.error;

      if (enrollError) throw enrollError;

      const studentGradesPromises = enrollments.map(async (enrollment) => {
        const studentId = enrollment.student_id;
        const profile = enrollment.gw_profiles;
        
        // Fetch all grade data for this student
        const [journalGrades, groupProject, midterm, participation, finalEssay] = await Promise.all([
          fetchJournalGrades(studentId),
          fetchGroupProjectGrade(studentId),
          fetchMidtermGrade(studentId),
          fetchParticipationGrade(studentId),
          fetchFinalEssayGrade(studentId)
        ]);

        // Calculate current and projected grades
        const currentEarned = journalGrades.earned + groupProject + midterm + participation + finalEssay;
        const currentPossible = journalGrades.possible + (groupProject > 0 ? 250 : 0) + (midterm > 0 ? 100 : 0) + (participation > 0 ? 50 : 0) + (finalEssay > 0 ? 50 : 0);
        const currentGrade = currentPossible > 0 ? (currentEarned / currentPossible) * 100 : 0;
        
        // Projected grade assumes perfect scores on remaining work
        const totalPossible = 600; // 200 journals + 250 group + 100 midterm + 50 participation + 50 final
        const projectedGrade = ((currentEarned + (totalPossible - currentPossible)) / totalPossible) * 100;

        return {
          student_id: studentId,
          student_name: profile?.full_name || 'Unknown',
          student_email: profile?.email || '',
          journals_earned: journalGrades.earned,
          journals_possible: journalGrades.possible,
          ai_group_project: groupProject,
          midterm: midterm,
          participation: participation,
          final_essay: finalEssay,
          current_grade: currentGrade,
          projected_grade: projectedGrade,
          letter_grade: getLetterGrade(currentGrade)
        };
      });

      const studentGrades = await Promise.all(studentGradesPromises);

      // Sort by current grade descending
      studentGrades.sort((a, b) => b.current_grade - a.current_grade);
      setStudents(studentGrades);
    } catch (error) {
      console.error('Error fetching student grades:', error);
      toast.error('Failed to load student grades');
    } finally {
      setLoading(false);
    }
  };

  const fetchJournalGrades = async (studentId: string) => {
    const { data: grades } = await supabase
      .from('mus240_journal_grades')
      .select('overall_score')
      .eq('student_id', studentId);

    const earned = (grades || []).reduce((sum, g) => sum + (g.overall_score || 0), 0);
    const possible = (grades || []).length * 20;
    
    return { earned, possible };
  };

  const fetchGroupProjectGrade = async (studentId: string) => {
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('grade')
      .eq('student_id', studentId)
      .or('file_name.ilike.%research%,file_name.ilike.%group%,file_name.ilike.%AI%');

    if (!submissions || submissions.length === 0) return 0;
    
    // Sum all AI/group/research project grades (now combined as one 250-point category)
    const total = submissions.reduce((sum, s) => sum + (s.grade || 0), 0);
    return Math.min(total, 250); // Cap at 250 points
  };

  const fetchMidtermGrade = async (studentId: string) => {
    const { data: midterm } = await supabase
      .from('mus240_midterm_submissions')
      .select('grade')
      .eq('user_id', studentId)
      .eq('is_submitted', true)
      .single();

    if (!midterm?.grade) return 0;
    
    // Convert 90-point midterm to 100-point scale
    return (midterm.grade / 90) * 100;
  };

  const fetchParticipationGrade = async (studentId: string) => {
    const { data: participation } = await supabase
      .from('mus240_participation_grades')
      .select('points_earned, points_possible')
      .eq('student_id', studentId)
      .single();

    const { data: pollResponses } = await supabase
      .from('mus240_poll_responses')
      .select('poll_id')
      .eq('student_id', studentId);

    const { data: allPolls } = await supabase
      .from('mus240_polls')
      .select('id');

    const basePoints = participation?.points_earned || 0;
    const basePossible = participation?.points_possible || 75;
    const uniquePolls = new Set(pollResponses?.map(r => r.poll_id) || []).size;
    const totalPolls = allPolls?.length || 0;
    const pollRate = totalPolls > 0 ? uniquePolls / totalPolls : 0;
    
    const normalizedBase = basePossible > 0 ? (basePoints / basePossible) : 0;
    return ((normalizedBase * 0.7) + (pollRate * 0.3)) * 50;
  };

  const fetchFinalEssayGrade = async (studentId: string) => {
    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select('grade')
      .eq('student_id', studentId)
      .ilike('file_name', '%final%reflection%')
      .single();

    return submission?.grade || 0;
  };

  const getLetterGrade = (percentage: number): string => {
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 63) return 'D';
    if (percentage >= 60) return 'D-';
    return 'F';
  };

  const getLetterGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800';
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800';
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800';
    if (grade.startsWith('D')) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const exportGrades = () => {
    const csv = [
      ['Student Name', 'Email', 'Journals', 'AI Group Project', 'Midterm', 'Participation', 'Final Essay', 'Current %', 'Letter Grade'].join(','),
      ...students.map(s => [
        s.student_name,
        s.student_email,
        `${s.journals_earned}/${s.journals_possible}`,
        s.ai_group_project,
        s.midterm,
        s.participation,
        s.final_essay,
        s.current_grade.toFixed(1),
        s.letter_grade
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mus240_student_grades.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Grades exported successfully');
  };

  const filteredStudents = students.filter(s =>
    s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.student_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-12">
      <div className="text-lg text-muted-foreground">Loading student grades...</div>
    </div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Student Grade Roster</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Cumulative grades for all enrolled students
            </p>
          </div>
          <Button onClick={exportGrades} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Journals</TableHead>
                <TableHead className="text-right">AI Group</TableHead>
                <TableHead className="text-right">Midterm</TableHead>
                <TableHead className="text-right">Participation</TableHead>
                <TableHead className="text-right">Final</TableHead>
                <TableHead className="text-right">Current %</TableHead>
                <TableHead className="text-center">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow 
                  key={student.student_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/classes/mus240/instructor/student/${student.student_id}`)}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{student.student_name}</p>
                      <p className="text-sm text-muted-foreground">{student.student_email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm">
                      {student.journals_earned.toFixed(0)}/{student.journals_possible}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm">{student.ai_group_project.toFixed(0)}/250</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm">{student.midterm.toFixed(0)}/100</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm">{student.participation.toFixed(0)}/50</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm">{student.final_essay.toFixed(0)}/50</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="font-semibold">{student.current_grade.toFixed(1)}%</span>
                      {student.projected_grade > student.current_grade ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-orange-600" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getLetterGradeColor(student.letter_grade)}>
                      {student.letter_grade}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No students found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
          <p>Showing {filteredStudents.length} of {students.length} students</p>
          <p>Click a row to view detailed student profile</p>
        </div>
      </CardContent>
    </Card>
  );
};
