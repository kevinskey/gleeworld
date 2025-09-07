import React from 'react';
import { Calendar } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { ComprehensiveAppointmentSystem } from '@/components/appointments/ComprehensiveAppointmentSystem';
import { ModuleProps } from '@/types/unified-modules';

export const AppointmentSchedulingModule = ({ user, isFullPage = false }: ModuleProps) => {
  if (isFullPage) {
    return <ComprehensiveAppointmentSystem />;
  }

  return (
    <ModuleWrapper
      id="appointment-scheduling"
      title="Appointment Scheduling"
      description="Complete appointment management system"
      icon={Calendar}
      iconColor="blue"
      fullPage={isFullPage}
      defaultOpen={!!isFullPage}
    >
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-4">
          Access the full appointment system for calendar view, management, and analytics.
        </p>
        <ComprehensiveAppointmentSystem />
      </div>
    </ModuleWrapper>
  );
};