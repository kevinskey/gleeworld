import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AssignmentSubmissionsView } from '@/components/grading/instructor/AssignmentSubmissionsView';

const AssignmentSubmissionsPage: React.FC = () => {
  const { assignment_id } = useParams<{ assignment_id: string }>();
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

  if (!assignment_id) {
    return <Navigate to="/grading/instructor/dashboard" replace />;
  }

  return (
    <UniversalLayout>
      <AssignmentSubmissionsView assignmentId={assignment_id} />
    </UniversalLayout>
  );
};

export default AssignmentSubmissionsPage;
