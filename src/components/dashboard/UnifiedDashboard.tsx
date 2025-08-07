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
  const [selectedModule, setSelectedModule] = useState<string>('email');
  const [showMessages, setShowMessages] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <Header 
        activeTab={selectedModule}
        onTabChange={setSelectedModule}
        onToggleMessages={() => setShowMessages(!showMessages)}
        showMessages={showMessages}
      />
      
      <div className="flex h-[calc(100vh-72px)]">
        {/* Left Sidebar - Module Selector */}
        <div className="w-80 border-r border-border bg-background/50 backdrop-blur-sm">
          <ModuleSelector 
            selectedModule={selectedModule}
            onSelectModule={setSelectedModule}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 relative">
          <div className="flex flex-col h-full">
            {/* Top Two-Column Layout - Always Visible */}
            <div className="grid grid-cols-2 gap-4 p-4 border-b border-border bg-background/50">
              {/* Community Hub Column */}
              <div className="h-80 border border-border rounded-lg bg-background/50">
                <CommunityHubModule />
              </div>
              
              {/* Email Column */}
              <div className="h-80 border border-border rounded-lg bg-background/50">
                <EmailModule />
              </div>
            </div>
            
            {/* Selected Module Display Below - only if not email or community-hub */}
            {selectedModule !== 'email' && selectedModule !== 'community-hub' && (
              <div className="flex-1 p-4">
                <div className="h-full bg-background/50 border border-border rounded-lg">
                  <ModuleDisplay selectedModule={selectedModule} />
                </div>
              </div>
            )}
          </div>
          
          {/* Messages Panel Overlay */}
          {showMessages && (
            <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-10">
              <MessagesPanel onClose={() => setShowMessages(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};