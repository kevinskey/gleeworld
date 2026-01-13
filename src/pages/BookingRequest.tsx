import React from 'react';
import { BookingFormWizard } from '@/components/booking/BookingFormWizard';
import { PublicLayout } from '@/components/layout/PublicLayout';

const BookingRequest: React.FC = () => {
  return (
    <PublicLayout>
      <BookingFormWizard />
    </PublicLayout>
  );
};

export default BookingRequest;