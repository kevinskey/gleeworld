import React from 'react';
import { ComprehensiveAppointmentSystem } from '@/components/appointments/ComprehensiveAppointmentSystem';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const Appointments = () => {
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <ComprehensiveAppointmentSystem />
    </UniversalLayout>
  );
};

export default Appointments;