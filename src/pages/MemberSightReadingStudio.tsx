import React from 'react';
import { MemberSightReadingStudio } from '@/components/member-sight-reading/MemberSightReadingStudio';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { useAuth } from '@/contexts/AuthContext';

const MemberSightReadingStudioPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <UniversalHeader />
      <MemberSightReadingStudio 
        user={user ? {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
          role: user.user_metadata?.role,
        } : undefined} 
      />
    </div>
  );
};

export default MemberSightReadingStudioPage;