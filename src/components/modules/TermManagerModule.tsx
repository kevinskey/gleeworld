import React from 'react';
import { BookOpen } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { TermManager } from '@/components/term-manager/TermManager';
import { ModuleProps } from '@/types/modules';

export const TermManagerModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="term-management"
      title="Term Management"
      description="Manage academic terms, schedules, and term-based planning"
      icon={BookOpen}
      iconColor="indigo"
      fullPage={isFullPage}
    >
      <TermManager />
    </ModuleWrapper>
  );
};