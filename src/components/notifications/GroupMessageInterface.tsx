import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationListItem } from '@/components/messaging/ConversationListItem';
import { GroupHeader } from '@/components/messaging/GroupHeader';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useGroupMessages from '@/hooks/useGroupMessages';
import { useIsMobile } from '@/hooks/use-mobile';

export const GroupMessageInterface: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    conversations,
    messages,
    loading,
    fetchMessagesForConversation,
    sendMessage,
    markConversationAsRead
  } = useGroupMessages();

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const conversationMessages = selectedConversationId ? messages[selectedConversationId] || [] : [];

  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const handleSelectConversation = (conversation: any) => {
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
      await sendMessage(selectedConversationId, message);
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent to the group.',
      });
    } catch (error: any) {
      toast({
        title: 'Send Failed',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="h-full flex flex-col md:flex-row gap-0 bg-background">
      {/* Conversation List - responsive width */}
      <div className={`${isMobile && showMessages ? 'hidden' : 'flex'} w-full md:w-80 lg:w-96 xl:w-[420px] border-r border-border flex-col bg-background`}>
        <div className="h-full flex flex-col">
          {/* List Header */}
          <div className="bg-[hsl(var(--message-header))] text-white px-3 sm:px-4 py-3 sm:py-4 shadow-md flex-shrink-0">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
              Messages
            </h2>
          </div>
          
          {/* Conversations */}
          <ScrollArea className="flex-1">
            <div className="min-w-0">
              {conversations.map((conversation) => (
                <ConversationListItem
                  key={conversation.id}
                  name={conversation.name}
                  lastMessage={conversationMessages[0]?.message_body}
                  timestamp={conversationMessages[0]?.created_at}
                  unreadCount={conversation.unread_count}
                  isSelected={selectedConversationId === conversation.id}
                  onClick={() => handleSelectConversation(conversation)}
                />
              ))}
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
                groupName={selectedConversation.name}
                onBack={handleBackToList}
                showBackButton={isMobile}
              />
            </div>

            {/* Messages Area - scrollable */}
            <ScrollArea className="flex-1 px-2 sm:px-4 bg-background">
              {conversationMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-8 sm:py-12 px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[hsl(var(--message-header))]/10 flex items-center justify-center mb-3 sm:mb-4">
                    <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-[hsl(var(--message-header))]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-foreground mb-2">No messages yet</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground max-w-xs">
                    Start a conversation with {selectedConversation.name}
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