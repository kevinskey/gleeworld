import React from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { Check, CheckCheck } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageReactions } from '@/components/messaging/features/MessageReactions';

interface Message {
  id: string;
  conversation_id: string;
  sender_phone?: string;
  sender_user_id?: string;
  sender_name?: string;
  message_body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  created_at: string;
}

interface MessageBubbleProps {
  message: Message;
}

const highlightMentions = (text: string | undefined) => {
  if (!text) return null;
  // Highlight @mentions with GroupMe-style formatting
  const parts = text.split(/(@\w+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('@')) {
      return (
        <span key={index} className="font-semibold text-[hsl(var(--message-header))] bg-[hsl(var(--message-header))]/10 px-1 rounded">
          {part}
        </span>
      );
    }
    return part;
  });
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isOutbound = message.direction === 'outbound';
  const isDelivered = message.status === 'delivered';
  const isFailed = message.status === 'failed';

  const senderInitials = message.sender_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <div className={cn(
      'flex gap-1.5 md:gap-2 mb-2 md:mb-3',
      isOutbound ? 'justify-end' : 'justify-start'
    )}>
      {/* Avatar for received messages */}
      {!isOutbound && (
        <Avatar className="h-6 w-6 md:h-9 md:w-9 flex-shrink-0 mt-0.5">
          <AvatarFallback className="bg-[hsl(var(--message-header))]/20 text-[hsl(var(--message-header))] text-[9px] md:text-xs font-medium">
            {senderInitials}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        'max-w-[80%] md:max-w-[75%] rounded-2xl px-2.5 md:px-4 py-1.5 md:py-2.5',
        isOutbound 
          ? 'bg-[hsl(var(--message-sent))] text-white' 
          : 'bg-[hsl(var(--message-received))] text-[hsl(var(--message-received-fg))]'
      )}>
        {/* Sender name for inbound messages */}
        {!isOutbound && message.sender_name && (
          <div className="text-[10px] md:text-xs font-semibold text-[hsl(var(--message-header))] mb-0.5 md:mb-1">
            {message.sender_name}
          </div>
        )}

        {/* Message content with @mention highlighting */}
        <div className="text-[11px] md:text-sm leading-relaxed break-words">
          {highlightMentions(message.message_body)}
        </div>

        {/* Message footer */}
        <div className={cn(
          'flex items-center justify-end gap-0.5 md:gap-1 mt-1 md:mt-1.5 text-[9px] md:text-xs',
          isOutbound ? 'text-white/70' : 'text-muted-foreground'
        )}>
          <span>
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          
          {/* Delivery status for outbound messages */}
          {isOutbound && (
            <>
              {isFailed ? (
                <span className="text-white/90 ml-0.5 md:ml-1">Failed</span>
              ) : isDelivered ? (
                <CheckCheck className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 ml-0.5 md:ml-1" />
              ) : (
                <Check className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 ml-0.5 md:ml-1" />
              )}
            </>
          )}
        </div>

        {/* GroupMe-style Reactions */}
        <MessageReactions messageId={message.id} />
      </div>
    </div>
  );
};

export default MessageBubble;