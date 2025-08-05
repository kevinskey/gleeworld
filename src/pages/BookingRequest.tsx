import React from 'react';
import { BookingForm } from '@/components/booking/BookingForm';
import { UniversalHeader } from '@/components/layout/UniversalHeader';

const BookingRequest: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <UniversalHeader />
      <main className="flex-1">
        <BookingForm />
      </main>
    </div>
  );
};

export default BookingRequest;