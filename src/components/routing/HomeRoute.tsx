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
  
  // Temporarily disable auto-redirect to view landing page
  // useRoleBasedRedirect();

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
  
  console.log('🚀 HomeRoute: About to render simple fallback page');
  
  // Temporarily use a simple fallback instead of GleeWorldLanding
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-700">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center text-white">
          <h1 className="text-5xl font-bold mb-6">Welcome to GleeWorld</h1>
          <p className="text-xl mb-8 opacity-90">
            The official digital platform of the Spelman College Glee Club
          </p>
          <p className="text-lg mb-8 opacity-80">
            Celebrating 100+ years of musical excellence
          </p>
          <div className="space-y-4">
            <a 
              href="/auth"
              className="inline-block bg-white text-blue-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors"
            >
              Sign In
            </a>
            <div className="text-sm opacity-70">
              New here? Sign up to get started
            </div>
          </div>
          {user && (
            <div className="mt-8 p-4 bg-white/10 rounded-lg">
              <p className="text-sm">Logged in as: {user.email}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};