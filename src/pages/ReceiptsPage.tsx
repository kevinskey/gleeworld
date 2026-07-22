import React from 'react';
import { ReceiptsModule } from '@/components/receipts/ReceiptsModule';
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const ReceiptsPage = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="bg-background">
        <div className="container mx-auto px-4 py-8">
          <ReceiptsModule />
        </div>
      </div>
    </DashboardShell>
    </UniversalLayout>
  );
};
