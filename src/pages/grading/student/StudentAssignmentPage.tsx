import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StudentAssignmentView } from '@/components/grading/student/StudentAssignmentView';

const StudentAssignmentPage: React.FC = () => {
  const { assignment_id } = useParams<{ assignment_id: string }>();
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!assignment_id) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <StudentAssignmentView assignmentId={assignment_id} />
    </DashboardShell>
    </UniversalLayout>
  );
};

export default StudentAssignmentPage;
