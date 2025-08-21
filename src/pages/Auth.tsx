
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthTabs } from "@/components/auth/AuthTabs";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

const Auth = () => {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isReset = searchParams.get('reset') === 'true';

  console.log('🔄 Auth component render:', {
    hasUser: !!user,
    loading,
    profileLoading,
    pathname: window.location.pathname
  });

  useEffect(() => {
    if (!loading && !profileLoading && user) {
      console.log('🚀 Auth redirect logic - User authenticated');
      
      // Single redirect path - avoid loops
      const redirectPath = sessionStorage.getItem('redirectAfterAuth');
      if (redirectPath) {
        console.log('Auth: Redirecting to stored path:', redirectPath);
        sessionStorage.removeItem('redirectAfterAuth');
        navigate(redirectPath, { replace: true });
      } else {
        // Simple redirect based on admin status
        const defaultPath = isAdmin() ? '/admin' : '/dashboard';
        console.log('Auth: Redirecting to default path:', defaultPath);
        navigate(defaultPath, { replace: true });
      }
    }
  }, [user, loading, profileLoading, navigate, isAdmin]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Redirecting..." />
      </div>
    );
  }

  return (
    <AuthLayout 
      title={isReset ? "Reset Password" : "Welcome Back to Glee World!"}
      subtitle={isReset ? "Enter your new password" : "Sign in to your account or create a new one"}
    >
      <AuthTabs />
    </AuthLayout>
  );
};

export default Auth;
