import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SightReadingGenerator } from '@/components/SightReadingGenerator';
import { useState } from 'react';

const SightReadingGeneratorPage = () => {
  const [generatedMelody, setGeneratedMelody] = useState<any[]>([]);

  const handleStartSightReading = (melody: any[]) => {
    setGeneratedMelody(melody);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sight Reading Generator</h1>
          <p className="text-muted-foreground">
            Generate custom sight reading exercises
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-lg p-6">
          <SightReadingGenerator onStartSightReading={handleStartSightReading} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SightReadingGeneratorPage;