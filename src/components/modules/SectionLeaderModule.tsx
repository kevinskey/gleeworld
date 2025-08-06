import React from 'react';
import { Users } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { SectionLeaderDashboard } from '@/components/musical-leadership/SectionLeaderDashboard';
import { ModuleProps } from '@/types/unified-modules';

export const SectionLeaderModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="section-leader"
      title="Section Leader"
      description="Manage section rosters, plan sectionals, communicate with members, and create setlists"
      icon={Users}
      iconColor="green"
      fullPage={isFullPage}
    >
      <SectionLeaderDashboard user={user} />
    </ModuleWrapper>
  );
};