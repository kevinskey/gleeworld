import React from 'react';
import { SimpleAppointmentScheduler } from '@/components/appointments/SimpleAppointmentScheduler';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const Appointments = () => {
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <SimpleAppointmentScheduler />
    </UniversalLayout>
  );
};

export default Appointments;