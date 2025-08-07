import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';

export const HomeRoute = () => {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile(user);

  // Show loading while auth is being determined
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading GleeWorld..." />
      </div>
    );
  }

  // If not authenticated, redirect to auth page
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If authenticated but no profile, redirect to profile setup
  if (!userProfile) {
    return <Navigate to="/profile/setup" replace />;
  }

  // Redirect authenticated users to their appropriate dashboard
  return <Navigate to="/dashboard" replace />;
};