import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface AdminOnlyRouteProps {
  children: ReactNode;
}

export const AdminOnlyRoute = ({ children }: AdminOnlyRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, isAdmin } = useUserRole();
  
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  console.log('AdminOnlyRoute: Checking admin access', {
    user: !!user,
    profile: !!profile,
    profileData: profile,
    isAdmin: isAdmin(),
    is_admin: profile?.is_admin,
    is_super_admin: profile?.is_super_admin,
    is_exec_board: profile?.is_exec_board,
    role: profile?.role,
    currentPath: window.location.pathname
  });
  
  if (!isAdmin()) {
    // Redirect non-admin users to member dashboard
    return <Navigate to="/dashboard/member" replace />;
  }
  
  return <>{children}</>;
};