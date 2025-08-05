import React from 'react';
import { ReceiptsModule } from '@/components/receipts/ReceiptsModule';

export const ReceiptsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <ReceiptsModule />
      </div>
    </div>
  );
};