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

  const enrolledCourses = enrollments
    .map(e => {
      const course = ACADEMY_COURSES.find(c => c.id === e.course_id);
      return course ? { ...course, enrollment: e } : null;
    })
    .filter(Boolean) as (typeof ACADEMY_COURSES[number] & { enrollment: any })[];

  return (
    <UniversalLayout>
      <div className="min-h-[80vh] bg-[#f8f9fb]">
        {/* Header */}
        <div className="bg-[#003366] py-10">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/15 mb-4">
              <BookOpen className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: "'Cinzel', serif" }}>
              Your Classes
            </h1>
            <p className="text-white/70 text-sm">Select a class to continue</p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-10">
          {enrolledCourses.length === 0 ? (
            <Card className="text-center py-12 bg-white border border-border shadow-sm">
              <CardContent>
                <p className="text-foreground/60 mb-4">You are not enrolled in any courses yet.</p>
                <Button onClick={() => navigate('/academy')} variant="outline">
                  Browse Academy
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {enrolledCourses.map(course => {
                const Icon = course.icon;
                return (
                  <Card
                    key={course.id}
                    className="group cursor-pointer bg-white border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-200"
                    onClick={() => navigate(course.route)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-1">
                            {course.courseCode}
                          </p>
                          <h3 className="text-base font-semibold text-foreground leading-snug mb-1">
                            {course.title}
                          </h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                        </div>
                      </div>
                      <div className="flex justify-end mt-4">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
                          Enter Course <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="text-center mt-10">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground">
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default CourseSelection;
