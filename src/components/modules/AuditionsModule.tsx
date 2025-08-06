import React from 'react';
import { ScanLine } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { AuditionsManagement } from '@/components/admin/AuditionsManagement';
import { ModuleProps } from '@/types/unified-modules';

export const AuditionsModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="auditions-management"
      title="Auditions Management"
      description="Manage audition sessions, applications, and evaluations"
      icon={ScanLine}
      iconColor="purple"
      fullPage={isFullPage}
    >
      <AuditionsManagement />
    </ModuleWrapper>
  );
};