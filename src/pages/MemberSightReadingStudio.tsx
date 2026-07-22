import React from 'react';
import { MemberSightReadingStudio } from '@/components/member-sight-reading/MemberSightReadingStudio';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useAuth } from '@/contexts/AuthContext';

const MemberSightReadingStudioPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <MemberSightReadingStudio
        user={user ? {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
          role: user.user_metadata?.role,
        } : undefined}
      />
    </DashboardShell>
    </UniversalLayout>
  );
};

export default MemberSightReadingStudioPage;
