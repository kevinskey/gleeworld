
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
    if (!loading && !profileLoading && user && profile) {
      console.log('🚀 Auth redirect logic - User authenticated');
      console.log('Profile data:', profile);
      console.log('isAdmin() result:', isAdmin());
      console.log('Profile role:', profile.role);
      console.log('Profile is_admin:', profile.is_admin);
      console.log('Profile is_super_admin:', profile.is_super_admin);
      
      const redirectPath = sessionStorage.getItem('redirectAfterAuth');
      if (redirectPath) {
        console.log('Auth: Redirecting to stored path:', redirectPath);
        sessionStorage.removeItem('redirectAfterAuth');
        navigate(redirectPath, { replace: true });
      } else {
        // Only redirect to default dashboard if user directly navigated to /auth
        // Check if the current path is exactly /auth and not a refresh of another page
        const currentPath = window.location.pathname;
        const referrer = document.referrer;
        
        // If user is on /auth page specifically (not a refresh of another page)
        if (currentPath === '/auth') {
          const isUserAdmin = isAdmin();
          const defaultPath = isUserAdmin ? '/admin' : '/dashboard';
          console.log('Auth: User on /auth directly, isUserAdmin:', isUserAdmin, 'redirecting to:', defaultPath);
          navigate(defaultPath, { replace: true });
        }
        // If they're on any other route and got redirected here due to auth check,
        // let them stay on their intended route after authentication
      }
    } else {
      console.log('Auth redirect conditions not met:', {
        loading,
        profileLoading,
        hasUser: !!user,
        hasProfile: !!profile
      });
    }
  }, [user, loading, profile, profileLoading, navigate, isAdmin]);

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
