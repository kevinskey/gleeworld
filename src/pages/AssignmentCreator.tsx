import React from 'react';
import { AssignmentCreator } from '@/components/sight-singing/AssignmentCreator';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';

const AssignmentCreatorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <UniversalHeader />
      <DashboardPageShell
        title="Assignment Creator"
        subtitle="Create sight-singing assignments from your music library and distribute them to students"
        maxWidth="4xl"
      >
        <AssignmentCreator />
      </DashboardPageShell>
    </div>
  );
};

export default AssignmentCreatorPage;