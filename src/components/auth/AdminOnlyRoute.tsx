import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface AdminOnlyRouteProps {
  children: ReactNode;
}

export const AdminOnlyRoute = ({ children }: AdminOnlyRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile(user);
  
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
  
  // Check if user has admin privileges
  const isAdmin = userProfile?.is_admin || userProfile?.is_super_admin || userProfile?.is_exec_board;
  
  // Debug logging
  console.log('AdminOnlyRoute - User Profile:', userProfile);
  console.log('AdminOnlyRoute - Is Admin:', isAdmin);
  
  if (!isAdmin) {
    console.log('AdminOnlyRoute - Redirecting to member dashboard, user is not admin');
    // Redirect non-admin users to member dashboard
    return <Navigate to="/dashboard/member" replace />;
  }
  
  return <>{children}</>;
};