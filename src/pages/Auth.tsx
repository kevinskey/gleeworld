
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

  useEffect(() => {
    if (!loading && !profileLoading && user) {
      console.log('🚀 Auth redirect logic - User authenticated');
      console.log('User data:', user);
      console.log('Profile data:', profile);
      
      const redirectPath = sessionStorage.getItem('redirectAfterAuth');
      if (redirectPath) {
        console.log('Auth: Redirecting to stored path:', redirectPath);
        sessionStorage.removeItem('redirectAfterAuth');
        navigate(redirectPath, { replace: true });
      } else {
        // Always redirect to dashboard for authenticated users
        console.log('Auth: Redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      }
    } else {
      console.log('Auth redirect conditions not met:', {
        loading,
        profileLoading,
        hasUser: !!user,
        hasProfile: !!profile
      });
    }
  }, [user, loading, profile, profileLoading, navigate]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  if (user) {
    return null; // Will redirect via useEffect
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
