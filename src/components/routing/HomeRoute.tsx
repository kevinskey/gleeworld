import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useNavigate } from 'react-router-dom';
import { useRoleBasedRedirect } from '@/hooks/useRoleBasedRedirect';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';

export const HomeRoute = () => {
  const { user, loading: authLoading } = useAuth();
  
  // Debug logging for auth state
  console.log('🏠 HomeRoute render:', {
    hasUser: !!user,
    userId: user?.id,
    email: user?.email,
    authLoading,
    timestamp: new Date().toISOString()
  });
  
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
  console.log('🌐 Showing public landing page for user:', {
    hasUser: !!user,
    userEmail: user?.email,
    authLoading,
    shouldShowLanding: true
  });
  
  try {
    return <GleeWorldLanding />;
  } catch (error) {
    console.error('❌ Error rendering GleeWorldLanding:', error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-6">Welcome to GleeWorld</h1>
            <p className="text-lg text-muted-foreground mb-8">
              The official digital platform of the Spelman College Glee Club
            </p>
            <div className="space-y-4">
              <a 
                href="/auth"
                className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Sign In
              </a>
              <div className="text-sm text-muted-foreground">
                New here? Sign up to get started
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
};