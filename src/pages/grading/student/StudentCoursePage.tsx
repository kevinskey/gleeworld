import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
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
    return <Navigate to="/grading/student/dashboard" replace />;
  }

  return (
    <UniversalLayout>
      <StudentCourseView courseId={course_id} />
    </UniversalLayout>
  );
};

export default StudentCoursePage;
