import React from 'react';
import { MemberSightReadingStudio } from '@/components/member-sight-reading/MemberSightReadingStudio';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { useAuth } from '@/contexts/AuthContext';

const MemberSightReadingStudioPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <UniversalLayout>
      <MemberSightReadingStudio
        user={user ? {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
          role: user.user_metadata?.role,
        } : undefined}
      />
    </UniversalLayout>
  );
};

export default MemberSightReadingStudioPage;
