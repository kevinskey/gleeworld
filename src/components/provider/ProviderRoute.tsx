import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useServiceProviders } from '@/hooks/useServiceProviders';

interface ProviderRouteProps {
  children: React.ReactNode;
}

export const ProviderRoute: React.FC<ProviderRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const { data: providers = [], isLoading } = useServiceProviders();

  // Show loading while checking provider status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking provider access...</p>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is a service provider
  const isProvider = providers.some(provider => provider.user_id === user.id);
  
  if (!isProvider) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};