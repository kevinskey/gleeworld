import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationList } from './ConversationList';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MessageSquare, Users, Phone, ArrowLeft } from 'lucide-react';
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
    <div className="h-full flex flex-col lg:flex-row gap-2 md:gap-4">
      {/* Conversation List - hidden on mobile when messages shown */}
      <div className={`${isMobile && showMessages ? 'hidden' : 'block'} lg:w-1/3 lg:min-w-[280px]`}>
        <Card className="h-full">
          <CardHeader className="pb-2 md:pb-3 pt-3 md:pt-4">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <MessageSquare className="h-5 w-5 md:h-4 md:w-4" />
              Group Chats
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ConversationList
              conversations={conversations}
              selectedConversation={selectedConversation}
              onSelectConversation={handleSelectConversation}
            />
          </CardContent>
        </Card>
      </div>

      {/* Messages View - hidden on mobile when not selected */}
      <div className={`${isMobile && !showMessages ? 'hidden' : 'block'} flex-1 min-h-[400px] lg:min-h-0`}>
        {selectedConversation ? (
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-2 md:pb-3 pt-3 md:pt-4 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-3">
                  {isMobile && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleBackToList}
                      className="h-9 w-9"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                  )}
                  <div className="flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm md:text-base">{selectedConversation.name}</CardTitle>
                    <p className="text-xs md:text-sm text-muted-foreground">Group SMS</p>
                  </div>
                </div>
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <Phone className="h-3 w-3" />
                  <span className="hidden sm:inline">SMS</span>
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 p-3 md:p-4">
                {conversationMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-8 md:py-12">
                    <MessageSquare className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
                    <h3 className="text-base md:text-lg font-medium text-muted-foreground">No messages yet</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Start a conversation with {selectedConversation.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    {conversationMessages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="border-t p-3 md:p-4">
                <MessageInput onSendMessage={handleSendMessage} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center p-4">
              <MessageSquare className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
              <h3 className="text-base md:text-lg font-medium text-muted-foreground">Select a conversation</h3>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GroupMessageInterface;