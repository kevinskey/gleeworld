import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRoleBasedRedirect } from '@/hooks/useRoleBasedRedirect';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';
import { RouteDebugger } from '@/components/debug/RouteDebugger';

export const HomeRoute = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { userProfile } = useUserProfile(user);
  const [searchParams] = useSearchParams();
  
  // Check if this is a forced public view
  const isPublicView = searchParams.get('view') === 'public';
  
  // Debug logging for auth state
  console.log('🏠 HomeRoute render:', {
    hasUser: !!user,
    userId: user?.id,
    email: user?.email,
    authLoading,
    timestamp: new Date().toISOString()
  });
  
  // Clear any session storage that might be blocking redirects
  useEffect(() => {
    sessionStorage.removeItem('force-public-view');
    sessionStorage.removeItem('redirectAfterAuth');
  }, []);
  
  // Use the role-based redirect hook to handle automatic redirection (only if not public view)
  useRoleBasedRedirect();
  
  // Force redirect for authenticated admin/executive users (only if not public view)
  useEffect(() => {
    if (!authLoading && user && userProfile && !isPublicView) {
      if (userProfile.is_super_admin || userProfile.role === 'super-admin' || 
          userProfile.is_admin || userProfile.role === 'admin' || 
          userProfile.is_exec_board) {
        console.log('🚀 HomeRoute: Force redirecting admin/executive to dashboard');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [authLoading, user, userProfile, navigate, isPublicView]);

  // Show loading while determining auth status
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading GleeWorld..." />
      </div>
    );
  }

  // For public/non-authenticated users OR forced public view, show the landing page
  console.log('🌐 Showing public landing page for user:', {
    hasUser: !!user,
    userEmail: user?.email,
    authLoading,
    isPublicView,
    shouldShowLanding: true
  });
  
  return <GleeWorldLanding />;
};