import React, { useState } from 'react';
import { MessagesPanel } from './MessagesPanel';
import { ModuleSelector } from './ModuleSelector';
import { ModuleDisplay } from './ModuleDisplay';
import { ModularDashboard } from './ModularDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityHubModule } from './modules/CommunityHubModule';
import DashboardHeroCarousel from '@/components/hero/DashboardHeroCarousel';
import DashboardFeaturesCarousel from '@/components/hero/DashboardFeaturesCarousel';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
export const UnifiedDashboard = () => {
  const { user } = useAuth();
  const [selectedModule, setSelectedModule] = useState<string>('music-studio');
  const [showMessages, setShowMessages] = useState(false);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);

  // Debug logging
  console.log('🎯 UnifiedDashboard rendering:', {
    user: !!user,
    userEmail: user?.email,
    selectedModule,
    timestamp: new Date().toISOString()
  });

  const handleExpandChange = (id: string | null) => {
    setActiveModuleId(id);
    if (id) {
      const el = document.getElementById('modules-section');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">

      {/* Row 1: Hero + Features side-by-side */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          {/* Left: Hero */}
          <DashboardHeroCarousel />
          <div className="self-center w-full"><DashboardFeaturesCarousel /></div>
        </div>
      </div>

      {/* Row 2: Community Hub full width (collapsible when a module is active) */}
      <div className="px-6 pb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" /> Community Hub
          </div>
          <button
            type="button"
            aria-controls="community-hub"
            aria-expanded={!activeModuleId}
            onClick={() => setActiveModuleId((prev) => (prev ? null : 'collapsed-toggle'))}
            className="inline-flex items-center gap-1 text-sm px-2 py-1 rounded-md border border-border hover:bg-muted/50"
          >
            {activeModuleId ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            {activeModuleId ? 'Expand' : 'Collapse'}
          </button>
        </div>
        <div
          id="community-hub"
          className="border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden transition-[max-height,opacity] duration-300"
          style={{ maxHeight: activeModuleId ? 0 : '45vh', opacity: activeModuleId ? 0 : 1 }}
        >
          <CommunityHubModule />
        </div>
      </div>

      {/* Row 3: Modules */}
      <div className="px-6 pb-12">
        <section id="modules-section" aria-labelledby="modules-heading" className="space-y-4 scroll-mt-[var(--app-header-offset)]">
          <header>
            <h2 id="modules-heading" className="text-2xl font-semibold tracking-tight">Modules</h2>
            <p className="text-muted-foreground">Quick access based on your permissions</p>
          </header>
          <div className="border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-visible">
            <ModularDashboard hideHeader onExpandChange={handleExpandChange} />
          </div>
        </section>
      </div>

        {/* Messages Panel Overlay */}
        {showMessages && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10">
            <MessagesPanel onClose={() => setShowMessages(false)} />
          </div>
        )}

        
      </div>
  );
};
