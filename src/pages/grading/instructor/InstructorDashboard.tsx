import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, GraduationCap, ChevronRight } from 'lucide-react';

interface InstructorCourse {
  id: string;
  course_code: string;
  title: string;
  instructor_name: string | null;
  semester: string | null;
}

const InstructorDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserRole();
  const navigate = useNavigate();

  const { data: activeCourses = [], isLoading: coursesLoading } = useQuery({
    queryKey: ['instructor-dashboard-courses', user?.id],
    queryFn: async (): Promise<InstructorCourse[]> => {
      const { data, error } = await supabase
        .from('gw_courses')
        .select('id, course_code, title, instructor_name, semester')
        .eq('is_active', true)
        .order('course_code');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  if (authLoading || profileLoading || coursesLoading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isInstructor = profile?.role === 'instructor' || profile?.is_admin || profile?.is_super_admin;
  if (!isInstructor) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="max-w-6xl mx-auto p-4 sm:p-6" style={{ background: '#f8f9fb' }}>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1" style={{ color: '#0f172a' }}>Instructor Dashboard</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>Select a course to manage</p>
        </div>

        {activeCourses.length === 0 && (
          <div className="rounded-xl border p-8 text-center" style={{ background: '#ffffff', borderColor: '#e2e8f0' }}>
            <GraduationCap className="h-10 w-10 mx-auto mb-3" style={{ color: '#94a3b8' }} />
            <p className="font-medium" style={{ color: '#0f172a' }}>No active courses</p>
            <p className="text-sm mt-1" style={{ color: '#64748b' }}>Create a course to see it here.</p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {activeCourses.map((course) => {
            const courseSlug = course.course_code.toLowerCase().replace(' ', '-');
            return (
              <div
                key={course.id}
                className="rounded-xl border shadow-sm hover:shadow-lg transition-shadow cursor-pointer group p-0"
                style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
                onClick={() => navigate(`/${courseSlug}/instructor/console`)}
              >
                <div className="p-5 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-block text-xs font-medium px-2.5 py-0.5 rounded-full" style={{ background: '#e0f2fe', color: '#003366' }}>
                      {course.semester || 'Course'}
                    </span>
                    <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" style={{ color: '#94a3b8' }} />
                  </div>
                  <h3 className="flex items-center gap-2 text-xl font-bold mt-2" style={{ color: '#0f172a' }}>
                    <GraduationCap className="h-5 w-5" style={{ color: '#003366' }} />
                    {course.course_code}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: '#475569' }}>{course.title}</p>
                </div>
                <div className="px-5 pb-5">
                  <p className="text-sm mb-3" style={{ color: '#64748b' }}>{course.instructor_name}</p>
                  <button className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors" style={{ background: '#003366', color: '#ffffff' }}>
                    <BookOpen className="h-4 w-4" />
                    Open Instructor Console
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardShell>
    </UniversalLayout>
  );
};

export default InstructorDashboard;
