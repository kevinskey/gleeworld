import React from 'react';
import { Calendar } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { AppointmentDashboard } from '@/components/appointments/AppointmentDashboard';
import { ModuleProps } from '@/types/unified-modules';

export const AppointmentSchedulingModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="appointment-scheduling"
      title="Appointment Scheduling"
      description="Monitor appointment leads and manage scheduling"
      icon={Calendar}
      iconColor="blue"
      fullPage={isFullPage}
      defaultOpen={!!isFullPage}
    >
      <AppointmentDashboard />
    </ModuleWrapper>
  );
};