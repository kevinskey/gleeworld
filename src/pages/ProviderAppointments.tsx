import React from 'react';
import { ProviderAppointmentHub } from '@/components/appointments/ProviderAppointmentHub';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const ProviderAppointments = () => {
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <ProviderAppointmentHub />
    </UniversalLayout>
  );
};

export default ProviderAppointments;