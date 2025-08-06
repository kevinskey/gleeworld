import React from 'react';
import { VoiceRangeAssessment } from '@/components/assessment/VoiceRangeAssessment';

const VoiceRangeAssessmentPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto py-8">
        <VoiceRangeAssessment />
      </div>
    </div>
  );
};

export default VoiceRangeAssessmentPage;