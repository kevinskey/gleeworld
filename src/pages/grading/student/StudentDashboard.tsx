import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { StudentDashboardContent } from '@/components/grading/student/StudentDashboardContent';

const StudentDashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserRole();

  if (authLoading || profileLoading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <StudentDashboardContent />
    </DashboardShell>
    </UniversalLayout>
  );
};

export default StudentDashboard;
