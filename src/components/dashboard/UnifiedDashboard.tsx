import React, { useState } from 'react';
import { UniversalHeader } from '../layout/UniversalHeader';
import { MessagesPanel } from './MessagesPanel';
import { ModuleSelector } from './ModuleSelector';
import { ModuleDisplay } from './ModuleDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityHubModule } from './modules/CommunityHubModule';
import { BucketsOfLoveWidget } from '@/components/shared/BucketsOfLoveWidget';

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
      
      <div className="flex flex-col h-[calc(100vh-72px)] p-6 gap-4">
        {/* Main Section - Community Hub only */}
        <div className="flex-1 min-h-0">
          {/* Mobile */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            <div className="h-[360px] border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden">
              <CommunityHubModule />
            </div>
          </div>
          {/* Desktop */}
          <div className="hidden md:flex h-full min-h-0">
            <div className="h-full min-h-0 w-full border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden">
              <CommunityHubModule />
            </div>
          </div>
        </div>

        {/* Buckets of Love - visible to all authenticated users */}
        <div className="grid grid-cols-1">
          <BucketsOfLoveWidget />
        </div>
        
        {/* Messages Panel Overlay */}
        {showMessages && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10">
            <MessagesPanel onClose={() => setShowMessages(false)} />
          </div>
        )}
      </div>
    </div>
  );
};
