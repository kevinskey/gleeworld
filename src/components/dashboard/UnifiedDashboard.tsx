import React, { useState } from 'react';
import { UniversalHeader } from '../layout/UniversalHeader';
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 pt-4">
      <UniversalHeader />
      
      <div className="flex flex-col h-[calc(100vh-72px)] p-6 gap-6">
        {/* Top Two-Column Layout - Community Hub & Email */}
        <div className="grid grid-cols-2 gap-6">
          {/* Community Hub Column */}
          <div className="h-[500px] border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm">
            <CommunityHubModule />
          </div>
          
          {/* Email Column */}
          <div className="h-[500px] border border-border rounded-xl bg-background/50 backdrop-blur-sm shadow-sm">
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