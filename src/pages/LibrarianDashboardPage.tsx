import React from 'react';
import { LibrarianDashboard } from '@/components/librarian/LibrarianDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useUsernamePermissions } from '@/hooks/useUsernamePermissions';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Shield } from 'lucide-react';

const LibrarianDashboardPage = () => {
  console.log('🔍 LibrarianDashboardPage rendering');
  
  const { user } = useAuth();
  const { permissions, loading } = useUsernamePermissions(user?.email);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking permissions..." />
      </div>
    );
  }
  
  const hasLibrarianAccess = permissions.includes('music-library');
  
  if (!hasLibrarianAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access the Librarian Dashboard. Please contact an administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }
  
  try {
    return <LibrarianDashboard />;
  } catch (error) {
    console.error('🚨 LibrarianDashboardPage error:', error);
    return (
      <div className="p-4">
        <h1>Error loading Librarian Dashboard</h1>
        <p>Please check the console for details.</p>
      </div>
    );
  }
};

export default LibrarianDashboardPage;