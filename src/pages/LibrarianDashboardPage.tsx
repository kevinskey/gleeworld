import React from 'react';
import { LibrarianDashboard } from '@/components/librarian/LibrarianDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useUsernamePermissions } from '@/hooks/useUsernamePermissions';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Shield } from 'lucide-react';

const LibrarianDashboardPage = () => {
  console.log('🔍 LibrarianDashboardPage rendering');
  
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, profile } = useUserRole();
  const { permissions, loading: permissionsLoading } = useUsernamePermissions(user?.email);

  if (permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking permissions..." />
      </div>
    );
  }

  // Check if user has librarian access
  const hasLibrarianAccess = isAdmin() || isSuperAdmin() || permissions.includes('music-library');

  if (!hasLibrarianAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the Librarian Dashboard.</p>
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