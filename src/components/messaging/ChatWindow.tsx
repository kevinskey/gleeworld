import React, { useRef, useEffect, useState } from 'react';
import { useGroupMessages, useRealtimeMessaging, useSendMessage, useTypingIndicator, useGroupMembers } from '@/hooks/useMessaging';
import { useSendSMSNotification } from '@/hooks/useSMSIntegration';
import { usePollNotifications } from '@/hooks/usePollNotifications';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { X } from 'lucide-react';

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
  
  // Enable poll notifications for this group
  usePollNotifications(groupId || '', 'Group Chat');
  
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
      let fileUrl: string | undefined;
      let fileName: string | undefined;
      let fileSize: number | undefined;
      let messageType: 'text' | 'image' | 'file' = 'text';
      
      if (file) {
        // Upload file to Supabase storage
        const ext = file.name.split('.').pop();
        const path = `messages/${groupId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('message-attachments')
          .upload(path, file);

        if (uploadError) {
          console.error('File upload failed:', uploadError);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('message-attachments')
          .getPublicUrl(path);

        fileUrl = urlData.publicUrl;
        fileName = file.name;
        fileSize = file.size;
        messageType = file.type.startsWith('image/') ? 'image' : 'file';
      }

      // Send the message to the app database
      await sendMessage.mutateAsync({
        groupId,
        content: content || (file ? fileName : undefined),
        messageType,
        fileUrl,
        fileName,
        fileSize,
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
      <div className="flex-1 flex items-center justify-center p-4">
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
    <div className="flex flex-col h-full bg-background">
      {/* Messages Area - scrollable */}
      <ScrollArea className="flex-1 px-3 sm:px-4 py-2">
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
        <div className="mx-3 sm:mx-4 mb-2 p-3 bg-muted/30 border-l-4 border-primary rounded-r-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm mb-1">
                <span className="text-muted-foreground">Replying to</span>
                <span className="font-medium text-primary truncate">
                  {replyingToMessage.user_profile?.full_name || 'Unknown User'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {replyingToMessage.content}
              </p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Message Input - fixed at bottom */}
      <div className="flex-shrink-0 p-3 sm:p-4 bg-background border-t border-border">
        <MessageInput
          onSendMessage={(content) => handleSendMessage(content)}
          disabled={sendMessage.isPending}
          placeholder={replyingToMessage ? 'Reply to message...' : 'Type a message...'}
        />
      </div>
    </div>
  );
};
