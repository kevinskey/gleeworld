import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { SubmissionGradingView } from '@/components/grading/instructor/SubmissionGradingView';

const SubmissionGradingPage: React.FC = () => {
  const { submission_id } = useParams<{ submission_id: string }>();
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

  if (!submission_id) {
    return <Navigate to="/grading/instructor/dashboard" replace />;
  }

  return (
    <UniversalLayout>
      <SubmissionGradingView submissionId={submission_id} />
    </UniversalLayout>
  );
};

export default SubmissionGradingPage;
