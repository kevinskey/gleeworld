import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ConversationListItem } from '@/components/messaging/ConversationListItem';
import { GroupHeader } from '@/components/messaging/GroupHeader';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { UserSearch } from '@/components/messaging/UserSearch';
import { MessageSquare, Plus, User, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useGroupMessages from '@/hooks/useGroupMessages';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useIsMobile } from '@/hooks/use-mobile';

interface User {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  voice_part?: string;
}

export const GroupMessageInterface: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [conversationType, setConversationType] = useState<'group' | 'direct'>('group');
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    conversations,
    messages,
    loading,
    fetchMessagesForConversation,
    sendMessage,
    markConversationAsRead
  } = useGroupMessages();

  const {
    conversations: dmConversations,
    messages: dmMessages,
    sendMessage: sendDirectMessage,
    createConversation
  } = useDirectMessages();

  const allConversations = conversationType === 'group' ? conversations : dmConversations;
  const selectedConversation = allConversations.find(c => c.id === selectedConversationId);
  const conversationMessages = selectedConversationId 
    ? (conversationType === 'group' ? messages[selectedConversationId] : dmMessages[selectedConversationId]) || []
    : [];

  useEffect(() => {
    if (allConversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(allConversations[0].id);
    }
  }, [allConversations, selectedConversationId]);

  const handleSelectConversation = (conversation: any, type: 'group' | 'direct') => {
    setConversationType(type);
    setSelectedConversationId(conversation.id);
    if (isMobile) {
      setShowMessages(true);
    }
  };

  const handleBackToList = () => {
    setShowMessages(false);
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedConversationId || !user) return;

    try {
      if (conversationType === 'group') {
        await sendMessage(selectedConversationId, message);
        toast({
          title: 'Message Sent',
          description: 'Your message has been sent to the group.',
        });
      } else {
        await sendDirectMessage(selectedConversationId, message);
        toast({
          title: 'Message Sent',
          description: 'Your direct message has been sent.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Send Failed',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleUserSelect = async (selectedUser: User) => {
    const conversationId = await createConversation(selectedUser.user_id);
    if (conversationId) {
      setConversationType('direct');
      setSelectedConversationId(conversationId);
      setNewMessageOpen(false);
      if (isMobile) {
        setShowMessages(true);
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col md:flex-row gap-0 bg-muted/30">
      {/* Conversation List - wider on desktop */}
      <div className={`${isMobile && showMessages ? 'hidden' : 'flex'} w-full md:w-[400px] lg:w-[480px] xl:w-[520px] border-r border-border flex-col bg-muted/50`}>
        <div className="h-full flex flex-col">
          {/* List Header with New Message Button */}
          <div className="bg-[hsl(var(--message-header))] text-white px-3 sm:px-4 py-2.5 sm:py-3 shadow-md flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Messages
              </h2>
              <Dialog open={newMessageOpen} onOpenChange={setNewMessageOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 h-8 px-2">
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>New Direct Message</DialogTitle>
                  </DialogHeader>
                  <div className="mt-4">
                    <UserSearch 
                      onSelectUser={handleUserSelect}
                      onClose={() => setNewMessageOpen(false)}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          
          {/* Conversations */}
          <ScrollArea className="flex-1 bg-background">
            <div className="min-w-0">
              {/* Group Conversations */}
              {conversations.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase">Groups</div>
                  {conversations.map((conversation) => (
                    <ConversationListItem
                      key={conversation.id}
                      name={conversation.name}
                      lastMessage={messages[conversation.id]?.[0]?.message_body}
                      timestamp={messages[conversation.id]?.[0]?.created_at}
                      unreadCount={conversation.unread_count}
                      isSelected={selectedConversationId === conversation.id && conversationType === 'group'}
                      onClick={() => handleSelectConversation(conversation, 'group')}
                    />
                  ))}
                </div>
              )}
              
              {/* Direct Messages */}
              {dmConversations.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-1 text-xs font-semibold text-muted-foreground uppercase">Direct Messages</div>
                  {dmConversations.map((conversation) => (
                    <ConversationListItem
                      key={conversation.id}
                      name={conversation.other_user_name}
                      lastMessage={dmMessages[conversation.id]?.[0]?.content}
                      timestamp={dmMessages[conversation.id]?.[0]?.created_at}
                      unreadCount={conversation.unread_count}
                      isSelected={selectedConversationId === conversation.id && conversationType === 'direct'}
                      onClick={() => handleSelectConversation(conversation, 'direct')}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>


      {/* Messages View - responsive and flexible */}
      <div className={`${isMobile && !showMessages ? 'hidden' : 'flex'} flex-1 min-w-0 flex-col bg-background`}>
        {selectedConversation ? (
          <div className="h-full flex flex-col">
            {/* Group Header */}
            <div className="flex-shrink-0">
              <GroupHeader
                groupName={conversationType === 'group' ? (selectedConversation as any).name : (selectedConversation as any).other_user_name}
                onBack={handleBackToList}
                showBackButton={isMobile}
              />
            </div>

            {/* Messages Area - scrollable */}
            <ScrollArea className="flex-1 px-2 sm:px-4 bg-muted/20">
              {conversationMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8 sm:py-12 px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[hsl(var(--message-header))]/10 flex items-center justify-center mb-3 sm:mb-4">
                    <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-[hsl(var(--message-header))]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No messages yet</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">
                    {conversationType === 'group' 
                      ? `Click below to start messaging ${(selectedConversation as any).name}`
                      : `Click below to start messaging ${(selectedConversation as any).other_user_name}`
                    }
                  </p>
                </div>
              ) : (
                <div className="py-4">
                  {conversationMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input - fixed at bottom */}
            <div className="border-t border-border p-2 sm:p-4 bg-background flex-shrink-0">
              <MessageInput onSendMessage={handleSendMessage} />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center bg-background p-4">
            <div className="text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[hsl(var(--message-header))]/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-[hsl(var(--message-header))]" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-foreground">Select a conversation</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Choose a group to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupMessageInterface;