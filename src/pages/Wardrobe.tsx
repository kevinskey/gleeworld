import React from 'react';
import { WardrobeMistressHub } from '@/components/tour-manager/WardrobeMistressHub';
import { UniversalLayout } from "@/components/layout/UniversalLayout";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

const Wardrobe = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="container mx-auto p-6">
        <WardrobeMistressHub />
      </div>
    </DashboardShell>
    </UniversalLayout>
  );
};

export default Wardrobe;
