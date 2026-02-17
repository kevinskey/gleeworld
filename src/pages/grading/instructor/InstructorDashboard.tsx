import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { BookOpen, GraduationCap, ChevronRight } from 'lucide-react';

const InstructorDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserRole();
  const navigate = useNavigate();

  if (authLoading || profileLoading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isInstructor = profile?.role === 'instructor' || profile?.is_admin || profile?.is_super_admin;
  if (!isInstructor) {
    return <Navigate to="/dashboard" replace />;
  }

  // Get active courses
  const activeCourses = ACADEMY_COURSES.filter(c => c.isActive);

  return (
    <UniversalLayout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Instructor Dashboard</h1>
          <p className="text-sm text-muted-foreground">Select a course to manage</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeCourses.map((course) => {
            const courseSlug = course.courseCode.toLowerCase().replace(' ', '-');
            return (
              <Card
                key={course.id}
                className="border border-border bg-card hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => navigate(`/${courseSlug}/instructor/console`)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                      {course.level}
                    </Badge>
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="flex items-center gap-2 text-xl mt-2 text-foreground">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    {course.courseCode}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">{course.title}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{course.instructor?.name}</p>
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Open Instructor Console
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </UniversalLayout>
  );
};

export default InstructorDashboard;
