import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { ModularAdminDashboard } from '@/components/admin-view/ModularAdminDashboard';

export const FreshAdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <UniversalHeader 
        viewMode="admin" 
        onViewModeChange={() => {}}
      />
      
      <div className="container mx-auto px-6 py-6">
        <ModularAdminDashboard user={user} />
      </div>
    </div>
  );
};