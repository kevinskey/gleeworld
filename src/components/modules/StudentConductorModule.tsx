import React from 'react';
import { Music } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { StudentConductorDashboard } from '@/components/musical-leadership/StudentConductorDashboard';
import { ModuleProps } from '@/types/modules';

export const StudentConductorModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="student-conductor"
      title="Student Conductor"
      description="Manage section leaders, sight singing, sheet music annotations, and sectional coordination"
      icon={Music}
      iconColor="purple"
      fullPage={isFullPage}
    >
      <StudentConductorDashboard user={user} />
    </ModuleWrapper>
  );
};