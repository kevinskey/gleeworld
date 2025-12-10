import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MessageGroupsList } from './MessageGroupsList';
import { ChatWindow } from './ChatWindow';
import { GroupMembersList } from './GroupMembersList';
import { CreateGroupDialog, EditGroupDialog, DeleteGroupDialog, ManageMembersDialog } from './GroupManagement';
import { UserSelector } from './UserSelector';
import { useMessageGroups } from '@/hooks/useMessaging';
import { MessageSquare, Users, Plus, Settings, UserPlus, ArrowLeft } from 'lucide-react';
import { GroupHeader } from '@/components/messaging/GroupHeader';

interface MessagingInterfaceProps {
  embedded?: boolean;
}

export const MessagingInterface: React.FC<MessagingInterfaceProps> = ({ embedded = false }) => {
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showDirectMessages, setShowDirectMessages] = useState(false);
  
  const { data: groups, isLoading, error } = useMessageGroups();

  const selectedGroup = groups?.find(group => group.id === selectedGroupId);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
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
  // When a group is selected on mobile, show only the chat
  const showGroupsList = !selectedGroupId;

  return (
    <div className={`${embedded ? 'h-full' : 'h-screen'} flex flex-col bg-background overflow-hidden`}>
      {/* Mobile/Embedded: Show groups list when no group selected */}
      {showGroupsList ? (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-bold">Messages</h1>
              </div>
              <div className="flex gap-2">
                <CreateGroupDialog onSuccess={() => setSelectedGroupId(null)} />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1 text-xs"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setShowDirectMessages(true);
                  }}
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">DM</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Groups List */}
          <div className="flex-1 overflow-auto">
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
          <GroupHeader
            groupId={selectedGroupId as string}
            groupName={selectedGroup?.name || ''}
            groupAvatar={(selectedGroup as any)?.avatar_url}
            showBackButton
            onBack={() => setSelectedGroupId(null)}
          />

          {/* Chat Messages */}
          <div className="flex-1 overflow-hidden">
            <ChatWindow groupId={selectedGroupId} />
          </div>
        </div>
      )}

      {/* DM Dialog */}
      <Dialog open={showDirectMessages} onOpenChange={setShowDirectMessages}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[80vh] flex flex-col z-[9999]">
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
