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
  assignment_points: number;
  participation_points: number;
  overall_score: number;
  overall_possible: number;
  letter_grade: string;
  submissions_count: number;
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
        .eq('enrollment_status', 'enrolled');
      
      const enrollments: any[] = result.data || [];
      const enrollError = result.error;

      if (enrollError) throw enrollError;

      const studentGradesPromises = enrollments.map(async (enrollment) => {
        const studentId = enrollment.student_id;
        const profile = enrollment.gw_profiles;
        
        // Fetch all grade data for this student
        const [assignmentPoints, participationPoints, submissionsCount] = await Promise.all([
          fetchAssignmentPoints(studentId),
          fetchParticipationPoints(studentId),
          fetchSubmissionsCount(studentId)
        ]);

        // Calculate overall score
        const totalEarned = assignmentPoints.earned + participationPoints;
        const totalPossible = 725; // 650 assignments + 75 participation
        const overallPercentage = totalPossible > 0 ? (totalEarned / totalPossible) * 100 : 0;

        return {
          student_id: studentId,
          student_name: profile?.full_name || 'Unknown',
          student_email: profile?.email || '',
          assignment_points: assignmentPoints.earned,
          participation_points: participationPoints,
          overall_score: totalEarned,
          overall_possible: totalPossible,
          letter_grade: getLetterGrade(overallPercentage),
          submissions_count: submissionsCount
        };
      });

      const studentGrades = await Promise.all(studentGradesPromises);

      // Sort by overall percentage descending
      studentGrades.sort((a, b) => {
        const aPercent = (a.overall_score / a.overall_possible) * 100;
        const bPercent = (b.overall_score / b.overall_possible) * 100;
        return bPercent - aPercent;
      });
      setStudents(studentGrades);
    } catch (error) {
      console.error('Error fetching student grades:', error);
      toast.error('Failed to load student grades');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentPoints = async (studentId: string) => {
    // Fetch journal grades (max 200 points: 10 journals × 20 points)
    const { data: journals } = await supabase
      .from('mus240_journal_grades')
      .select('overall_score')
      .eq('student_id', studentId);

    const journalPoints = (journals || []).reduce((sum, j) => sum + (j.overall_score || 0), 0);
    
    // Fetch all assignment submissions (excluding journals)
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('grade')
      .eq('student_id', studentId);

    const assignmentPoints = (submissions || []).reduce((sum, s) => sum + (s.grade || 0), 0);
    
    // Total assignment points = journals + other assignments (out of 650 total)
    return { earned: journalPoints + assignmentPoints, possible: 650 };
  };

  const fetchParticipationPoints = async (studentId: string) => {
    // Fetch participation grades
    const { data: participation } = await supabase
      .from('mus240_participation_grades')
      .select('points_earned')
      .eq('student_id', studentId)
      .single();

    // Fetch poll responses
    const { data: pollResponses } = await supabase
      .from('mus240_poll_responses')
      .select('poll_id')
      .eq('student_id', studentId);

    const { data: allPolls } = await supabase
      .from('mus240_polls')
      .select('id');

    const basePoints = participation?.points_earned || 0;
    const uniquePolls = new Set(pollResponses?.map(r => r.poll_id) || []).size;
    const totalPolls = allPolls?.length || 0;
    const pollRate = totalPolls > 0 ? uniquePolls / totalPolls : 0;
    
    // Combined participation: 70% base + 30% polls, out of 75 points
    const normalizedBase = (basePoints / 75);
    return ((normalizedBase * 0.7) + (pollRate * 0.3)) * 75;
  };

  const fetchSubmissionsCount = async (studentId: string) => {
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('id')
      .eq('student_id', studentId);

    return submissions?.length || 0;
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
      ['Student Name', 'Email', 'Assignment Points', 'Participation', 'Overall Score', 'Overall %', 'Letter Grade', 'Submissions'].join(','),
      ...students.map(s => [
        s.student_name,
        s.student_email,
        `${s.assignment_points}/650`,
        `${s.participation_points.toFixed(0)}/75`,
        `${s.overall_score.toFixed(0)}/725`,
        ((s.overall_score / s.overall_possible) * 100).toFixed(1),
        s.letter_grade,
        s.submissions_count
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
                <TableHead className="text-right">Assignment Points</TableHead>
                <TableHead className="text-right">Participation</TableHead>
                <TableHead className="text-right">Overall Score</TableHead>
                <TableHead className="text-center">Grade</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => {
                const overallPercentage = (student.overall_score / student.overall_possible) * 100;
                return (
                  <TableRow 
                    key={student.student_id}
                    className="hover:bg-muted/50"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.student_name}</p>
                        <p className="text-sm text-muted-foreground">{student.student_email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{student.assignment_points.toFixed(0)}/650</p>
                        <div className="w-24 bg-muted rounded-full h-1.5 ml-auto">
                          <div 
                            className="bg-primary h-1.5 rounded-full" 
                            style={{ width: `${Math.min((student.assignment_points / 650) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{student.participation_points.toFixed(0)}/75</p>
                        <div className="w-24 bg-muted rounded-full h-1.5 ml-auto">
                          <div 
                            className="bg-primary h-1.5 rounded-full" 
                            style={{ width: `${Math.min((student.participation_points / 75) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{overallPercentage.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">{student.overall_score.toFixed(0)}/725</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={getLetterGradeColor(student.letter_grade)}>
                        {student.letter_grade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm">{student.submissions_count}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/mus-240/instructor/student/${student.student_id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
