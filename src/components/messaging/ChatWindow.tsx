import React, { useRef, useEffect, useState } from 'react';
import { useGroupMessages, useRealtimeMessaging, useSendMessage, useTypingIndicator } from '@/hooks/useMessaging';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatWindowProps {
  groupId: string | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ groupId }) => {
  const { data: messages, isLoading } = useGroupMessages(groupId || undefined);
  const { typingUsers } = useRealtimeMessaging(groupId || undefined);
  const sendMessage = useSendMessage();
  const { startTyping, stopTyping } = useTypingIndicator(groupId || undefined);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string, file?: File) => {
    if (!groupId) return;

    try {
      let fileUrl, fileName, fileSize;
      
      if (file) {
        // Upload file logic would go here
        // For now, we'll just handle text messages
        return;
      }

      await sendMessage.mutateAsync({
        groupId,
        content,
        replyToId: replyingTo || undefined
      });

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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const replyingToMessage = messages?.find(msg => msg.id === replyingTo);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages?.map((message, index) => {
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const isFirstInGroup = !prevMessage || 
              prevMessage.user_id !== message.user_id ||
              new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() > 300000; // 5 minutes

            return (
              <MessageBubble
                key={message.id}
                message={message}
                isFirstInGroup={isFirstInGroup}
                onReply={() => setReplyingTo(message.id)}
              />
            );
          })}
          
          {typingUsers.length > 0 && (
            <TypingIndicator users={typingUsers} />
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Reply Preview */}
      {replyingToMessage && (
        <div className="px-4 py-2 bg-muted/50 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Replying to</span>
              <span className="font-medium">
                {replyingToMessage.user_profile?.full_name || 'Unknown User'}
              </span>
              <span className="text-muted-foreground truncate max-w-xs">
                {replyingToMessage.content}
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-border">
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