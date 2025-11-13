import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export const StudentDashboardContent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['gw-student-enrollments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gw_enrollments' as any)
        .select('*, gw_courses(*)')
        .eq('student_id', user?.id)
        .order('created_at', { ascending: false});

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
        <h1 className="text-3xl font-bold mb-2">My Courses</h1>
        <p className="text-muted-foreground">View your enrolled courses and assignments</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {enrollments?.map((enrollment) => (
          <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {enrollment.gw_courses?.course_code}
              </CardTitle>
              <CardDescription>{enrollment.gw_courses?.course_name}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => navigate(`/grading/student/course/${enrollment.course_id}`)}
              >
                View Course
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {!enrollments || enrollments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">You are not enrolled in any courses yet.</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};
