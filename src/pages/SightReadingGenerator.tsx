import React from 'react';
import { SightSingingStudio } from '@/components/sight-singing/SightSingingStudio';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const SightReadingGenerator: React.FC = () => {
  return (
    <DashboardShell>
      <SightSingingStudio />
    </DashboardShell>
  );
};

export default SightReadingGenerator;
