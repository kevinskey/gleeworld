import React from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { ModuleProps } from '@/types/unified-modules';
import { StudentDashboardContent } from '@/components/grading/student/StudentDashboardContent';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Navigate } from 'react-router-dom';

export const GradingModule: React.FC<ModuleProps> = () => {
  const { profile, loading } = useUserRole();

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  const isInstructor = profile?.role === 'instructor' || profile?.is_admin || profile?.is_super_admin;

  return (
    <div className="container mx-auto py-6">
      {isInstructor ? (
        <Navigate to="/mus-240/instructor/console" replace />
      ) : (
        <StudentDashboardContent />
      )}
    </div>
  );
};
