import React from 'react';
import { VoiceRangeAssessment } from '@/components/assessment/VoiceRangeAssessment';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const VoiceRangeAssessmentPage: React.FC = () => {
  return (
    <UniversalLayout>
      <div className="container mx-auto py-8">
        <VoiceRangeAssessment />
      </div>
    </UniversalLayout>
  );
};

export default VoiceRangeAssessmentPage;
