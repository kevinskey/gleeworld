import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SightReadingGenerator } from '@/components/SightReadingGenerator';
import { SightReadingUploader } from '@/components/SightReadingUploader';
import { useState } from 'react';

const SightReadingSubmissionPage = () => {
  const [generatedMelody, setGeneratedMelody] = useState<any[]>([]);

  const handleStartSightReading = (melody: any[]) => {
    setGeneratedMelody(melody);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sight Reading Submission</h1>
          <p className="text-muted-foreground">
            Generate and submit sight reading exercises
          </p>
        </div>
        
        <div className="space-y-8">
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Generate Exercise</h3>
            <SightReadingGenerator onStartSightReading={handleStartSightReading} />
          </div>
          
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Upload Recording</h3>
            <SightReadingUploader externalMelody={generatedMelody} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SightReadingSubmissionPage;