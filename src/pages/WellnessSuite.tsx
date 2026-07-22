import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VocalHealthLog } from '@/modules/wellness/vocal-health/VocalHealthLog';
import { UniformTracker } from '@/modules/logistics/uniforms/UniformTracker';
import { RehearsalFeedback } from '@/modules/rehearsals/feedback/RehearsalFeedback';
import { DashboardPageShell } from '@/components/dashboard/DashboardPageShell';
import { UniversalLayout } from '@/components/layout/UniversalLayout';

const WellnessSuite = () => {
  const [activeTab, setActiveTab] = useState('wellness');

  return (
    <UniversalLayout>
      <DashboardPageShell
        title="Wellness & Development Suite"
        subtitle="Track vocal health, manage gear, and monitor performance development"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto">
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
      </DashboardPageShell>
    </UniversalLayout>
  );
};

export default WellnessSuite;
