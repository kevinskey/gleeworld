import React from 'react';
import { FileText } from 'lucide-react';
import { ModuleWrapper } from '@/components/shared/ModuleWrapper';
import { BookingRequestManager } from '@/components/booking/BookingRequestManager';
import { ModuleProps } from '@/types/modules';

export const BookingFormsModule = ({ user, isFullPage = false }: ModuleProps) => {
  return (
    <ModuleWrapper
      id="booking-forms"
      title="Booking Forms"
      description="Manage performance requests and booking inquiries from external organizations"
      icon={FileText}
      iconColor="cyan"
      fullPage={isFullPage}
    >
      <BookingRequestManager user={user} />
    </ModuleWrapper>
  );
};