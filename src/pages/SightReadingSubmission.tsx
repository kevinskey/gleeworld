import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SightReadingGenerator } from '@/components/SightReadingGenerator';
import { SightReadingUploader } from '@/components/SightReadingUploader';
import { UniversalLayout } from '@/components/layout/UniversalLayout';
import { useNavigate } from 'react-router-dom';

const SightReadingSubmission = () => {
  const [generatedMelody, setGeneratedMelody] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("generate");
  const navigate = useNavigate();

  const handleStartSightReading = (melody: any[]) => {
    setGeneratedMelody(melody);
    setActiveTab("upload");
  };

  return (
    <UniversalLayout>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bebas tracking-wide">
              Sight Reading Practice
            </h1>
            <p className="text-muted-foreground">
              Generate exercises or upload your own audio recordings for analysis and feedback.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate Exercise</TabsTrigger>
            <TabsTrigger value="upload">Upload Recording</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-6">
            <SightReadingGenerator onStartSightReading={handleStartSightReading} />
          </TabsContent>
          
          <TabsContent value="upload" className="space-y-6">
            <SightReadingUploader externalMelody={generatedMelody} />
          </TabsContent>
        </Tabs>
      </div>
    </UniversalLayout>
  );
};

export default SightReadingSubmission;