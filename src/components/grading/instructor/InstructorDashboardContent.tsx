import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, FileText } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export const InstructorDashboardContent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: courses, isLoading } = useQuery({
    queryKey: ['gw-instructor-courses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_courses' as any)
        .select('*')
        .eq('instructor_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading courses..." />;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Instructor Dashboard</h1>
        <p className="text-muted-foreground">Manage your courses, assignments, and student submissions</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses?.map((course) => (
          <Card key={course.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {course.course_code}
              </CardTitle>
              <CardDescription>{course.course_name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/grading/instructor/course/${course.id}`)}
              >
                <FileText className="h-4 w-4 mr-2" />
                View Assignments
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/grading/instructor/course/${course.id}/gradebook`)}
              >
                <Users className="h-4 w-4 mr-2" />
                View Gradebook
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {!courses || courses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No courses found. Contact an administrator to set up your courses.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
