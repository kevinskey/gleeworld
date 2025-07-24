import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VocalHealthLog } from '@/modules/wellness/vocal-health/VocalHealthLog';
import { UniformTracker } from '@/modules/logistics/uniforms/UniformTracker';
import { RehearsalFeedback } from '@/modules/rehearsals/feedback/RehearsalFeedback';

const WellnessSuite = () => {
  const [activeTab, setActiveTab] = useState('wellness');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wellness & Development Suite</h1>
          <p className="text-muted-foreground">
            Track vocal health, manage gear, and monitor performance development
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="wellness">Vocal Health</TabsTrigger>
          <TabsTrigger value="gear">Uniform & Gear</TabsTrigger>
          <TabsTrigger value="feedback">Rehearsal Feedback</TabsTrigger>
        </TabsList>
        
        <TabsContent value="wellness" className="mt-6">
          <VocalHealthLog />
        </TabsContent>
        
        <TabsContent value="gear" className="mt-6">
          <UniformTracker />
        </TabsContent>
        
        <TabsContent value="feedback" className="mt-6">
          <RehearsalFeedback />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WellnessSuite;