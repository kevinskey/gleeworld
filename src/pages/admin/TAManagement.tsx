import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { TAManagement as TAManagementComponent } from '@/components/admin/TAManagement';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

export const TAManagementPage = () => {
  const { isAdmin, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardPageShell
      maxWidth="7xl"
      title="Teaching Assistant Management"
      subtitle="Manage teaching assistants for courses"
    >
      <TAManagementComponent />
    </DashboardPageShell>
  );
};
