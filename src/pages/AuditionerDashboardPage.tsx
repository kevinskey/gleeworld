import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserById } from '@/hooks/useUserById';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AuditionerDashboard } from '@/components/member-view/dashboards/AuditionerDashboard';
import { Navigate } from 'react-router-dom';

const AuditionerDashboardPage = () => {
  const { user, loading } = useAuth();
  const { user: profile, loading: profileLoading } = useUserById(user?.id);

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Loading Auditioner Dashboard..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Preparing profile..." />
      </div>
    );
  }

  return <AuditionerDashboard user={profile} />;
};

export default AuditionerDashboardPage;
