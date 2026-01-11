
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
  const theme = searchParams.get('theme') as 'default' | 'mus240' || 'default';

  useEffect(() => {
    // Only redirect if user is logged in and auth is done loading
    if (!loading && user) {
      // Wait for profile if user exists, but don't block if profile loading takes too long
      if (!profileLoading || profile) {
        // Check for URL parameter first, then sessionStorage
        const urlParams = new URLSearchParams(window.location.search);
        const returnTo = urlParams.get('returnTo');
        
        if (returnTo) {
          sessionStorage.setItem('redirectAfterAuth', returnTo);
          navigate(returnTo, { replace: true });
          return;
        }
        
        const redirectPath = sessionStorage.getItem('redirectAfterAuth');
        if (redirectPath) {
          sessionStorage.removeItem('redirectAfterAuth');
          navigate(redirectPath, { replace: true });
          return;
        }
        
        navigate('/glee-academy', { replace: true });
      }
    }
  }, [user, loading, profileLoading, profile, navigate]);

  // Show loading only during initial auth check
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0056a6 0%, #0073c9 40%, #55bbee 100%)' }}>
        <LoadingSpinner size="lg" text="Loading..." className="text-white" />
      </div>
    );
  }

  // If user is logged in, show redirecting state
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0056a6 0%, #0073c9 40%, #55bbee 100%)' }}>
        <LoadingSpinner size="lg" text="Redirecting..." className="text-white" />
      </div>
    );
  }

  // No user - show auth form immediately (don't wait for profile loading)

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0056a6 0%, #0073c9 40%, #55bbee 100%)' }}>
        <LoadingSpinner size="lg" text="Redirecting..." className="text-white" />
      </div>
    );
  }

  const getTitle = () => {
    if (isReset) return "Reset Password";
    return theme === 'mus240' 
      ? "MUS 240: Survey of African American Music" 
      : "Welcome Back to Glee World!";
  };

  const getSubtitle = () => {
    if (isReset) return "Enter your new password";
    return theme === 'mus240'
      ? "Sign in to access course materials and assignments"
      : "Sign in to your account or create a new one";
  };

  return (
    <AuthLayout 
      title={getTitle()}
      subtitle={getSubtitle()}
      theme={theme}
    >
      <AuthTabs />
    </AuthLayout>
  );
};

export default Auth;
