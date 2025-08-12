import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { FreshAdminDashboard } from '@/components/admin/FreshAdminDashboard';

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { userProfile, loading: profileLoading } = useUserProfile(user);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading Admin Panel..." />
      </div>
    );
  }

  const isAdmin = !!(userProfile?.role === 'admin' || userProfile?.role === 'super-admin' || userProfile?.is_admin || userProfile?.is_super_admin);
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <FreshAdminDashboard />;
};

export default AdminDashboard;