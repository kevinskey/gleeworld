import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';

export const HomeRoute = () => {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile(user);
  const navigate = useNavigate();

  // Handle automatic redirection for authenticated users
  useEffect(() => {
    if (authLoading || !user) return;
    
    // Wait for profile to load before redirecting
    if (profileLoading) return;

    // Redirect authenticated users to their appropriate dashboard
    if (userProfile) {
      console.log('🔄 HomeRoute: Redirecting authenticated user from / to appropriate dashboard');
      
      // Priority-based redirection
      if (userProfile.is_super_admin || userProfile.is_admin) {
        console.log('🚀 Redirecting admin to /admin');
        navigate('/admin', { replace: true });
      } else if (userProfile.role === 'alumna') {
        console.log('🎓 Redirecting alumna to /alumnae');
        navigate('/alumnae', { replace: true });
      } else if (userProfile.role === 'fan') {
        console.log('🎵 Redirecting fan to /fan');
        navigate('/fan', { replace: true });
      } else {
        console.log('👤 Redirecting member/exec to /dashboard');
        navigate('/dashboard', { replace: true });
      }
    } else if (user && !profileLoading) {
      // User exists but no profile - redirect to dashboard for profile setup
      console.log('⚠️ User without profile, redirecting to /dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [user, userProfile, authLoading, profileLoading, navigate]);

  // Show loading while determining auth status
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading GleeWorld..." />
      </div>
    );
  }

  // For public/non-authenticated users, show the landing page
  console.log('🌐 Showing public landing page for non-authenticated user');
  return <GleeWorldLanding />;
};