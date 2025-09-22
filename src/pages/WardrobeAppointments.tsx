import React from 'react';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { WardrobeAppointmentSystem } from '@/components/wardrobe/WardrobeAppointmentSystem';

const WardrobeAppointments = () => {
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <WardrobeAppointmentSystem />
    </UniversalLayout>
  );
};

export default WardrobeAppointments;