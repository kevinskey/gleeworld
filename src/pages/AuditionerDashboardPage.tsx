import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserById } from '@/hooks/useUserById';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { AuditionerDashboard } from '@/components/member-view/dashboards/AuditionerDashboard';
import { PublicLayout } from '@/components/layout/PublicLayout';

const AuditionerDashboardPage = () => {
  const { user, loading } = useAuth();
  const { user: profile, loading: profileLoading } = useUserById(user?.id);

  useEffect(() => {
    document.title = 'GleeWorld Auditions | Spelman College Glee Club';
  }, []);

  if (loading || (user && profileLoading)) {
    return (
      <PublicLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <LoadingSpinner text="Loading Auditioner Dashboard..." />
        </div>
      </PublicLayout>
    );
  }

  // If not logged in, render a public-friendly dashboard with a guest auditioner context
  const guestAuditioner = {
    id: 'guest',
    email: '',
    full_name: 'Prospective Student',
    role: 'auditioner',
    created_at: new Date().toISOString(),
  } as any;

  return (
    <PublicLayout>
      <AuditionerDashboard user={(profile as any) || guestAuditioner} />
    </PublicLayout>
  );
};

export default AuditionerDashboardPage;
