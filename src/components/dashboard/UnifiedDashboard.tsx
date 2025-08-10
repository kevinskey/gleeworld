import React, { useState } from 'react';
import { UniversalHeader } from '../layout/UniversalHeader';
import { UniversalFooter } from '../layout/UniversalFooter';
import { MessagesPanel } from './MessagesPanel';
import { ModuleSelector } from './ModuleSelector';
import { ModuleDisplay } from './ModuleDisplay';
import { ModularDashboard } from './ModularDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityHubModule } from './modules/CommunityHubModule';
import DashboardHeroCarousel from '@/components/hero/DashboardHeroCarousel';
import DashboardFeaturesCarousel from '@/components/hero/DashboardFeaturesCarousel';
export const UnifiedDashboard = () => {
  const { user } = useAuth();
  const [selectedModule, setSelectedModule] = useState<string>('music-studio');
  const [showMessages, setShowMessages] = useState(false);

  // Debug logging
  console.log('🎯 UnifiedDashboard rendering:', {
    user: !!user,
    userEmail: user?.email,
    selectedModule,
    timestamp: new Date().toISOString()
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 pt-4">
      <UniversalHeader />

      {/* Row 1: Hero + Features side-by-side */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Left: Hero */}
          <DashboardHeroCarousel />
          <div className="self-center w-full"><DashboardFeaturesCarousel /></div>
        </div>
      </div>

      {/* Row 2: Community Hub full width */}
      <div className="px-6 pb-6">
        <div className="border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm md:max-h-[50vh] lg:max-h-[45vh] overflow-y-auto">
          <CommunityHubModule />
        </div>
      </div>

      {/* Row 3: Modules */}
      <div className="px-6 pb-12">
        <section aria-labelledby="modules-heading" className="space-y-4">
          <header>
            <h2 id="modules-heading" className="text-2xl font-semibold tracking-tight">Modules</h2>
            <p className="text-muted-foreground">Quick access based on your permissions</p>
          </header>
          <div className="border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm">
            <ModularDashboard hideHeader />
          </div>
        </section>
      </div>

        {/* Messages Panel Overlay */}
        {showMessages && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10">
            <MessagesPanel onClose={() => setShowMessages(false)} />
          </div>
        )}

        <UniversalFooter />
      </div>
  );
};
