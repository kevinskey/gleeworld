import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseEnrollments } from '@/hooks/useCourseEnrollments';
import { ACADEMY_COURSES } from '@/config/academyCourses';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { BookOpen, ArrowRight, Sparkles } from 'lucide-react';

const BENTO_SIZES = [
  'md:col-span-2 md:row-span-2',
  'md:col-span-1 md:row-span-1',
  'md:col-span-1 md:row-span-2',
  'md:col-span-2 md:row-span-1',
  'md:col-span-1 md:row-span-1',
  'md:col-span-1 md:row-span-1',
];

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
      <div className="min-h-[80vh] relative overflow-hidden">
        {/* Mesh gradient background */}
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/10 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-secondary/6 blur-[140px]" />
        </div>

        {/* Header */}
        <div className="relative pt-12 pb-8">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/40 bg-card/50 backdrop-blur-xl mb-6">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Your Classes</span>
            </div>
            <h1
              className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-3"
              style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}
            >
              Course Dashboard
            </h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto">
              Select a class to continue your learning journey
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 pb-16">
          {enrolledCourses.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <p className="text-muted-foreground mb-4 text-base">You are not enrolled in any courses yet.</p>
              <Button onClick={() => navigate('/academy')} variant="outline" className="rounded-xl">
                Browse Academy
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 auto-rows-[180px] gap-4">
              {enrolledCourses.map((course, i) => {
                const Icon = course.icon;
                const bentoClass = BENTO_SIZES[i % BENTO_SIZES.length];
                const isLarge = bentoClass.includes('col-span-2') || bentoClass.includes('row-span-2');

                return (
                  <div
                    key={course.id}
                    className={`
                      group relative cursor-pointer rounded-2xl p-6
                      bg-card/40 backdrop-blur-[20px]
                      border border-border/30
                      shadow-[0_2px_20px_-4px_hsl(var(--primary)/0.06)]
                      transition-all duration-300 ease-out
                      hover:scale-[1.02] hover:shadow-[0_8px_40px_-8px_hsl(var(--primary)/0.15)]
                      hover:border-primary/20 hover:bg-card/60
                      active:scale-[0.98]
                      ${bentoClass}
                    `}
                    onClick={() => navigate(course.route)}
                  >
                    {/* Soft glow on hover */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.04),transparent_70%)]" />

                    <div className="relative h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 backdrop-blur-sm border border-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <span className="text-xs font-semibold text-primary/80 uppercase tracking-widest">
                            {course.courseCode}
                          </span>
                        </div>

                        <h3
                          className={`font-semibold text-foreground leading-snug mb-2 ${isLarge ? 'text-2xl' : 'text-lg'}`}
                          style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}
                        >
                          {course.title}
                        </h3>

                        {isLarge && (
                          <p className="text-base text-muted-foreground line-clamp-3 leading-relaxed">
                            {course.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-sm font-medium text-primary/70 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300">
                        Enter Course <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-center mt-12">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="text-muted-foreground hover:text-foreground rounded-xl"
            >
              ← Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    </UniversalLayout>
  );
};

export default CourseSelection;
