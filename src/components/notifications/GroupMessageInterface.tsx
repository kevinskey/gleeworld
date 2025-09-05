import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationList } from './ConversationList';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { MessageSquare, Users, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import useGroupMessages from '@/hooks/useGroupMessages';

export const GroupMessageInterface: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
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
    <div className="h-full flex flex-col lg:flex-row gap-4">
      <div className="lg:w-1/3 lg:min-w-[280px]">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
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

      <div className="flex-1 min-h-[400px] lg:min-h-0">
        {selectedConversation ? (
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{selectedConversation.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">Group SMS</p>
                  </div>
                </div>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  SMS
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 p-4">
                {conversationMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">No messages yet</h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      Start a conversation with {selectedConversation.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversationMessages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="border-t p-4">
                <MessageInput onSendMessage={handleSendMessage} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="h-full flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">Select a conversation</h3>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GroupMessageInterface;