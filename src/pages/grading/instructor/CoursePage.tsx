import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { InstructorCourseView } from '@/components/grading/instructor/InstructorCourseView';

const CoursePage: React.FC = () => {
  const { course_id } = useParams<{ course_id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserRole();

  if (authLoading || profileLoading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isInstructor = profile?.role === 'instructor' || profile?.is_admin || profile?.is_super_admin;
  if (!isInstructor) {
    return <Navigate to="/grading/student/dashboard" replace />;
  }

  if (!course_id) {
    return <Navigate to="/grading/instructor/dashboard" replace />;
  }

  return (
    <UniversalLayout>
      <InstructorCourseView courseId={course_id} />
    </UniversalLayout>
  );
};

export default CoursePage;
