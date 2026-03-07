import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { TourWeatherSection } from '@/components/tour-manager/TourWeatherSection';

const Weather: React.FC = () => {
  return (
    <UniversalLayout>
      <div className="container mx-auto py-8 px-4">
        <TourWeatherSection />
      </div>
    </UniversalLayout>
  );
};

export default Weather;
