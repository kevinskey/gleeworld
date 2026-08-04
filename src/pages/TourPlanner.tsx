import React from 'react';
import { TourManagerDashboard } from '@/components/tour-manager/TourManagerDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

const TourPlanner: React.FC = () => {
  const { user: authUser } = useAuth();
  const { profile } = useUserRole();

  const user = authUser
    ? {
        id: authUser.id,
        email: profile?.email ?? authUser.email,
        full_name: profile?.full_name,
        role: profile?.role,
        is_exec_board: profile?.is_exec_board ?? false,
      }
    : undefined;

  // No UniversalLayout/DashboardShell here: every route that renders this page
  // (/tour-manager, /travel-manager, /travel-planner, /tour-planner) already
  // wraps it in both, so doing it again nested a second shell inside the first.
  return <TourManagerDashboard user={user} />;
};

export default TourPlanner;
