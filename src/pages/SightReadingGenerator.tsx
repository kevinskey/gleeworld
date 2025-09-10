import React from 'react';
import { SightSingingStudio } from '@/components/sight-singing/SightSingingStudio';
import { UniversalHeader } from '@/components/layout/UniversalHeader';

const SightReadingGenerator: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <UniversalHeader />
      <SightSingingStudio />
    </div>
  );
};

export default SightReadingGenerator;