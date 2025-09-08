import { ReactNode, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useMus240Enrollment } from "@/hooks/useMus240Enrollment";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface Mus240EnrollmentRouteProps {
  children: ReactNode;
}

export const Mus240EnrollmentRoute = ({ children }: Mus240EnrollmentRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isSuperAdmin, loading: roleLoading, profile } = useUserRole();
  const { isEnrolled, loading: enrollmentLoading } = useMus240Enrollment();
  
  // Memoize the admin access calculations to prevent unnecessary re-computations
  const adminAccess = useMemo(() => isAdmin(), [isAdmin]);
  const superAdminAccess = useMemo(() => isSuperAdmin(), [isSuperAdmin]);
  const enrolled = useMemo(() => isEnrolled(), [isEnrolled]);
  
  // Only log when state actually changes to reduce console spam
  const currentState = useMemo(() => ({
    hasUser: !!user,
    userEmail: user?.email,
    authLoading,
    roleLoading,
    enrollmentLoading,
    isEnrolled: enrolled
  }), [user, authLoading, roleLoading, enrollmentLoading, enrolled]);
  
  if (authLoading || roleLoading || enrollmentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking course access..." />
      </div>
    );
  }
  
  if (!user) {
    // Store the current path for redirect after auth and use dedicated MUS 240 auth page
    sessionStorage.setItem('redirectAfterAuth', window.location.pathname);
    return <Navigate to="/auth/mus240" replace />;
  }
  
  // Allow admins and super admins access regardless of enrollment
  if (adminAccess || superAdminAccess) {
    return <>{children}</>;
  }
  
  // Check if user is enrolled in MUS 240
  if (!enrolled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Restricted</h1>
          <p className="text-gray-600 mb-6">
            You must be enrolled in MUS 240: Survey of African American Music to access this course content.
          </p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact your instructor.
          </p>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};