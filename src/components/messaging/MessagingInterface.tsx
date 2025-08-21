import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { MessageGroupsList } from './MessageGroupsList';
import { ChatWindow } from './ChatWindow';
import { GroupMembersList } from './GroupMembersList';
import { useMessageGroups } from '@/hooks/useMessaging';
import { MessageSquare, Users } from 'lucide-react';

export const MessagingInterface: React.FC = () => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  
  console.log('MessagingInterface: Component MOUNTED and RENDERING');
  
  const { data: groups, isLoading, error } = useMessageGroups();

  console.log('MessagingInterface: Hook returned:', { 
    groups: groups?.length || 0, 
    isLoading, 
    error: error?.message || 'none',
    groupsData: groups 
  });

  const selectedGroup = groups?.find(g => g.id === selectedGroupId);

  if (error) {
    console.error('MessagingInterface: Error loading groups:', error);
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-2">Error loading messages</div>
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

  return (
    <div className="h-screen flex bg-background">
      {/* Groups Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Messages</h1>
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
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold">
                    {selectedGroup.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">{selectedGroup.name}</h2>
                    {selectedGroup.description && (
                      <p className="text-sm text-muted-foreground">{selectedGroup.description}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowMembers(!showMembers)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-sm">Members</span>
                </button>
              </div>
            </div>

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
              <p className="text-muted-foreground max-w-md">
                Select a group from the sidebar to start chatting with your fellow Glee Club members!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};