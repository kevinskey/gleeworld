import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VocalHealthLog } from '@/modules/wellness/vocal-health/VocalHealthLog';
import { UniformTracker } from '@/modules/logistics/uniforms/UniformTracker';
import { RehearsalFeedback } from '@/modules/rehearsals/feedback/RehearsalFeedback';

const WellnessSuite = () => {
  const [activeTab, setActiveTab] = useState('wellness');

  return (
    <div className="bg-background text-foreground min-h-screen" style={{ padding: 'var(--space-6)' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div style={{ maxWidth: '80ch' }}>
            <h1 className="text-display font-display text-foreground">Wellness & Development Suite</h1>
            <p className="text-muted-foreground" style={{ fontSize: 'clamp(1rem, 0.9vw, 1.0625rem)', lineHeight: '1.6' }}>
              Track vocal health, manage gear, and monitor performance development
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted border-border" style={{ borderRadius: 'var(--radius-sm)' }}>
            <TabsTrigger value="wellness" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Vocal Health</TabsTrigger>
            <TabsTrigger value="gear" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Uniform & Gear</TabsTrigger>
            <TabsTrigger value="feedback" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Rehearsal Feedback</TabsTrigger>
          </TabsList>
          
          <TabsContent value="wellness" style={{ marginTop: 'var(--space-6)' }}>
            <VocalHealthLog />
          </TabsContent>
          
          <TabsContent value="gear" style={{ marginTop: 'var(--space-6)' }}>
            <UniformTracker />
          </TabsContent>
          
          <TabsContent value="feedback" style={{ marginTop: 'var(--space-6)' }}>
            <RehearsalFeedback />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default WellnessSuite;