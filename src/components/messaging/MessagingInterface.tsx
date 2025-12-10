import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageGroupsList } from './MessageGroupsList';
import { ChatWindow } from './ChatWindow';
import { GroupMembersList } from './GroupMembersList';
import { CreateGroupDialog, EditGroupDialog, DeleteGroupDialog, ManageMembersDialog } from './GroupManagement';
import { UserSelector } from './UserSelector';
import { useMessageGroups } from '@/hooks/useMessaging';
import { MessageSquare, Users, Plus, Settings, UserPlus } from 'lucide-react';
import { GroupHeader } from '@/components/messaging/GroupHeader';

interface MessagingInterfaceProps {
  embedded?: boolean;
}

export const MessagingInterface: React.FC<MessagingInterfaceProps> = ({ embedded = false }) => {
  
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showDirectMessages, setShowDirectMessages] = useState(false);
  
  console.log('MessagingInterface: State initialized, calling useMessageGroups...');
  
  const { data: groups, isLoading, error } = useMessageGroups();

  const selectedGroup = groups?.find(group => group.id === selectedGroupId);

  console.log('MessagingInterface: Hook executed successfully:', { 
    groups: groups?.length || 0, 
    isLoading, 
    error: error?.message || 'none',
    groupsData: groups 
  });

  if (error) {
    console.error('MessagingInterface: Error loading groups:', error);
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive mb-2">Error loading messages</div>
          <div className="text-sm text-muted-foreground">{error.message}</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    console.log('MessagingInterface: Showing loading state');
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  console.log('MessagingInterface: Rendering main interface...');

  return (
    <div className={`${embedded ? 'h-full' : 'h-screen'} flex bg-background`}>
      {/* Groups Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Messages</h1>
            </div>
            <div className="flex gap-2">
              <CreateGroupDialog onSuccess={() => setSelectedGroupId(null)} />
              <Dialog open={showDirectMessages} onOpenChange={(open) => {
                console.log('DM Dialog onOpenChange:', open);
                setShowDirectMessages(open);
              }}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => console.log('DM button clicked')}
                  >
                    <UserPlus className="h-4 w-4" />
                    DM
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
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
          </div>
        </div>
        <MessageGroupsList
          groups={groups || []}
          selectedGroupId={selectedGroupId}
          onSelectGroup={setSelectedGroupId}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedGroup ? (
          <>
            {/* Group Header with Polls menu */}
            <GroupHeader
              groupId={selectedGroupId as string}
              groupName={selectedGroup.name}
              groupAvatar={(selectedGroup as any).avatar_url}
            />

            <div className="flex-1 flex">
              {/* Chat Messages */}
              <div className="flex-1">
                <ChatWindow groupId={selectedGroupId} />
              </div>

              {/* Members Sidebar (collapsible) */}
              {showMembers && (
                <div className="w-80 border-l border-border">
                  <GroupMembersList groupId={selectedGroupId} />
                </div>
              )}
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Welcome to Glee Messages</h2>
              <p className="text-muted-foreground max-w-md mb-4">
                {groups?.length === 0 
                  ? "No message groups yet. Create a group to start chatting!"
                  : "Select a group from the sidebar to view and send messages!"
                }
              </p>
              {groups?.length === 0 && (
                <CreateGroupDialog onSuccess={() => window.location.reload()} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};