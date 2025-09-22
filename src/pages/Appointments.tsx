import React from 'react';
import { ComprehensiveAppointmentSystem } from '@/components/appointments/ComprehensiveAppointmentSystem';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { AppointmentAccessControl } from '@/components/appointments/AppointmentAccessControl';

const Appointments = () => {
  return (
    <AppointmentAccessControl>
      <UniversalLayout showHeader={true} showFooter={false}>
        <ComprehensiveAppointmentSystem />
      </UniversalLayout>
    </AppointmentAccessControl>
  );
};

export default Appointments;