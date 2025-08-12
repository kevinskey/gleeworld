import React from 'react';
import { Megaphone } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { PRCoordinatorHub } from '@/components/pr-coordinator/PRCoordinatorHub';
import { ModuleProps } from '@/types/unified-modules';

export const PRHubModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="pr-hub"
      title="PR Hub"
      description="Public relations, media, and press tools"
      icon={Megaphone}
      iconColor="orange"
      fullPage={isFullPage}
      defaultOpen={!!isFullPage}
    >
      <PRCoordinatorHub />
    </ModuleWrapper>
  );
};
