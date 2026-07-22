import React from 'react';
import { ReceiptsModule } from '@/components/receipts/ReceiptsModule';
import { UniversalLayout } from "@/components/layout/UniversalLayout";

export const ReceiptsPage = () => {
  return (
    <UniversalLayout>
      <div className="bg-background">
        <div className="container mx-auto px-4 py-8">
          <ReceiptsModule />
        </div>
      </div>
    </UniversalLayout>
  );
};
