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

  // Show public booking interface for non-logged in users
  if (!user) {
    return <PublicAppointmentBooking />;
  }

  // Show full dashboard for logged-in users (with admin features for admins)
  return (
    <UniversalLayout showHeader={true} showFooter={false}>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {isAdmin() && <AppointmentApprovalHandler />}
        <AppointmentDashboard />
      </div>
    </UniversalLayout>
  );
};

export default Appointments;