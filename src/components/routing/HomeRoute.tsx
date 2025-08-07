import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { GleeWorldLanding } from '@/pages/GleeWorldLanding';
import { ModuleSelector } from '@/components/dashboard/ModuleSelector';
import { useState } from 'react';

export const HomeRoute = () => {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile(user);
  const [selectedModule, setSelectedModule] = useState<string>('email');

  // Show loading while auth is being determined
  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading GleeWorld..." />
      </div>
    );
  }

  // For authenticated users, show landing page with modules at bottom
  if (user) {
    return (
      <div className="min-h-screen">
        <GleeWorldLanding />
        
        {/* Modules Section at Bottom */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-foreground mb-2">Quick Access Modules</h2>
              <p className="text-muted-foreground">Access your dashboard tools and resources</p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <ModuleSelector 
                selectedModule={selectedModule}
                onSelectModule={setSelectedModule}
              />
            </div>
          </div>
        </section>
      </div>
    );
  }

  // If not authenticated, redirect to auth page
  return <Navigate to="/auth" replace />;
};