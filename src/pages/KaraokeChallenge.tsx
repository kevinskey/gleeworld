import React, { useState } from 'react';
import { UniversalHeader } from '@/components/layout/UniversalHeader';
import { KaraokeChallengeStudio } from '@/components/karaoke/KaraokeChallengeStudio';

const KaraokeChallenge: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <UniversalHeader />
      <KaraokeChallengeStudio />
    </div>
  );
};

export default KaraokeChallenge;
