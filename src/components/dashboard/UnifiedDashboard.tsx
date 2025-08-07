import React, { useState } from 'react';
import { DashboardHeader } from './DashboardHeader';
import { MessagesPanel } from './MessagesPanel';
import { ModuleSelector } from './ModuleSelector';
import { ModuleDisplay } from './ModuleDisplay';
import { useAuth } from '@/contexts/AuthContext';

export const UnifiedDashboard = () => {
  const { user } = useAuth();
  const [selectedModule, setSelectedModule] = useState<string>('email');
  const [showMessages, setShowMessages] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30">
      <DashboardHeader 
        user={user}
        onToggleMessages={() => setShowMessages(!showMessages)}
        showMessages={showMessages}
      />
      
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Module Selector */}
        <div className="w-80 border-r border-border bg-background/50 backdrop-blur-sm">
          <ModuleSelector 
            selectedModule={selectedModule}
            onSelectModule={setSelectedModule}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 relative">
          <ModuleDisplay selectedModule={selectedModule} />
          
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