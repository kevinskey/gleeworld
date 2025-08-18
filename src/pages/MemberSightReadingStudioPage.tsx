import React from 'react';
import { MemberSightReadingStudio } from '@/components/member-sight-reading/MemberSightReadingStudio';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export const MemberSightReadingStudioPage: React.FC = () => {
  const { user } = useAuth();
  const { userProfile } = useUserProfile(user);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <MemberSightReadingStudio 
        user={{
          id: user?.id || '',
          email: user?.email || '',
          full_name: userProfile?.full_name || '',
          role: userProfile?.role || ''
        }} 
      />
    </div>
  );
};