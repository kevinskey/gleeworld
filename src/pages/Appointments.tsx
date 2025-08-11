import React from 'react';
import { PublicAppointmentBooking } from '@/components/appointments/PublicAppointmentBooking';
import { AppointmentDashboard } from '@/components/appointments/AppointmentDashboard';
import { AppointmentApprovalHandler } from '@/components/appointments/AppointmentApprovalHandler';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';

const Appointments = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  // Show public booking interface for non-logged in users or non-admin users
  if (!user || !isAdmin()) {
    return <PublicAppointmentBooking />;
  }

  // Show admin dashboard for admin users
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="container mx-auto px-4 py-6 space-y-6">
        <AppointmentApprovalHandler />
        <AppointmentDashboard />
      </div>
    </UniversalLayout>
  );
};

export default Appointments;