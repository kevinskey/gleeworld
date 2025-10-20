import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCourseTA } from "@/hooks/useCourseTA";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface Mus240StaffRouteProps {
  children: ReactNode;
}

// Grants access to MUS240 Instructor Console for Admins and active MUS240 TAs
export const Mus240StaffRoute = ({ children }: Mus240StaffRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { isTA, loading: taLoading } = useCourseTA('MUS240');

  if (authLoading || roleLoading || taLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Allow Admins (incl. Super Admin) OR active TAs for MUS240
  if (!isAdmin() && !isTA) {
    return <Navigate to="/dashboard/member" replace />;
  }

  return <>{children}</>;
};
