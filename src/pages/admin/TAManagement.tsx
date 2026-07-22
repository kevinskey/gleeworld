import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { TAManagement as TAManagementComponent } from '@/components/admin/TAManagement';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export const TAManagementPage = () => {
  const { isAdmin, loading } = useUserRole();

  if (loading) {
    return (
      <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
        <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center py-20">
          <div className="text-lg">Loading...</div>
        </div>
      </DashboardShell>
    </UniversalLayout>
    );
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
    <DashboardPageShell
      maxWidth="7xl"
      title="Teaching Assistant Management"
      subtitle="Manage teaching assistants for courses"
    >
      <TAManagementComponent />
    </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
};
