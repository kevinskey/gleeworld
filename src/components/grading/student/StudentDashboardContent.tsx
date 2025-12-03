import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StudentGradesOverview } from './StudentGradesOverview';
import { StudentTestsSection } from './StudentTestsSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const StudentDashboardContent: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'courses' | 'tests' | 'grades'>('courses');

  const { data: enrollments, isLoading, refetch } = useQuery({
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

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('student-dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gw_enrollments',
          filter: `student_id=eq.${user.id}`
        },
        () => {
          console.log('Enrollment changed, refetching');
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading courses..." />;
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6 px-4 sm:px-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Student Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground">View your courses, assignments, and grades</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'courses' | 'tests' | 'grades')}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="courses" className="text-sm sm:text-base">My Courses</TabsTrigger>
          <TabsTrigger value="tests" className="text-sm sm:text-base">Tests</TabsTrigger>
          <TabsTrigger value="grades" className="text-sm sm:text-base">Grades</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-6">
          {!enrollments || enrollments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">You are not enrolled in any courses yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {enrollments?.map((enrollment) => (
                <Card key={enrollment.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3 sm:pb-6">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                      <span className="truncate">{enrollment.gw_courses?.course_code}</span>
                    </CardTitle>
                    <CardDescription className="text-sm line-clamp-2">{enrollment.gw_courses?.course_name}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button
                      className="w-full text-sm sm:text-base"
                      onClick={() => navigate(`/grading/student/course/${enrollment.course_id}`)}
                    >
                      View Course
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tests" className="mt-6">
          <StudentTestsSection />
        </TabsContent>

        <TabsContent value="grades" className="mt-6">
          <StudentGradesOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
};
