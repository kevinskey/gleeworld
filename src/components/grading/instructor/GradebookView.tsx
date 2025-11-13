import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

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
        .single();

      if (error) throw error;
      return data as any;
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

  if (courseLoading || enrollmentsLoading) {
    return <LoadingSpinner size="lg" text="Loading gradebook..." />;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/grading/instructor/course/${courseId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Gradebook</h1>
          <p className="text-muted-foreground">{course?.course_name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enrolled Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {enrollments?.map((enrollment) => (
              <div key={enrollment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{enrollment.gw_profiles?.full_name || enrollment.gw_profiles?.email}</p>
                  <p className="text-sm text-muted-foreground">{enrollment.gw_profiles?.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Comprehensive grade view coming soon...</p>
                </div>
              </div>
            ))}
          </div>
          {!enrollments || enrollments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No enrolled students.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};
