import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseEnrollments } from '@/hooks/useCourseEnrollments';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight } from 'lucide-react';

const CourseSelection: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enrollments, loading } = useCourseEnrollments();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading your courses..." />
      </div>
    );
  }

  // Match enrollments to course config
  const enrolledCourses = enrollments
    .map(e => {
      const course = ACADEMY_COURSES.find(c => c.id === e.course_id);
      return course ? { ...course, enrollment: e } : null;
    })
    .filter(Boolean) as (typeof ACADEMY_COURSES[number] & { enrollment: any })[];

  return (
    <UniversalLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Classes</h1>
          <p className="text-muted-foreground">Select a class to continue</p>
        </div>

        {enrolledCourses.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-muted-foreground mb-4">You are not enrolled in any courses yet.</p>
              <Button onClick={() => navigate('/academy')} variant="outline">
                Browse Academy
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {enrolledCourses.map(course => {
              const Icon = course.icon;
              return (
                <Card
                  key={course.id}
                  className="cursor-pointer hover:shadow-md transition-shadow bg-white border border-border hover:border-primary/40"
                  onClick={() => navigate(course.route)}
                >
                  <CardContent className="flex items-center gap-4 p-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                        {course.courseCode}
                      </p>
                      <h3 className="text-lg font-semibold text-[#0f172a] truncate">
                        {course.title}
                      </h3>
                      <p className="text-sm text-[#64748b] truncate">{course.description}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#64748b] flex-shrink-0" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center mt-8">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            Go to Dashboard instead
          </Button>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default CourseSelection;
