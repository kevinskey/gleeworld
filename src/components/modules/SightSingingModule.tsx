import React from 'react';
import { Eye } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { SightSingingManager } from '@/components/musical-leadership/SightSingingManager';
import { ModuleProps } from '@/types/unified-modules';

export const SightSingingModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="sight-singing-management"
      title="Sight Singing Management"
      description="Manage sight singing exercises and track progress"
      icon={Eye}
      iconColor="blue"
      fullPage={isFullPage}
    >
      <SightSingingManager user={user} />
    </ModuleWrapper>
  );
};