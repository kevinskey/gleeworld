import React from 'react';
import { Route } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { TourManagerDashboard } from '@/components/tour-manager/TourManagerDashboard';
import { ModuleProps } from '@/types/unified-modules';

export const TourManagerModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="tour-management"
      title="Tour Manager"
      description="Comprehensive tour planning, logistics, and management system"
      icon={Route}
      iconColor="blue"
      fullPage={isFullPage}
    >
      <TourManagerDashboard user={user} />
    </ModuleWrapper>
  );
};