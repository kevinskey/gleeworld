import React, { useRef, useEffect, useState } from 'react';
import { useGroupMessages, useRealtimeMessaging, useSendMessage, useTypingIndicator, useGroupMembers } from '@/hooks/useMessaging';
import { useSendSMSNotification } from '@/hooks/useSMSIntegration';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';

interface ChatWindowProps {
  groupId: string | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ groupId }) => {
  const { user } = useAuth();
  const { data: messages, isLoading, error } = useGroupMessages(groupId || undefined);
  const { data: members } = useGroupMembers(groupId || undefined);
  const { typingUsers } = useRealtimeMessaging(groupId || undefined);
  const sendMessage = useSendMessage();
  const { mutateAsync: sendSMSNotification } = useSendSMSNotification();
  const { startTyping, stopTyping } = useTypingIndicator(groupId || undefined);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (error) {
      console.error('Error loading messages:', error);
    }
  }, [error]);

  const handleSendMessage = async (content: string, file?: File, sendViaSMS?: boolean) => {
    if (!groupId) return;

    try {
      let fileUrl, fileName, fileSize;
      
      if (file) {
        // Upload file logic would go here
        // For now, we'll just handle text messages
        return;
      }

      // Send the message to the app database
      await sendMessage.mutateAsync({
        groupId,
        content,
        replyToId: replyingTo || undefined
      });

      // If SMS is enabled, also send via SMS to group members
      if (sendViaSMS && members && user) {
        const phoneNumbers = members
          .filter(m => m.user_id !== user.id && m.user_profile?.phone_number)
          .map(m => m.user_profile!.phone_number!)
          .filter(Boolean);

        if (phoneNumbers.length > 0) {
          await sendSMSNotification({
            groupId,
            message: content,
            senderName: user.email || 'Someone',
            phoneNumbers
          });
        }
      }

      setReplyingTo(null);
      stopTyping();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleTyping = () => {
    startTyping();
  };

  const handleStopTyping = () => {
    stopTyping();
  };

  if (!groupId) {
    return null;
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-destructive mb-2">Error loading messages</div>
          <div className="text-sm text-muted-foreground">Please try selecting the group again</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const replyingToMessage = messages?.find(msg => msg.id === replyingTo);

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      {/* Group Header */}
      <div className="border-b border-border p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-medium text-sm">
                {messages?.[0]?.user_profile?.full_name?.charAt(0) || 'G'}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Group Chat</h3>
              <p className="text-sm text-muted-foreground">
                {typingUsers.length > 0 
                  ? `${typingUsers.map(u => u.user_name || 'Someone').join(', ')} typing...`
                  : `${messages?.length || 0} messages`
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4 py-2">
        <div className="space-y-1">
          {messages && messages.length > 0 ? (
            messages.map((message, index) => {
              const prevMessage = index > 0 ? messages[index - 1] : null;
              const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
              
              const isFirstInGroup = !prevMessage || 
                prevMessage.user_id !== message.user_id ||
                new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000; // 5 minutes
              
              const isLastInGroup = !nextMessage || 
                nextMessage.user_id !== message.user_id ||
                new Date(nextMessage.created_at).getTime() - new Date(message.created_at).getTime() > 300000;

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isFirstInGroup={isFirstInGroup}
                  isLastInGroup={isLastInGroup}
                  onReply={() => setReplyingTo(message.id)}
                />
              );
            })
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <span className="text-2xl">💬</span>
              </div>
              <div className="text-lg mb-2 font-medium">No messages yet</div>
              <div className="text-sm">Start the conversation!</div>
            </div>
          )}
          
          {typingUsers.length > 0 && (
            <TypingIndicator users={typingUsers} />
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Preview */}
      {replyingToMessage && (
        <div className="mx-4 mb-2 p-3 bg-muted/30 border-l-4 border-primary rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm mb-1">
                <span className="text-muted-foreground">Replying to</span>
                <span className="font-medium text-primary">
                  {replyingToMessage.user_profile?.full_name || 'Unknown User'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {replyingToMessage.content}
              </p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="ml-2 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 bg-background border-t border-border">
        <MessageInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          onStopTyping={handleStopTyping}
          disabled={sendMessage.isPending}
          placeholder={replyingToMessage ? 'Reply to message...' : 'Type a message...'}
        />
      </div>
    </div>
  );
};