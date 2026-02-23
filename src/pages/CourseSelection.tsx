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

  // Preferred display order: Glee Club, Survey of African American Music, MUS 210, Bowman Scholars, then rest
  const PREFERRED_ORDER = ['MUS 070', 'MUS 240', 'MUS 210', 'LH 100'];

  const enrolledCourses = enrollments
    .map(e => {
      const course = ACADEMY_COURSES.find(c => c.id === e.course_id);
      return course ? { ...course, enrollment: e } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aIdx = PREFERRED_ORDER.indexOf(a!.courseCode);
      const bIdx = PREFERRED_ORDER.indexOf(b!.courseCode);
      const aPriority = aIdx === -1 ? PREFERRED_ORDER.length : aIdx;
      const bPriority = bIdx === -1 ? PREFERRED_ORDER.length : bIdx;
      return aPriority - bPriority;
    }) as (typeof ACADEMY_COURSES[number] & { enrollment: any })[];

  return (
    <UniversalLayout containerized={false}>
      <div className="min-h-[80vh] relative overflow-hidden pb-32 md:pb-16" style={{ background: 'linear-gradient(160deg, #0a1628 0%, #0d1f3c 25%, #081430 50%, #060e1f 75%, #030812 100%)' }}>
        {/* Deep sea mesh gradient orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[15%] w-[700px] h-[700px] rounded-full blur-[150px]" style={{ background: 'radial-gradient(circle, rgba(56,146,227,0.12) 0%, transparent 70%)' }} />
          <div className="absolute bottom-[-5%] right-[10%] w-[600px] h-[600px] rounded-full blur-[130px]" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
          <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-[160px]" style={{ background: 'radial-gradient(circle, rgba(30,64,120,0.15) 0%, transparent 70%)' }} />
          {/* The Glow — deep electric blue mesh gradient behind bento grid */}
          <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[1200px] h-[900px] rounded-full blur-[200px]" style={{ background: 'radial-gradient(ellipse at center, rgba(0,71,171,0.20) 0%, rgba(0,71,171,0.08) 40%, transparent 70%)' }} />
        </div>
        {/* Film grain noise overlay */}
        <div className="fixed inset-0 -z-[5] pointer-events-none opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }} />

        {/* Header */}
        <div className="relative pt-6 md:pt-12 pb-4 md:pb-8">
          <div className="max-w-6xl mx-auto px-4 md:px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl mb-6">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-xs font-medium tracking-wide text-sky-300/70 uppercase">Your Classes</span>
            </div>
            <h1
              className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-3"
              style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}
            >
              Course Dashboard
            </h1>
            <p className="text-base text-slate-400 max-w-md mx-auto">
              Select a class to continue your learning journey
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-4 md:px-6 pb-8 md:pb-16">
          {enrolledCourses.length === 0 ? (
            <div className="rounded-2xl p-12 text-center bg-white/5 backdrop-blur-[20px] border border-white/10">
              <p className="text-slate-400 mb-4 text-base">You are not enrolled in any courses yet.</p>
              <Button onClick={() => navigate('/academy')} variant="outline" className="rounded-xl border-white/20 text-white hover:bg-white/10">
                Browse Academy
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 auto-rows-auto md:auto-rows-[180px] gap-3 md:gap-4">
              {enrolledCourses.map((course, i) => {
                const Icon = course.icon;
                const bentoClass = BENTO_SIZES[i % BENTO_SIZES.length];
                const isLarge = bentoClass.includes('col-span-2') || bentoClass.includes('row-span-2');

                return (
                    <div
                    key={course.id}
                    className={`
                      group relative cursor-pointer rounded-2xl p-4 md:p-6
                      bg-white/[0.03] backdrop-blur-xl
                      border border-white/10
                      shadow-[0_4px_30px_-4px_rgba(56,146,227,0.08),inset_0_1px_0_0_rgba(255,255,255,0.12),inset_0_-1px_0_0_rgba(0,0,0,0.15)]
                      transition-all duration-300 ease-out
                      hover:scale-[1.02] hover:bg-white/[0.07]
                      hover:shadow-[0_8px_50px_-8px_rgba(56,146,227,0.2),inset_0_1px_0_0_rgba(255,255,255,0.18),inset_0_-1px_0_0_rgba(0,0,0,0.1)]
                      hover:border-white/20
                      active:scale-[0.98]
                      ${bentoClass}
                    `}
                    onClick={() => navigate(course.route)}
                  >
                    {/* Soft glow on hover */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(56,146,227,0.06),transparent_70%)]" />

                    <div className="relative h-full flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-sky-400/10 backdrop-blur-sm border border-sky-400/10 flex items-center justify-center group-hover:bg-sky-400/15 transition-colors">
                            <Icon className="h-5 w-5 text-sky-400" />
                          </div>
                          <span className="text-xs font-semibold text-sky-400/70 uppercase tracking-widest">
                            {course.courseCode}
                          </span>
                        </div>

                        <h3
                          className={`font-semibold text-white leading-snug mb-2 ${isLarge ? 'text-2xl' : 'text-lg'}`}
                          style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}
                        >
                          {course.title}
                        </h3>

                        {isLarge && (
                          <p className="text-base text-slate-400 line-clamp-3 leading-relaxed">
                            {course.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-sm font-medium text-sky-400/60 group-hover:text-sky-300 group-hover:translate-x-1 transition-all duration-300">
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
