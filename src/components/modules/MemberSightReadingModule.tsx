import React from 'react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { MemberSightReadingStudio } from '@/components/member-sight-reading/MemberSightReadingStudio';
import { ModuleProps } from '@/types/unified-modules';
import { Music } from 'lucide-react';

export const MemberSightReadingModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="member-sight-reading-studio"
      title="Sight Reading Studio"
      description="Complete assignments, practice sight reading, and track your progress"
      icon={Music}
      iconColor="purple"
      fullPage={isFullPage}
    >
      <MemberSightReadingStudio user={user} />
    </ModuleWrapper>
  );
};