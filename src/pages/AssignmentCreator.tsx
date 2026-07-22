import React from 'react';
import { AssignmentCreator } from '@/components/sight-singing/AssignmentCreator';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

const AssignmentCreatorPage: React.FC = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <DashboardPageShell
        title="Assignment Creator"
        subtitle="Create sight-singing assignments from your music library and distribute them to students"
        maxWidth="4xl"
      >
        <AssignmentCreator />
      </DashboardPageShell>
    </DashboardShell>
    </UniversalLayout>
  );
};

export default AssignmentCreatorPage;
