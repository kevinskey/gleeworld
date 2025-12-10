
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

  console.log('🔄 Auth component render:', {
    hasUser: !!user,
    loading,
    profileLoading,
    pathname: window.location.pathname
  });

  useEffect(() => {
    console.log('🔄 Auth redirect check:', {
      hasUser: !!user,
      loading,
      profileLoading,
      userEmail: user?.email,
      pathname: window.location.pathname
    });

    if (!loading && !profileLoading && user) {
      console.log('🚀 Auth redirect logic - User authenticated, redirecting...');
      
      // Check for URL parameter first, then sessionStorage
      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = urlParams.get('returnTo');
      
      if (returnTo) {
        console.log('Auth: Redirecting to URL parameter:', returnTo);
        // Store in sessionStorage for consistency and redirect
        sessionStorage.setItem('redirectAfterAuth', returnTo);
        navigate(returnTo, { replace: true });
        return;
      }
      
      // Clear any stored redirect path
      const redirectPath = sessionStorage.getItem('redirectAfterAuth');
      if (redirectPath) {
        console.log('Auth: Redirecting to stored path:', redirectPath);
        sessionStorage.removeItem('redirectAfterAuth');
        navigate(redirectPath, { replace: true });
        return;
      }
      
      // Default redirect to Glee Academy
      const defaultPath = '/glee-academy';
      console.log('Auth: Redirecting to Glee Academy:', defaultPath);
      navigate(defaultPath, { replace: true });
    }
  }, [user, loading, profileLoading, navigate, isAdmin]);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #0056a6 0%, #0073c9 40%, #55bbee 100%)' }}>
        <LoadingSpinner size="lg" text="Loading..." className="text-white" />
      </div>
    );
  }

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
