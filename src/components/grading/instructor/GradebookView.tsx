import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, BookOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface GradebookViewProps {
  courseId: string;
}

export const GradebookView: React.FC<GradebookViewProps> = ({ courseId }) => {
  const navigate = useNavigate();

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['gw-course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_courses' as any)
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['gw-course-assignments', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_assignments' as any)
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as any[];
    },
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['gw-course-enrollments', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_enrollments' as any)
        .select('*, gw_profiles(full_name, email)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as any[];
    },
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ['gw-course-submissions', courseId],
    queryFn: async () => {
      if (!assignments || assignments.length === 0) return [];
      
      const assignmentIds = assignments.map(a => a.id);
      const { data, error } = await supabase
        .from('gw_submissions' as any)
        .select('*')
        .in('assignment_id', assignmentIds);

      if (error) throw error;
      return data;
    },
    enabled: !!assignments && assignments.length > 0,
  });

  const { data: gradeRecords, isLoading: gradesLoading } = useQuery({
    queryKey: ['gw-course-grades', courseId],
    queryFn: async () => {
      if (!assignments || assignments.length === 0) return [];
      
      const assignmentIds = assignments.map(a => a.id);
      const { data, error } = await supabase
        .from('gw_grades' as any)
        .select('*')
        .in('assignment_id', assignmentIds);

      if (error) throw error;
      return data;
    },
    enabled: !!assignments && assignments.length > 0,
  });

  // Calculate gradebook data
  const gradebookData = useMemo(() => {
    if (!enrollments || !assignments || !submissions || !gradeRecords) return [];

    return enrollments.map(enrollment => {
      const studentId = enrollment.student_id;
      const studentName = enrollment.gw_profiles?.full_name || enrollment.gw_profiles?.email || 'Unknown';
      
      const assignmentGrades = assignments.map(assignment => {
        const submission = (submissions as any[] || []).find(
          (s: any) => s.student_id === studentId && s.assignment_id === assignment.id
        );
        const gradeRec = (gradeRecords as any[] || []).find(
          (g: any) => g.student_id === studentId && g.assignment_id === assignment.id
        );
        const gradeValue = gradeRec?.total_score ?? null;
        const status = gradeRec ? 'graded' : (submission ? (submission.status || 'submitted') : 'not_submitted');
        return {
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          assignmentPoints: assignment.points || 100,
          grade: gradeValue,
          status,
          submittedAt: submission?.submitted_at,
        };
      });

      const totalPoints = assignments.reduce((sum, a) => sum + (a.points || 100), 0);
      const earnedPoints = grades.reduce((sum, g) => sum + (g.grade || 0), 0);
      const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      return {
        studentId,
        studentName,
        studentEmail: enrollment.gw_profiles?.email,
        grades,
        totalPoints,
        earnedPoints,
        percentage,
      };
    });
  }, [enrollments, assignments, submissions]);

  const getGradeColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const exportToCSV = () => {
    if (!gradebookData || gradebookData.length === 0) return;

    const headers = ['Student', 'Email', ...assignments.map(a => a.title), 'Total Points', 'Percentage'];
    const rows = gradebookData.map(student => [
      student.studentName,
      student.studentEmail,
      ...student.grades.map(g => g.grade !== null ? g.grade : '-'),
      student.earnedPoints,
      student.percentage.toFixed(2) + '%',
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course?.code}_gradebook.csv`;
    a.click();
  };

  if (courseLoading || assignmentsLoading || enrollmentsLoading || submissionsLoading || gradesLoading) {
    return <LoadingSpinner size="lg" text="Loading gradebook..." />;
  }

  if (!course) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Course not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/grading/instructor/course/${courseId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              Gradebook
            </h1>
            <p className="text-muted-foreground">{course?.code} - {course?.title}</p>
          </div>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {enrollments?.length || 0} Students · {assignments?.length || 0} Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Student</TableHead>
                  {assignments?.map(assignment => (
                    <TableHead key={assignment.id} className="text-center min-w-[120px]">
                      <div className="space-y-1">
                        <div className="font-semibold">{assignment.title}</div>
                        <div className="text-xs text-muted-foreground">{assignment.points} pts</div>
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center min-w-[100px]">Total</TableHead>
                  <TableHead className="text-center min-w-[100px]">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gradebookData.map(student => (
                  <TableRow key={student.studentId}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">
                      <div>
                        <div>{student.studentName}</div>
                        <div className="text-xs text-muted-foreground">{student.studentEmail}</div>
                      </div>
                    </TableCell>
                    {student.grades.map((grade, idx) => (
                      <TableCell key={idx} className="text-center">
                        {grade.grade !== null ? (
                          <Badge variant="outline" className={getGradeColor(grade.status)}>
                            {grade.grade}/{grade.assignmentPoints}
                          </Badge>
                        ) : grade.status === 'submitted' ? (
                          <Badge variant="outline" className={getGradeColor(grade.status)}>
                            Submitted
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    ))}
                    <TableCell className="text-center font-semibold">
                      {student.earnedPoints}/{student.totalPoints}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      <Badge variant={student.percentage >= 90 ? 'default' : student.percentage >= 70 ? 'secondary' : 'destructive'}>
                        {student.percentage.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!gradebookData || gradebookData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No students enrolled yet.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
