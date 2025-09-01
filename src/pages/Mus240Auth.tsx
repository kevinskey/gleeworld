import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useMus240Enrollment } from "@/hooks/useMus240Enrollment";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

const Mus240Auth = () => {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading, isAdmin, isSuperAdmin } = useUserRole();
  const { isEnrolled, loading: enrollmentLoading } = useMus240Enrollment();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReset = searchParams.get('reset') === 'true';

  console.log('🔄 MUS 240 Auth component render:', {
    hasUser: !!user,
    loading,
    profileLoading,
    enrollmentLoading,
    pathname: window.location.pathname
  });

  useEffect(() => {
    if (!loading && !profileLoading && !enrollmentLoading && user) {
      console.log('🚀 MUS 240 Auth redirect logic - User authenticated');
      
      // Check if user has access to MUS 240
      if (isAdmin || isSuperAdmin || isEnrolled) {
        const redirectPath = sessionStorage.getItem('redirectAfterAuth');
        if (redirectPath) {
          console.log('MUS 240 Auth: Redirecting to stored path:', redirectPath);
          sessionStorage.removeItem('redirectAfterAuth');
          navigate(redirectPath, { replace: true });
        } else {
          console.log('MUS 240 Auth: Redirecting to course dashboard');
          navigate('/classes/mus240', { replace: true });
        }
      } else {
        // User is authenticated but not enrolled - redirect to main dashboard
        console.log('MUS 240 Auth: User not enrolled, redirecting to main dashboard');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, loading, profileLoading, enrollmentLoading, navigate, isAdmin, isSuperAdmin, isEnrolled]);

  if (loading || profileLoading || enrollmentLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading course access..." />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Redirecting to course..." />
      </div>
    );
  }

  const getTitle = () => {
    if (isReset) return "Reset Password";
    return "MUS 240: Survey of African American Music";
  };

  const getSubtitle = () => {
    if (isReset) return "Enter your new password";
    return "Sign in to access course materials and assignments";
  };

  return (
    <AuthLayout 
      title={getTitle()}
      subtitle={getSubtitle()}
      theme="mus240"
    >
      <AuthTabs />
    </AuthLayout>
  );
};

export default Mus240Auth;