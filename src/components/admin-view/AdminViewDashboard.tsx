import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";
import { DashboardTemplate } from "./DashboardTemplate";
import { AdminDashboard } from "./dashboards/AdminDashboard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from '@/integrations/supabase/client';

export const AdminViewDashboard = () => {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading, isAdmin, isSuperAdmin } = useUserRole();
  const navigate = useNavigate();

  // Debug logging
  console.log('AdminViewDashboard - loading:', loading);
  console.log('AdminViewDashboard - profileLoading:', profileLoading);
  console.log('AdminViewDashboard - user:', user);
  console.log('AdminViewDashboard - profile:', profile);
  console.log('AdminViewDashboard - isAdmin:', isAdmin());
  console.log('AdminViewDashboard - isSuperAdmin:', isSuperAdmin());

  // Note: Removed automatic redirect to allow admin setup

  if (loading || profileLoading) {
    console.log('AdminViewDashboard - showing loading spinner');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    );
  }

  if (!user) {
    console.log('AdminViewDashboard - no user, showing auth required');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState
          title="Authentication Required"
          message="Please sign in to access the admin dashboard"
          onRetry={() => navigate('/auth')}
        />
      </div>
    );
  }

  // Since we've fixed the RLS policies, users with admin/super-admin roles should proceed directly to dashboard
  // No need for the "Make Me Admin" interface anymore
  console.log('AdminViewDashboard - user authenticated, proceeding to dashboard');

  // Use admin background
  const backgroundImage = "/lovable-uploads/7f76a692-7ffc-414c-af69-fc6585338524.png";

  const getTitle = () => {
    return isSuperAdmin() ? 'Super Admin Dashboard' : 'Admin Dashboard';
  };

  const getSubtitle = () => {
    return 'Manage the Spelman College Glee Club platform';
  };

  return (
    <DashboardTemplate
      user={user}
      title={getTitle()}
      subtitle={getSubtitle()}
      backgroundImage={backgroundImage}
      headerActions={
        <Button onClick={() => navigate('/dashboard')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      }
    >
      <AdminDashboard user={user} />
    </DashboardTemplate>
  );
};