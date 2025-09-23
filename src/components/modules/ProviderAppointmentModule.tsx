import React from 'react';
import { Calendar } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { ProviderAppointmentDashboard } from '@/components/appointments/ProviderAppointmentDashboard';
import { ModuleProps } from '@/types/unified-modules';

export const ProviderAppointmentModule = ({ user, isFullPage = false }: ModuleProps) => {
  if (isFullPage) {
    return <ProviderAppointmentDashboard />;
  }

  return (
    <ModuleWrapper
      id="provider-appointments"
      title="My Appointments"
      description="Manage your appointment calendar and sync with personal calendar systems"
      icon={Calendar}
      iconColor="green"
      fullPage={isFullPage}
      defaultOpen={!!isFullPage}
    >
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-4">
          View and manage your appointments, sync with external calendars, and track your schedule.
        </p>
        <ProviderAppointmentDashboard />
      </div>
    </ModuleWrapper>
  );
};