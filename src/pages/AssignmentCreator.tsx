import React from 'react';
import { AssignmentCreator } from '@/components/sight-singing/AssignmentCreator';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

const AssignmentCreatorPage: React.FC = () => {
  return (
    <UniversalLayout>
      <DashboardPageShell
        title="Assignment Creator"
        subtitle="Create sight-singing assignments from your music library and distribute them to students"
        maxWidth="4xl"
      >
        <AssignmentCreator />
      </DashboardPageShell>
    </UniversalLayout>
  );
};

export default AssignmentCreatorPage;
