import React from 'react';
import { ConcertTicketRequestForm } from '@/components/concert/ConcertTicketRequestForm';
import { PublicLayout } from '@/components/layout/PublicLayout';

const ConcertTicketRequest: React.FC = () => {
  return (
    <PublicLayout>
      <div className="container mx-auto py-8 px-4">
        <ConcertTicketRequestForm />
      </div>
    </PublicLayout>
  );
};

export default ConcertTicketRequest;
