import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const HomeRoute = () => {
  const { user, loading: authLoading } = useAuth();
  
  console.log('🏠 HomeRoute render:', {
    hasUser: !!user,
    authLoading,
  });

  // Show loading while determining auth status
  if (authLoading) {
    console.log('🏠 HomeRoute: Still loading auth...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  console.log('🌐 Showing simple landing page');
  
  // Simple landing page for now
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
};