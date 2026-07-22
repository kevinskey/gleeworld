import React from 'react';
import { VoiceRangeAssessment } from '@/components/assessment/VoiceRangeAssessment';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const VoiceRangeAssessmentPage: React.FC = () => {
  return (
    <UniversalLayout showHeader={false} showFooter={false}>
      <DashboardShell>
      <div className="container mx-auto py-8">
        <VoiceRangeAssessment />
      </div>
    </DashboardShell>
    </UniversalLayout>
  );
};

export default VoiceRangeAssessmentPage;
