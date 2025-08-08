import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNavigate } from 'react-router-dom';
import { useRoleBasedRedirect } from '@/hooks/useRoleBasedRedirect';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';

export const HomeRoute = () => {
  const { user, loading: authLoading } = useAuth();
  
  // Use the role-based redirect hook to handle automatic redirection
  useRoleBasedRedirect();

  // Show loading while determining auth status
  if (authLoading) {
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