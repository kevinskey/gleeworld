import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface CourseGrade {
  course_id: string;
  course_code: string;
  course_title: string;
  total_points: number;
  earned_points: number;
  percentage: number;
  graded_count: number;
  total_count: number;
}

export const StudentGradesOverview: React.FC = () => {
  const { user } = useAuth();

  const { data: grades, isLoading } = useQuery({
    queryKey: ['student-grades-overview', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all enrollments for this student
      const { data: enrollments, error: enrollError } = await supabase
        .from('gw_enrollments' as any)
        .select('course_id, gw_courses(id, code, title)')
        .eq('student_id', user.id);

      if (enrollError) throw enrollError;

      const courseGrades: CourseGrade[] = [];

      for (const enrollment of enrollments || []) {
        const course = (enrollment as any).gw_courses;
        
        // Get all assignments for this course
        const { data: assignments } = await supabase
          .from('gw_assignments' as any)
          .select('id, points')
          .eq('course_id', course.id);

        // Get grades for this student in this course
        const { data: gradesInCourse } = await supabase
          .from('gw_grades' as any)
          .select('assignment_id, total_score, max_points')
          .eq('student_id', user.id)
          .in('assignment_id', (assignments || []).map((a: any) => a.id));

        const totalPoints = (assignments || []).reduce((sum: number, a: any) => sum + (a.points || 0), 0);
        const earnedPoints = (gradesInCourse || []).reduce((sum: number, g: any) => sum + (g.total_score || 0), 0);
        const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

        courseGrades.push({
          course_id: course.id,
          course_code: course.code,
          course_title: course.title,
          total_points: totalPoints,
          earned_points: earnedPoints,
          percentage,
          graded_count: (gradesInCourse || []).length,
          total_count: assignments?.length || 0,
        });
      }

      return courseGrades;
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading grades..." />;
  }

  if (!grades || grades.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Grades</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No courses with grades yet.</p>
        </CardContent>
      </Card>
    );
  }

  const overallPercentage = grades.length > 0
    ? grades.reduce((sum, g) => sum + g.percentage, 0) / grades.length
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Average Grade</span>
            <span className="text-3xl font-bold">{overallPercentage.toFixed(1)}%</span>
          </div>
          <Progress value={overallPercentage} className="h-3" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Courses</p>
              <p className="text-xl font-semibold">{grades.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Assignments Graded</p>
              <p className="text-xl font-semibold">
                {grades.reduce((sum, g) => sum + g.graded_count, 0)} / {grades.reduce((sum, g) => sum + g.total_count, 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {grades.map((grade) => (
          <Card key={grade.course_id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{grade.course_code}</CardTitle>
                  <p className="text-sm text-muted-foreground">{grade.course_title}</p>
                </div>
                <Badge variant={grade.percentage >= 90 ? 'default' : grade.percentage >= 70 ? 'secondary' : 'destructive'}>
                  {grade.percentage.toFixed(1)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={grade.percentage} className="h-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {grade.earned_points} / {grade.total_points} points
                </span>
                <span className="text-muted-foreground">
                  {grade.graded_count} / {grade.total_count} graded
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
