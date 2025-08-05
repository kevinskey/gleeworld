import { useAuth } from "@/contexts/AuthContext";
import React from "react";
import { useNavigate } from "react-router-dom";
import { DashboardTemplate } from "./DashboardTemplate";
import { ModularAdminDashboard } from "./ModularAdminDashboard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ErrorState } from "@/components/shared/ErrorState";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";

export const AdminViewDashboard = () => {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading, isAdmin, isSuperAdmin } = useUserRole();
  const { userProfile } = useUserProfile(user);
  const navigate = useNavigate();

  // Error boundary to catch component errors
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('AdminViewDashboard caught error:', error);
      setError(new Error(error.message));
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    console.error('AdminViewDashboard Error:', error);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ErrorState
          title="Dashboard Error"
          message={error.message}
          onRetry={() => setError(null)}
        />
      </div>
    );
  }

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    );
  }

  if (!user) {
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
      user={{
        ...user,
        avatar_url: userProfile?.avatar_url
      }}
      title={getTitle()}
      subtitle={getSubtitle()}
      backgroundImage={backgroundImage}
    >
      <ModularAdminDashboard user={user} />
    </DashboardTemplate>
  );
};