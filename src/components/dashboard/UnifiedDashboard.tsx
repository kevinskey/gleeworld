import React, { useState } from 'react';
import { Header } from '../Header';
import { MessagesPanel } from './MessagesPanel';
import { ModuleSelector } from './ModuleSelector';
import { ModuleDisplay } from './ModuleDisplay';
import { useAuth } from '@/contexts/AuthContext';
import { CommunityHubModule } from './modules/CommunityHubModule';
import { EmailModule } from './modules/EmailModule';

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <Header 
        activeTab={selectedModule}
        onTabChange={setSelectedModule}
        onToggleMessages={() => setShowMessages(!showMessages)}
        showMessages={showMessages}
      />
      
      <div className="flex h-[calc(100vh-72px)]">
        {/* Left Column - Modules */}
        <div className="w-80 border-r border-border bg-background/50 backdrop-blur-sm">
          <ModuleSelector 
            selectedModule={selectedModule}
            onSelectModule={setSelectedModule}
          />
        </div>

        {/* Center Column - Community Hub */}
        <div className="flex-1 border-r border-border bg-background/50 backdrop-blur-sm p-4">
          <div className="h-full border border-border rounded-lg bg-background/50">
            <CommunityHubModule />
          </div>
        </div>

        {/* Right Column - Email */}
        <div className="w-80 bg-background/50 backdrop-blur-sm p-4">
          <div className="h-full border border-border rounded-lg bg-background/50">
            <EmailModule />
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