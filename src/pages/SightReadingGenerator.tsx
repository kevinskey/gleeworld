import React from 'react';
import { ParameterFormNew } from '@/components/sight-singing/ParameterFormNew';
import { ScoreDisplay } from '@/components/sight-singing/ScoreDisplay';
import { UniversalHeader } from '@/components/layout/UniversalHeader';

const SightReadingGenerator: React.FC = () => {
  const [musicXML, setMusicXML] = React.useState<string>('');
  
  const handleReset = () => {
    setMusicXML('');
  };
  
  return (
    <div className="min-h-screen bg-background">
      <UniversalHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ParameterFormNew 
            onMusicXMLGenerated={setMusicXML} 
            onReset={handleReset}
          />
          <ScoreDisplay musicXML={musicXML} />
        </div>
      </div>
    </div>
  );
};

export default SightReadingGenerator;