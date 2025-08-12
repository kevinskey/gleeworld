import React, { useState } from 'react';
import { Route } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { TourManagerDashboard } from '@/components/tour-manager/TourManagerDashboard';
import { Header } from '@/components/Header';
import { ModuleProps } from '@/types/unified-modules';

export const TourManagerModule = ({ user, isFullPage = false }: ModuleProps) => {
  const [activeTab, setActiveTab] = useState('tour-manager');

  if (isFullPage) {
    return (
      <div className="min-h-screen">
        <Header 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
        />
        <div className="pt-4">
          <TourManagerDashboard user={user} />
        </div>
      </div>
    );
  }

  return (
    <ModuleWrapper
      id="tour-management"
      title="Tour Manager"
      description="Comprehensive tour planning, logistics, and management system"
      icon={Route}
      iconColor="blue"
      fullPage={isFullPage}
      defaultOpen={!!isFullPage}
    >
      <TourManagerDashboard user={user} />
    </ModuleWrapper>
  );
};