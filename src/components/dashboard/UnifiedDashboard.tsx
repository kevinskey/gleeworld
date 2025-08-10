import React, { useState } from 'react';
import { UniversalHeader } from '../layout/UniversalHeader';
import { MessagesPanel } from './MessagesPanel';
import { ModuleSelector } from './ModuleSelector';
import { ModuleDisplay } from './ModuleDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityHubModule } from './modules/CommunityHubModule';
import DashboardHeroCarousel from '@/components/hero/DashboardHeroCarousel';
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

      {/* Row 1: Hero full width */}
      <div className="px-6 py-4">
        <DashboardHeroCarousel />
      </div>

      {/* Row 2: Community Hub full width */}
      <div className="px-6 pb-6">
        <div className="border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden">
          <CommunityHubModule />
        </div>
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
