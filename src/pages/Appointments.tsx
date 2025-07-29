import React from 'react';
import { AppointmentDashboard } from '@/components/appointments/AppointmentDashboard';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const Appointments = () => {
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="container mx-auto px-4 py-6">
        <AppointmentDashboard />
      </div>
    </UniversalLayout>
  );
};

export default Appointments;