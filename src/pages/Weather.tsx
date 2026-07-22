import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { TourWeatherSection } from '@/components/tour-manager/TourWeatherSection';

const Weather: React.FC = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="container mx-auto py-8 px-4">
        <TourWeatherSection />
      </div>
    </DashboardShell>
    </UniversalLayout>
  );
};

export default Weather;
