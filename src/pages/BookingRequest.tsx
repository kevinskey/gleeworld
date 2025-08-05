import React from 'react';
import { BookingForm } from '@/components/booking/BookingForm';
import { PublicLayout } from '@/components/layout/PublicLayout';

const BookingRequest: React.FC = () => {
  return (
    <PublicLayout>
      <BookingForm />
    </PublicLayout>
  );
};

export default BookingRequest;