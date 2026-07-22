import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StudentCourseView } from '@/components/grading/student/StudentCourseView';

const StudentCoursePage: React.FC = () => {
  const { course_id } = useParams<{ course_id: string }>();
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!course_id) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <StudentCourseView courseId={course_id} />
    </DashboardShell>
    </UniversalLayout>
  );
};

export default StudentCoursePage;
