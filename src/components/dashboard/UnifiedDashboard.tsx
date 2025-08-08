import React, { useState } from 'react';
import { UniversalHeader } from '../layout/UniversalHeader';
import { MessagesPanel } from './MessagesPanel';
import { ModuleSelector } from './ModuleSelector';
import { ModuleDisplay } from './ModuleDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityHubModule } from './modules/CommunityHubModule';
import { EmailModule } from './modules/EmailModule';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
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
        {/* Top Two-Column Layout - Community Hub & Email */}
          <div className="flex-1 min-h-0">
            {/* Mobile stack */}
            <div className="md:hidden grid grid-cols-1 gap-3">
              <div className="h-[360px] border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden">
                <CommunityHubModule />
              </div>
              <div className="h-[360px] border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden">
                <EmailModule />
              </div>
            </div>
            {/* Desktop resizable split */}
            <div className="hidden md:flex h-full min-h-0">
              <PanelGroup direction="horizontal" className="w-full h-full">
                <Panel defaultSize={40} minSize={25} maxSize={75} className="min-h-0">
                  <div className="h-full min-h-0 border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden">
                    <CommunityHubModule />
                  </div>
                </Panel>
                <PanelResizeHandle className="mx-2" />
                <Panel defaultSize={60} minSize={25} maxSize={75} className="min-h-0">
                  <div className="h-full min-h-0 border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm overflow-hidden">
                    <EmailModule />
                  </div>
                </Panel>
              </PanelGroup>
            </div>
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