import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageGroupsList } from './MessageGroupsList';
import { ChatWindow } from './ChatWindow';
import { CreateGroupDialog } from './GroupManagement';
import { UserSelector } from './UserSelector';
import { useMessageGroups } from '@/hooks/useMessaging';
import { MessageSquare, UserPlus } from 'lucide-react';
import { EnhancedTooltip } from '@/components/ui/enhanced-tooltip';
import { GroupHeader } from '@/components/messaging/GroupHeader';

interface MessagingInterfaceProps {
  embedded?: boolean;
}

export const MessagingInterface: React.FC<MessagingInterfaceProps> = ({ embedded = false }) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showDirectMessages, setShowDirectMessages] = useState(false);
  
  const { data: groups, isLoading, error } = useMessageGroups();

  const selectedGroup = groups?.find(group => group.id === selectedGroupId);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-destructive mb-2">Error loading messages</div>
          <div className="text-sm text-muted-foreground">{error.message}</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Mobile: Show either groups list OR chat, not both
  const showGroupsList = !selectedGroupId;

  return (
    <div 
      className={`flex flex-col bg-background overflow-hidden ${
        embedded 
          ? 'h-full' 
          : 'h-[100dvh] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
      }`}
    >
      {/* Groups List View */}
      {showGroupsList ? (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 bg-[hsl(var(--message-header))] text-white px-4 py-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-6 w-6" />
                <h1 className="text-lg font-bold">Messages</h1>
              </div>
              <div className="flex gap-2">
                <CreateGroupDialog onSuccess={() => setSelectedGroupId(null)} />
                <EnhancedTooltip content="Send direct message">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1.5 text-white hover:bg-white/20"
                    onClick={() => setShowDirectMessages(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">DM</span>
                  </Button>
                </EnhancedTooltip>
              </div>
            </div>
          </div>
          
          {/* Groups List - scrollable */}
          <div className="flex-1 overflow-y-auto">
            <MessageGroupsList
              groups={groups || []}
              selectedGroupId={selectedGroupId}
              onSelectGroup={setSelectedGroupId}
            />
          </div>
        </div>
      ) : (
        /* Chat View when group is selected */
        <div className="flex flex-col h-full">
          {/* Group Header with back button */}
          <div className="flex-shrink-0">
            <GroupHeader
              groupId={selectedGroupId as string}
              groupName={selectedGroup?.name || ''}
              groupAvatar={(selectedGroup as any)?.avatar_url}
              showBackButton
              onBack={() => setSelectedGroupId(null)}
            />
          </div>

          {/* Chat Messages - flex-1 to fill remaining space */}
          <div className="flex-1 overflow-hidden">
            <ChatWindow groupId={selectedGroupId} />
          </div>
        </div>
      )}

      {/* DM Dialog */}
      <Dialog open={showDirectMessages} onOpenChange={setShowDirectMessages}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] flex flex-col z-[9999]">
          <DialogHeader>
            <DialogTitle>Send Direct Message</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <UserSelector 
              onSelectUser={(groupId) => {
                setSelectedGroupId(groupId);
                setShowDirectMessages(false);
              }}
              showDirectMessage={true}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
