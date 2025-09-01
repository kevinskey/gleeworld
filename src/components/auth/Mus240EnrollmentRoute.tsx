import { ReactNode } from "react";
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
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const { isEnrolled, loading: enrollmentLoading } = useMus240Enrollment();
  
  if (authLoading || roleLoading || enrollmentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking course access..." />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Allow admins and super admins access regardless of enrollment
  if (isAdmin || isSuperAdmin) {
    return <>{children}</>;
  }
  
  // Check if user is enrolled in MUS 240
  if (!isEnrolled) {
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